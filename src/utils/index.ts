import { promises as fs } from "fs";
import path from "path";
import { geminiApiKeys } from "../secret";
import logger from "../config/logger";

export async function Instagram_cookiesExist(): Promise<boolean> {
  try {
    const cookiesPath = "./cookies/Instagramcookies.json";
    await fs.access(cookiesPath);

    const cookiesData = await fs.readFile(cookiesPath, "utf-8");
    let cookies: any[] = [];
    try {
      cookies = JSON.parse(cookiesData);
    } catch (parseError) {
      logger.warn("Cookies file is invalid JSON. Backing up and forcing re-login.");
      await backupCorruptCookies(cookiesPath);
      return false;
    }

    const primaryCookie = cookies.find(
      (cookie: { name: string }) => cookie.name === "sessionid"
    );
    const fallbackCookie = cookies.find(
      (cookie: { name: string }) => cookie.name === "csrftoken"
    );

    const currentTimestamp = Math.floor(Date.now() / 1000);

    if (primaryCookie && primaryCookie.expires > currentTimestamp) return true;
    if (fallbackCookie && fallbackCookie.expires > currentTimestamp) return true;

    return false;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      logger.warn("Cookies file does not exist.");
      return false;
    }
    logger.error("Error checking cookies:", error);
    return false;
  }
}

export async function saveCookies(
  cookiesPath: string,
  cookies: any[]
): Promise<void> {
  try {
    const dir = path.dirname(cookiesPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
    logger.info("Cookies saved successfully.");
  } catch (error) {
    logger.error("Error saving cookies:", error);
    throw new Error("Failed to save cookies.");
  }
}

export async function loadCookies(cookiesPath: string): Promise<any[]> {
  try {
    await fs.access(cookiesPath);
    const cookiesData = await fs.readFile(cookiesPath, "utf-8");
    try {
      return JSON.parse(cookiesData);
    } catch (parseError) {
      logger.warn("Cookies file is invalid JSON. Backing up and forcing re-login.");
      await backupCorruptCookies(cookiesPath);
      return [];
    }
  } catch (error) {
    logger.error("Cookies file does not exist or cannot be read.", error);
    return [];
  }
}

async function backupCorruptCookies(cookiesPath: string): Promise<void> {
  try {
    const dir = path.dirname(cookiesPath);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(dir, `Instagramcookies.corrupt-${stamp}.json`);
    await fs.rename(cookiesPath, backupPath);
    logger.warn(`Corrupt cookies file backed up to ${backupPath}`);
  } catch (error) {
    logger.error("Failed to back up corrupt cookies file:", error);
    try {
      await fs.unlink(cookiesPath);
    } catch {
      // ignore
    }
  }
}

// ---------------------- API key rotation ----------------------
const triedApiKeys = new Set<number>();

export const getNextApiKey = (currentApiKeyIndex: number) => {
  if (geminiApiKeys.length === 0) {
    throw new Error("No valid GEMINI API keys configured.");
  }
  // track current
  triedApiKeys.add(currentApiKeyIndex);

  // move circularly
  currentApiKeyIndex = (currentApiKeyIndex + 1) % geminiApiKeys.length;

  // if all tried, reset & throw
  if (triedApiKeys.size >= geminiApiKeys.length) {
    triedApiKeys.clear();
    throw new Error("All API keys have reached their rate limits. Please try again later.");
  }
  return geminiApiKeys[currentApiKeyIndex];
};

export async function handleError(
  error: unknown,
  currentApiKeyIndex: number,
  schema: any,
  prompt: string,
  runAgent: (schema: any, prompt: string, apiKeyIndex?: number) => Promise<string>
): Promise<string> {
  if (error instanceof Error) {
    if (error.message.includes("429 Too Many Requests")) {
      logger.error(`---GEMINI_API_KEY_${currentApiKeyIndex + 1} limit exhausted, switching to the next API key...`);
      try {
        getNextApiKey(currentApiKeyIndex);
        return runAgent(schema, prompt);
      } catch (keyError) {
        if (keyError instanceof Error) {
          logger.error("API key error:", keyError.message);
          return `Error: ${keyError.message}`;
        }
        logger.error("Unknown error when trying to get next API key");
        return "Error: All API keys have reached their rate limits. Please try again later.";
      }
    } else if (error.message.includes("503 Service Unavailable")) {
      logger.error("Service is temporarily unavailable. Retrying...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return runAgent(schema, prompt, currentApiKeyIndex);
    } else if (error.message.includes("All API keys have reached their rate limits")) {
      logger.error(error.message);
      return `Error: ${error.message}`;
    }
    logger.error(`Error generating training prompt: ${error.message}`);
    return `An error occurred: ${error.message}`;
  }
  logger.error("An unknown error occurred:", error);
  return "An unknown error occurred.";
}

// ---------------------- Logging helper ----------------------
export function setup_HandleError(error: unknown, context: string): void {
  if (error instanceof Error) {
    if (error.message.includes("net::ERR_ABORTED")) {
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
  timeTweeted: string
): Promise<void> => {
  const tweetDataPath = path.join(__dirname, "../data/tweetData.json");
  const tweetData = { tweetContent, imageUrl: imageUrl || null, timeTweeted };

  try {
    await fs.access(tweetDataPath);
    const data = await fs.readFile(tweetDataPath, "utf-8");
    const json = JSON.parse(data);
    json.push(tweetData);
    await fs.writeFile(tweetDataPath, JSON.stringify(json, null, 2));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.writeFile(tweetDataPath, JSON.stringify([tweetData], null, 2));
    } else {
      logger.error("Error saving tweet data:", error);
      throw error;
    }
  }
};

export const checkAndDeleteOldTweetData = async (): Promise<void> => {
  const tweetDataPath = path.join(__dirname, "../data/tweetData.json");
  try {
    await fs.access(tweetDataPath);
    const data = await fs.readFile(tweetDataPath, "utf-8");
    const json = JSON.parse(data);

    if (json.length > 0) {
      const firstTweetTime = new Date(json[0].timeTweeted).getTime();
      const timeDifference = Date.now() - firstTweetTime;
      if (timeDifference > 86_400_000) {
        await fs.unlink(tweetDataPath);
        logger.info("tweetData.json deleted because the first tweet is more than 24 hours old.");
      }
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") {
      logger.error("Error checking tweet data:", err);
      throw err;
    }
  }
};

export const canSendTweet = async (): Promise<boolean> => {
  const tweetDataPath = path.join(__dirname, "../data/tweetData.json");
  try {
    await fs.access(tweetDataPath);
    const data = await fs.readFile(tweetDataPath, "utf-8");
    const json = JSON.parse(data);
    return json.length < 17;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    logger.error("Error checking tweet data:", error);
    throw error;
  }
};

// ---------------------- Instagram action limits ----------------------
export const getIgDailyState = async (): Promise<{ date: string; count: number }> => {
  const dataPath = path.join(__dirname, "../data/igActionData.json");
  const today = new Date().toISOString().slice(0, 10);
  try {
    await fs.access(dataPath);
    const data = await fs.readFile(dataPath, "utf-8");
    const json = JSON.parse(data);
    if (json.date !== today) {
      return { date: today, count: 0 };
    }
    return { date: today, count: Number(json.count) || 0 };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.error("Error reading igActionData:", error);
    }
    return { date: today, count: 0 };
  }
};

export const incrementIgDailyCount = async (by = 1): Promise<void> => {
  const dataPath = path.join(__dirname, "../data/igActionData.json");
  const dataDir = path.dirname(dataPath);
  const today = new Date().toISOString().slice(0, 10);
  const current = await getIgDailyState();
  const next = current.date === today ? current.count + by : by;
  const payload = { date: today, count: next };
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify(payload, null, 2));
  } catch (error) {
    logger.error("Error writing igActionData:", error);
  }
};

