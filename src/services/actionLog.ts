import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import logger from "../config/logger";
import ActionLog, { ActionLogStatus } from "../models/ActionLog";

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
  process.env.ACTION_LOG_PATH || path.join(process.cwd(), "logs", "actionLogs.json");

const mapRecord = (entry: any): ActionLogRecord => ({
  id: String(entry._id || entry.id || `${entry.createdAt}-${entry.action}`),
  platform: String(entry.platform),
  action: String(entry.action),
  account: String(entry.account || "default"),
  username: entry.username ? String(entry.username) : undefined,
  status: entry.status === "error" ? "error" : "success",
  error: entry.error ? String(entry.error) : undefined,
  details: entry.details && typeof entry.details === "object" ? entry.details : undefined,
  createdAt: new Date(entry.createdAt || Date.now()).toISOString(),
});

const readFileLogs = async (): Promise<ActionLogRecord[]> => {
  try {
    const raw = await fs.readFile(getActionLogPath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(mapRecord).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return [];
    }
    logger.warn("Failed to read action log file.", error);
    return [];
  }
};

const writeFileLogs = async (entries: ActionLogRecord[]) => {
  const filePath = getActionLogPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2));
};

export const logAction = async (input: ActionLogInput): Promise<void> => {
  const entry = {
    platform: input.platform,
    action: input.action,
    account: input.account || "default",
    username: input.username,
    status: input.status,
    error: input.error,
    details: input.details,
    createdAt: new Date().toISOString(),
  };

  try {
    if (mongoose.connection.readyState === 1) {
      await ActionLog.create(entry);
      return;
    }

    const entries = await readFileLogs();
    entries.unshift(mapRecord(entry));
    await writeFileLogs(entries.slice(0, 500));
  } catch (error) {
    logger.warn("Failed to persist action log entry.", error);
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

  if (mongoose.connection.readyState === 1) {
    const query: Record<string, string> = {};
    if (platform) query.platform = platform;
    if (account) query.account = account;
    const entries = await ActionLog.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return entries.map(mapRecord);
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
  const entries = await listActionLogs(options);
  return entries.reduce<ActionSummary>(
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
    }
  );
};
