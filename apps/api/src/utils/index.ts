import { promises as fs } from 'fs';
import path from 'path';
import { geminiApiKeys } from '../secret';
import logger from '../config/logger';

// ---------------------- Input validation constants ----------------------
const INPUT_LENGTH_LIMITS = {
  caption: 2200, // Instagram caption limit
  message: 1000, // DM message limit
  username: 30, // Instagram username limit
  filename: 255, // Standard filesystem limit
  default: 500,
};

// ---------------------- Filename sanitization ----------------------
/**
 * Sanitizes a filename to prevent path traversal and header injection attacks.
 * Removes or replaces dangerous characters while preserving readability.
 * @param filename - The original filename
 * @param maxLength - Maximum allowed length (default: 255)
 * @returns Sanitized filename safe for use in Content-Disposition headers and filesystem
 */
export function sanitizeFilename(filename: string, maxLength: number = 255): string {
  if (!filename || typeof filename !== 'string') {
    return 'download';
  }

  let sanitized = filename
    // Remove path traversal sequences
    .replace(/\.\./g, '')
    // Remove directory separators
    .replace(/[/\\]/g, '')
    // Remove null bytes and control characters (ASCII 0-31 and 127)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    // Remove characters problematic in HTTP headers (CR, LF)
    .replace(/[\r\n]/g, '')
    // Remove characters that could cause issues in filenames
    .replace(/[<>:"|?*]/g, '')
    // Replace multiple spaces/underscores with single underscore
    .replace(/[\s_]+/g, '_')
    // Remove leading/trailing dots and spaces
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .trim();

  // Ensure filename is not empty after sanitization
  if (!sanitized) {
    return 'download';
  }

  // Truncate to max length while preserving extension
  if (sanitized.length > maxLength) {
    const extMatch = sanitized.match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0] : '';
    const nameMaxLen = maxLength - ext.length;
    sanitized = sanitized.slice(0, nameMaxLen) + ext;
  }

  return sanitized;
}

// ---------------------- Input length validation ----------------------
/**
 * Validates that an input string doesn't exceed the maximum allowed length.
 * @param input - The input string to validate
 * @param field - The field type (caption, message, username, etc.)
 * @param customLimit - Optional custom limit override
 * @returns Validation result with valid flag and optional error message
 */
export function validateInputLength(
  input: string,
  field: keyof typeof INPUT_LENGTH_LIMITS | string = 'default',
  customLimit?: number,
): { valid: boolean; error?: string; maxLength: number } {
  const maxLength =
    customLimit ??
    (INPUT_LENGTH_LIMITS[field as keyof typeof INPUT_LENGTH_LIMITS] || INPUT_LENGTH_LIMITS.default);

  if (input === undefined || input === null) {
    return { valid: true, maxLength }; // Optional fields are valid when empty
  }

  if (typeof input !== 'string') {
    return { valid: false, error: `${field} must be a string`, maxLength };
  }

  if (input.length > maxLength) {
    return {
      valid: false,
      error: `${field} exceeds maximum length of ${maxLength} characters (got ${input.length})`,
      maxLength,
    };
  }

  return { valid: true, maxLength };
}

/**
 * Truncates a string to the specified maximum length with optional suffix.
 * @param input - The input string to truncate
 * @param maxLength - Maximum allowed length
 * @param suffix - Optional suffix to append when truncated (default: '...')
 * @returns Truncated string
 */
export function truncateInput(input: string, maxLength: number, suffix: string = '...'): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  if (input.length <= maxLength) {
    return input;
  }

  const truncateAt = maxLength - suffix.length;
  return input.slice(0, Math.max(0, truncateAt)) + suffix;
}

const fileLocks = new Map<string, Promise<void>>();

async function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const existingLock = fileLocks.get(filePath);
  let resolveLock: () => void;
  const newLock = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });
  fileLocks.set(filePath, newLock);

  if (existingLock) {
    await existingLock;
  }

  try {
    return await fn();
  } finally {
    resolveLock!();
    if (fileLocks.get(filePath) === newLock) {
      fileLocks.delete(filePath);
    }
  }
}

type CookieLike = { name: string; expires?: number };

/** Puppeteer session cookies use expires -1; timed cookies use a Unix timestamp. */
export const isCookieValid = (cookie: CookieLike | undefined, nowSec: number): boolean => {
  if (!cookie) return false;
  const { expires } = cookie;
  if (expires === -1 || expires === undefined) return true;
  if (typeof expires !== 'number') return false;
  return expires > nowSec;
};

