import fs from 'fs';
import path from 'path';

export type AccountConfig = {
  username: string;
  password: string;
};

export type AccountsMap = Record<string, AccountConfig>;

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

export const getAccount = (key?: string): AccountConfig | null => {
  const map = loadAccountsFile();
  const accountKey = key || 'default';
  return map[accountKey] || null;
};
