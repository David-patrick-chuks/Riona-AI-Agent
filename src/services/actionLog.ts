import fs from 'fs/promises';
import path from 'path';
import logger from '../config/logger';
import { getPool, isDbConnected } from '../config/db';
import { ActionLogStatus } from '../models/ActionLog';

export type ActionLogInput = {
  platform: string;
  action: string;
  account?: string;
  username?: string;
  status: ActionLogStatus;
  error?: string;
  details?: Record<string, unknown>;
};

export type ActionLogRecord = {
  id: string;
  platform: string;
  action: string;
  account: string;
  username?: string;
  status: ActionLogStatus;
  error?: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

type ActionSummary = {
  total: number;
  success: number;
  error: number;
  byAction: Record<string, number>;
  byPlatform: Record<string, number>;
};

const getActionLogPath = () =>
  process.env.ACTION_LOG_PATH || path.join(process.cwd(), 'logs', 'actionLogs.json');

const mapRecord = (entry: {
  id?: string;
  _id?: string;
  platform: string;
  action: string;
  account?: string;
  username?: string | null;
  status: ActionLogStatus;
  error?: string | null;
  details?: Record<string, unknown> | null;
  createdAt?: string | Date;
  created_at?: string | Date;
}): ActionLogRecord => ({
  id: String(entry.id || entry._id || `${entry.createdAt || entry.created_at}-${entry.action}`),
  platform: String(entry.platform),
  action: String(entry.action),
  account: String(entry.account || 'default'),
  username: entry.username ? String(entry.username) : undefined,
  status: entry.status === 'error' ? 'error' : 'success',
  error: entry.error ? String(entry.error) : undefined,
  details: entry.details && typeof entry.details === 'object' ? entry.details : undefined,
  createdAt: new Date(entry.createdAt || entry.created_at || Date.now()).toISOString(),
});

const readFileLogs = async (): Promise<ActionLogRecord[]> => {
  try {
    const raw = await fs.readFile(getActionLogPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(mapRecord).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return [];
    }
    logger.warn('Failed to read action log file.', error);
    return [];
  }
};

const writeFileLogs = async (entries: ActionLogRecord[]) => {
  const filePath = getActionLogPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2));
};

/** Serializes file-based log writes to prevent read-modify-write races. */
let fileLogChain: Promise<void> = Promise.resolve();

const withFileLogLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  const run = fileLogChain.then(fn, fn);
  fileLogChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

const appendFileLog = async (entry: {
  platform: string;
  action: string;
  account: string;
  username?: string;
  status: ActionLogStatus;
  error?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}) => {
  await withFileLogLock(async () => {
    const entries = await readFileLogs();
    entries.unshift(mapRecord(entry));
    await writeFileLogs(entries.slice(0, 500));
  });
};

const insertDbLog = async (entry: {
  platform: string;
  action: string;
  account: string;
  username?: string;
  status: ActionLogStatus;
  error?: string;
  details?: Record<string, unknown>;
}) => {
  const pool = getPool();
  if (!pool) return;

  await pool.query(
    `INSERT INTO action_logs (platform, action, account, username, status, error, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.platform,
      entry.action,
      entry.account,
      entry.username ?? null,
      entry.status,
      entry.error ?? null,
      entry.details ? JSON.stringify(entry.details) : null,
    ],
  );
};

const queryDbLogs = async (options: {
  limit: number;
  platform?: string;
  account?: string;
}): Promise<ActionLogRecord[]> => {
  const pool = getPool();
  if (!pool) return [];

  const conditions: string[] = [];
  const values: string[] = [];

  if (options.platform) {
    values.push(options.platform);
    conditions.push(`platform = $${values.length}`);
  }
  if (options.account) {
    values.push(options.account);
    conditions.push(`account = $${values.length}`);
  }

  values.push(String(options.limit));
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT id, platform, action, account, username, status, error, details, created_at
     FROM action_logs
     ${where}
     ORDER BY created_at DESC
     LIMIT $${values.length}`,
    values,
  );

  return result.rows.map(mapRecord);
};

export const logAction = async (input: ActionLogInput): Promise<void> => {
  const entry = {
    platform: input.platform,
    action: input.action,
    account: input.account || 'default',
    username: input.username,
    status: input.status,
    error: input.error,
    details: input.details,
    createdAt: new Date().toISOString(),
  };

  try {
    if (isDbConnected()) {
      await insertDbLog(entry);
      return;
    }

    await appendFileLog(entry);
  } catch (error) {
    logger.warn('Failed to persist action log entry.', error);
  }
};

export const listActionLogs = async (options?: {
  limit?: number;
  platform?: string;
  account?: string;
}): Promise<ActionLogRecord[]> => {
  const limit = Math.max(1, Math.min(options?.limit || 20, 100));
  const platform = options?.platform;
  const account = options?.account;

  if (isDbConnected()) {
    return queryDbLogs({ limit, platform, account });
  }

  const entries = await readFileLogs();
  return entries
    .filter((entry) => (platform ? entry.platform === platform : true))
    .filter((entry) => (account ? entry.account === account : true))
    .slice(0, limit);
};

export const getActionSummary = async (options?: {
  platform?: string;
  account?: string;
  limit?: number;
}): Promise<ActionSummary> => {
  const platform = options?.platform;
  const account = options?.account;

  const summarize = (records: ActionLogRecord[]): ActionSummary =>
    records.reduce<ActionSummary>(
      (summary, entry) => {
        summary.total += 1;
        summary[entry.status] += 1;
        summary.byAction[entry.action] = (summary.byAction[entry.action] || 0) + 1;
        summary.byPlatform[entry.platform] = (summary.byPlatform[entry.platform] || 0) + 1;
        return summary;
      },
      {
        total: 0,
        success: 0,
        error: 0,
        byAction: {},
        byPlatform: {},
      },
    );

  if (isDbConnected()) {
    const fileLimit = Math.max(1, Math.min(options?.limit || 500, 500));
    const entries = await queryDbLogs({ limit: fileLimit, platform, account });
    return summarize(entries);
  }

  const fileLimit = Math.max(1, Math.min(options?.limit || 500, 500));
  const entries = await readFileLogs();
  const filtered = entries
    .filter((entry) => (platform ? entry.platform === platform : true))
    .filter((entry) => (account ? entry.account === account : true))
    .slice(0, fileLimit);
  return summarize(filtered);
};