/** Cookie file path for a given account key (legacy default path kept for "default"). */
export function getInstagramCookiesPath(accountKey: string = 'default'): string {
  const key = accountKey || 'default';
  if (key === 'default') {
    return './cookies/Instagramcookies.json';
  }
  return `./cookies/Instagramcookies-${key}.json`;
}

/**
 * Checks if valid Instagram cookies exist and are not expired
 * @returns True if valid cookies exist, false otherwise
 */
export async function Instagram_cookiesExist(accountKey: string = 'default'): Promise<boolean> {
  try {
    const cookiesPath = getInstagramCookiesPath(accountKey);
    await fs.access(cookiesPath);

    const cookiesData = await fs.readFile(cookiesPath, 'utf-8');
    let cookies: any[] = [];
    try {
      cookies = JSON.parse(cookiesData);
    } catch (_parseError) {
      logger.warn('Cookies file is invalid JSON. Backing up and forcing re-login.');
      await backupCorruptCookies(cookiesPath);
      return false;
    }

    const primaryCookie = cookies.find((cookie: { name: string }) => cookie.name === 'sessionid');
    const fallbackCookie = cookies.find((cookie: { name: string }) => cookie.name === 'csrftoken');

    const currentTimestamp = Math.floor(Date.now() / 1000);

    if (isCookieValid(primaryCookie, currentTimestamp)) return true;
    if (isCookieValid(fallbackCookie, currentTimestamp)) return true;

    return false;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      logger.warn('Cookies file does not exist.');
      return false;
    }
    logger.error('Error checking cookies:', error);
    return false;
  }
}

/**
 * Saves cookies to a file
 * @param cookiesPath - Path to the cookies file
 * @param cookies - Array of cookie objects to save
 * @throws Error if saving fails
 */
