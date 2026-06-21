import fs from 'fs/promises';
import path from 'path';
import { listActionLogs, type ActionLogRecord } from './actionLog';

export type AdminLogLevel = 'error' | 'warn' | 'info' | 'debug' | 'unknown';

export type AdminLogEntry = {
  file: string;
  level: AdminLogLevel;
  message: string;
  timestamp?: string;
};

export type AdminErrorEntry = {
  source: 'action' | 'log';
  message: string;
  timestamp: string;
  context?: string;
  account?: string;
  platform?: string;
};

const LOG_LIMIT_MAX = 200;

const getLogsDir = () => process.env.LOGS_DIR || path.join(process.cwd(), 'logs');

const clampLimit = (limit?: number) => Math.max(1, Math.min(limit || 50, LOG_LIMIT_MAX));

const parseLogLevel = (value: unknown): AdminLogLevel => {
  const level = typeof value === 'string' ? value.toLowerCase() : '';
  if (level.includes('error')) return 'error';
  if (level.includes('warn')) return 'warn';
  if (level.includes('info')) return 'info';
  if (level.includes('debug')) return 'debug';
  return 'unknown';
};

const parseLogLine = (line: string, file: string): AdminLogEntry => {
  try {
    const parsed = JSON.parse(line);
    return {
      file,
      level: parseLogLevel(parsed.level),
      message: String(parsed.message || line),
      timestamp: parsed.timestamp ? String(parsed.timestamp) : undefined,
    };
  } catch {
    const levelMatch = line.match(/\[(error|warn|info|debug)\]/i);
    return {
      file,
      level: parseLogLevel(levelMatch?.[1]),
      message: line,
    };
  }
};

const listReadableLogFiles = async () => {
  try {
    const entries = await fs.readdir(getLogsDir(), { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .filter((entry) => entry.name.endsWith('.log'))
        .map(async (entry) => {
          const fullPath = path.join(getLogsDir(), entry.name);
          const stats = await fs.stat(fullPath);
          return { name: entry.name, fullPath, mtimeMs: stats.mtimeMs };
        }),
    );
    return files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') return [];
    throw error;
  }
};

export const listAdminLogs = async (options?: {
  limit?: number;
  level?: AdminLogLevel;
}): Promise<AdminLogEntry[]> => {
  const limit = clampLimit(options?.limit);
  const files = await listReadableLogFiles();
  const entries: AdminLogEntry[] = [];

  for (const file of files) {
    const raw = await fs.readFile(file.fullPath, 'utf-8');
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-limit)
      .reverse();

    for (const line of lines) {
      const entry = parseLogLine(line, file.name);
      if (options?.level && entry.level !== options.level) continue;
      entries.push(entry);
      if (entries.length >= limit) return entries;
    }
  }

  return entries;
};

export const listAdminErrors = async (options?: { limit?: number }): Promise<AdminErrorEntry[]> => {
  const limit = clampLimit(options?.limit);
  const [actionErrors, logErrors] = await Promise.all([
    listActionLogs({ limit, status: 'error' }),
    listAdminLogs({ limit, level: 'error' }),
  ]);

  const actionEntries = actionErrors.actions || [];

  return [
    ...actionEntries.map<AdminErrorEntry>((entry: ActionLogRecord) => ({
      source: 'action',
      message: entry.error || `${entry.action} failed`,
      timestamp: entry.createdAt,
      context: entry.action,
      account: entry.account,
      platform: entry.platform,
    })),
    ...logErrors.map<AdminErrorEntry>((entry) => ({
      source: 'log',
      message: entry.message,
      timestamp: entry.timestamp || new Date().toISOString(),
      context: entry.file,
    })),
  ]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
};