// ---------------------- IG cooldown ----------------------
export const getIgCooldown = async (): Promise<{ until: number }> => {
  const dataPath = path.join(__dirname, "../data/igCooldown.json");
  try {
    await fs.access(dataPath);
    const data = await fs.readFile(dataPath, "utf-8");
    const json = JSON.parse(data);
    return { until: Number(json.until) || 0 };
  } catch {
    return { until: 0 };
  }
};

export const setIgCooldown = async (minutes: number): Promise<void> => {
  const dataPath = path.join(__dirname, "../data/igCooldown.json");
  const dataDir = path.dirname(dataPath);
  const until = Date.now() + minutes * 60 * 1000;
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify({ until }, null, 2));
  } catch (error) {
    logger.error("Error writing igCooldown:", error);
  }
};

// ---------------------- Scraped data utilities ----------------------
export const saveScrapedData = async (link: string, content: string): Promise<void> => {
  const scrapedDataPath = path.join(__dirname, "../data/scrapedData.json");
  const scrapedDataDir = path.dirname(scrapedDataPath);
  const scrapedData = { link, content };

  try {
    await fs.mkdir(scrapedDataDir, { recursive: true });
    await fs.access(scrapedDataPath);
    const data = await fs.readFile(scrapedDataPath, "utf-8");
    const json = JSON.parse(data);
    json.push(scrapedData);
    await fs.writeFile(scrapedDataPath, JSON.stringify(json, null, 2));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.writeFile(scrapedDataPath, JSON.stringify([scrapedData], null, 2));
    } else {
      logger.error("Error saving scraped data:", error);
      throw error;
    }
  }
};
