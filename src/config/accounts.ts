import fs from 'fs';
import path from 'path';

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
 * Loads the accounts configuration file from src/config/accounts.json
 * @returns The accounts map, or empty object if file doesn't exist or is invalid
 */
const loadAccountsFile = (): AccountsMap => {
  const filePath = path.join(process.cwd(), 'src', 'config', 'accounts.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as AccountsMap;
  } catch {
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