export async function saveCookies(cookiesPath: string, cookies: any[]): Promise<void> {
  try {
    const dir = path.dirname(cookiesPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
    logger.info('Cookies saved successfully.');
  } catch (error) {
    logger.error('Error saving cookies:', error);
    throw new Error('Failed to save cookies.');
  }
}

/**
 * Loads cookies from a file
 * @param cookiesPath - Path to the cookies file
 * @returns Array of cookies, empty array if file not found or invalid
 */
export async function loadCookies(cookiesPath: string): Promise<any[]> {
  try {
    await fs.access(cookiesPath);
    const cookiesData = await fs.readFile(cookiesPath, 'utf-8');
    try {
      return JSON.parse(cookiesData);
    } catch (_parseError) {
      logger.warn('Cookies file is invalid JSON. Backing up and forcing re-login.');
      await backupCorruptCookies(cookiesPath);
      return [];
    }
  } catch (error) {
    logger.error('Cookies file does not exist or cannot be read.', error);
    return [];
  }
}

async function backupCorruptCookies(cookiesPath: string): Promise<void> {
  try {
    const dir = path.dirname(cookiesPath);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(dir, `Instagramcookies.corrupt-${stamp}.json`);
    await fs.rename(cookiesPath, backupPath);
    logger.warn(`Corrupt cookies file backed up to ${backupPath}`);
  } catch (error) {
    logger.error('Failed to back up corrupt cookies file:', error);
    try {
      await fs.unlink(cookiesPath);
    } catch {
      // ignore
    }
  }
}

// ---------------------- API key rotation ----------------------

/**
 * Gets the next available API key for rotation.
 * @param currentApiKeyIndex - Index of the current API key that failed
 * @param triedKeys - Caller-owned Set tracking which indices have been tried
 * @returns The next API key string and its index
 * @throws Error if no keys are configured or all have been tried
 */
export const getNextApiKey = (
  currentApiKeyIndex: number,
  triedKeys: Set<number> = new Set(),
): { key: string; index: number } => {
  if (geminiApiKeys.length === 0) {
    throw new Error('No valid GEMINI API keys configured.');
  }

  triedKeys.add(currentApiKeyIndex);

  const nextIndex = (currentApiKeyIndex + 1) % geminiApiKeys.length;

  if (triedKeys.size >= geminiApiKeys.length) {
    throw new Error('All API keys have reached their rate limits. Please try again later.');
  }
  return { key: geminiApiKeys[nextIndex], index: nextIndex };
};

/**
 * Handles errors from the Gemini API, including retries and API key rotation
 * @param error - The error that occurred
 * @param currentApiKeyIndex - Index of the API key that was used
 * @param schema - The agent schema
 * @param prompt - The prompt to send
 * @param runAgent - Function to run the agent again
 * @returns The response from the agent, or an error message
 */
const MAX_503_RETRIES = 5;

export async function handleError(
  error: unknown,
  currentApiKeyIndex: number,
  schema: any,
  prompt: string,
  runAgent: (
    schema: any,
    prompt: string,
    apiKeyIndex?: number,
    triedKeys?: Set<number>,
  ) => Promise<string>,
  retryCount = 0,
  triedKeys: Set<number> = new Set(),
): Promise<string> {
  if (error instanceof Error) {
    if (error.message.includes('429 Too Many Requests')) {
      logger.error(
        `---GEMINI_API_KEY_${currentApiKeyIndex + 1} limit exhausted, switching to the next API key...`,
      );
      try {
        const { index: nextIndex } = getNextApiKey(currentApiKeyIndex, triedKeys);
        return runAgent(schema, prompt, nextIndex, triedKeys);
      } catch (keyError) {
        if (keyError instanceof Error) {
          logger.error('API key error:', keyError.message);
          return `Error: ${keyError.message}`;
        }
        logger.error('Unknown error when trying to get next API key');
        return 'Error: All API keys have reached their rate limits. Please try again later.';
      }
    } else if (error.message.includes('503 Service Unavailable')) {
      if (retryCount >= MAX_503_RETRIES) {
        logger.error('Service unavailable after maximum retries.');
        return 'Error: Service unavailable after maximum retries.';
      }
      logger.error('Service is temporarily unavailable. Retrying...');
      await new Promise((resolve) => setTimeout(resolve, 5000 * (retryCount + 1)));
      try {
        return await runAgent(schema, prompt, currentApiKeyIndex, triedKeys);
      } catch (retryError) {
        if (retryError instanceof Error && retryError.message.includes('503 Service Unavailable')) {
          return handleError(
            retryError,
            currentApiKeyIndex,
            schema,
            prompt,
            runAgent,
            retryCount + 1,
            triedKeys,
          );
        }
        return handleError(
          retryError,
          currentApiKeyIndex,
          schema,
          prompt,
          runAgent,
          retryCount,
          triedKeys,
        );
      }
    } else if (error.message.includes('All API keys have reached their rate limits')) {
      logger.error(error.message);
      return `Error: ${error.message}`;
    }
    logger.error(`Error generating training prompt: ${error.message}`);
    return `An error occurred: ${error.message}`;
  }
  logger.error('An unknown error occurred:', error);
  return 'An unknown error occurred.';
}

// ---------------------- Logging helper ----------------------
/**
 * Logs errors with context
 * @param error - The error to log
 * @param context - Description of where the error occurred
 */
export function setup_HandleError(error: unknown, context: string): void {
  if (error instanceof Error) {
    if (error.message.includes('net::ERR_ABORTED')) {
      logger.error(`ABORTION error occurred in ${context}: ${error.message}`);
    } else {
      logger.error(`Error in ${context}: ${error.message}`);
    }
  } else {
    logger.error(`An unknown error occurred in ${context}: ${error}`);
  }
}

// ---------------------- Tweet data utilities ----------------------
export const saveTweetData = async (
  tweetContent: string,
  imageUrl: string,
  timeTweeted: string,
): Promise<void> => {
  const tweetDataPath = path.join(__dirname, '../data/tweetData.json');
  const tweetData = { tweetContent, imageUrl: imageUrl || null, timeTweeted };

  await withFileLock(tweetDataPath, async () => {
    try {
      await fs.access(tweetDataPath);
      const data = await fs.readFile(tweetDataPath, 'utf-8');
      const json = JSON.parse(data);
      if (!Array.isArray(json)) {
        logger.warn('tweetData.json contains non-array data, resetting to array');
        await fs.writeFile(tweetDataPath, JSON.stringify([tweetData], null, 2));
        return;
      }
      json.push(tweetData);
      await fs.writeFile(tweetDataPath, JSON.stringify(json, null, 2));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.writeFile(tweetDataPath, JSON.stringify([tweetData], null, 2));
      } else {
        logger.error('Error saving tweet data:', error);
        throw error;
      }
    }
  });
};

