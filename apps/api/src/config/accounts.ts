import fs from 'fs';
import path from 'path';
import logger from './logger';

/** Configuration for a single Instagram account */
export type AccountConfig = {
  /** Instagram username */
  username: string;
  /** Instagram password */
  password: string;
};

/** Map of account keys to their configurations */
export type AccountsMap = Record<string, AccountConfig>;

/**
 * Validates and normalizes a parsed accounts object.
 * Skips entries missing non-empty username/password strings.
 */
export const parseAccountsMap = (raw: unknown): AccountsMap => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const result: AccountsMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      logger.warn(`Skipping invalid accounts.json entry "${key}": expected an object`);
      continue;
    }

    const entry = value as Record<string, unknown>;
    const username = typeof entry.username === 'string' ? entry.username.trim() : '';
    const password = typeof entry.password === 'string' ? entry.password.trim() : '';

    if (!username || !password) {
      logger.warn(
        `Skipping invalid accounts.json entry "${key}": username and password are required`,
      );
      continue;
    }

    result[key] = { username, password };
  }

  return result;
};

/**
 * Loads the accounts configuration file from src/config/accounts.json
 * @returns The accounts map, or empty object if file doesn't exist or is invalid
 */
const loadAccountsFile = (): AccountsMap => {
  const filePath = path.join(process.cwd(), 'src', 'config', 'accounts.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return parseAccountsMap(JSON.parse(raw));
  } catch (error) {
    logger.warn('Failed to parse accounts.json; using empty accounts map.', error);
    return {};
  }
};

/**
 * Gets an account configuration by key
 * @param key - Account key (defaults to 'default')
 * @returns Account config, or null if not found
 */
export const getAccount = (key?: string): AccountConfig | null => {
  const map = loadAccountsFile();
  const accountKey = key || 'default';
  return map[accountKey] || null;
};

/**
 * Gets all loaded accounts as a map
 * @returns Complete accounts map
 */
export const getAccountsMap = (): AccountsMap => loadAccountsFile();