export const checkAndDeleteOldTweetData = async (): Promise<void> => {
  const tweetDataPath = path.join(__dirname, '../data/tweetData.json');
  try {
    await fs.access(tweetDataPath);
    const data = await fs.readFile(tweetDataPath, 'utf-8');
    const json = JSON.parse(data);

    if (json.length > 0) {
      const firstTweetTime = new Date(json[0].timeTweeted).getTime();
      const timeDifference = Date.now() - firstTweetTime;
      if (timeDifference > 86_400_000) {
        await fs.unlink(tweetDataPath);
        logger.info('tweetData.json deleted because the first tweet is more than 24 hours old.');
      }
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') {
      logger.error('Error checking tweet data:', err);
      throw err;
    }
  }
};

export const canSendTweet = async (): Promise<boolean> => {
  const tweetDataPath = path.join(__dirname, '../data/tweetData.json');
  try {
    await fs.access(tweetDataPath);
    const data = await fs.readFile(tweetDataPath, 'utf-8');
    const json = JSON.parse(data);
    return json.length < 17;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true;
    logger.error('Error checking tweet data:', error);
    throw error;
  }
};

// ---------------------- Instagram action limits ----------------------
export const getIgDailyState = async (): Promise<{ date: string; count: number }> => {
  const dataPath = path.join(__dirname, '../data/igActionData.json');
  const today = new Date().toISOString().slice(0, 10);
  try {
    await fs.access(dataPath);
    const data = await fs.readFile(dataPath, 'utf-8');
    const json = JSON.parse(data);
    if (json.date !== today) {
      return { date: today, count: 0 };
    }
    return { date: today, count: Number(json.count) || 0 };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.error('Error reading igActionData:', error);
    }
    return { date: today, count: 0 };
  }
};

export const incrementIgDailyCount = async (by = 1): Promise<void> => {
  const dataPath = path.join(__dirname, '../data/igActionData.json');
  const dataDir = path.dirname(dataPath);

  await withFileLock(dataPath, async () => {
    const today = new Date().toISOString().slice(0, 10);
    let currentCount = 0;
    try {
      await fs.access(dataPath);
      const data = await fs.readFile(dataPath, 'utf-8');
      const json = JSON.parse(data);
      if (json.date === today) {
        currentCount = Number(json.count) || 0;
      }
    } catch {
      // start from 0 when file is missing or invalid
    }
    const payload = { date: today, count: currentCount + by };
    try {
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(dataPath, JSON.stringify(payload, null, 2));
    } catch (error) {
      logger.error('Error writing igActionData:', error);
    }
  });
};

// ---------------------- IG cooldown ----------------------
export const getIgCooldown = async (): Promise<{ until: number }> => {
  const dataPath = path.join(__dirname, '../data/igCooldown.json');
  try {
    await fs.access(dataPath);
    const data = await fs.readFile(dataPath, 'utf-8');
    const json = JSON.parse(data);
    return { until: Number(json.until) || 0 };
  } catch {
    return { until: 0 };
  }
};

export const setIgCooldown = async (minutes: number): Promise<void> => {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    logger.warn(`Invalid cooldown minutes: ${minutes}`);
    return;
  }
  const dataPath = path.join(__dirname, '../data/igCooldown.json');
  const dataDir = path.dirname(dataPath);
  const until = Date.now() + minutes * 60 * 1000;
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify({ until }, null, 2));
  } catch (error) {
    logger.error('Error writing igCooldown:', error);
  }
};

// ---------------------- Scraped data utilities ----------------------
export const saveScrapedData = async (link: string, content: string): Promise<void> => {
  const scrapedDataPath = path.join(__dirname, '../data/scrapedData.json');
  const scrapedDataDir = path.dirname(scrapedDataPath);
  const scrapedData = { link, content };

  await withFileLock(scrapedDataPath, async () => {
    try {
      await fs.mkdir(scrapedDataDir, { recursive: true });
      await fs.access(scrapedDataPath);
      const data = await fs.readFile(scrapedDataPath, 'utf-8');
      const json = JSON.parse(data);
      if (!Array.isArray(json)) {
        logger.warn('scrapedData.json contains non-array data, resetting to array');
        await fs.writeFile(scrapedDataPath, JSON.stringify([scrapedData], null, 2));
        return;
      }
      json.push(scrapedData);
      await fs.writeFile(scrapedDataPath, JSON.stringify(json, null, 2));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.writeFile(scrapedDataPath, JSON.stringify([scrapedData], null, 2));
      } else {
        logger.error('Error saving scraped data:', error);
        throw error;
      }
    }
  });
};
