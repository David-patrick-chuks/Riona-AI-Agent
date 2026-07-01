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

const UNIFIED_PLATFORMS = ['instagram', 'twitter'] as const;
export type UnifiedPlatform = (typeof UNIFIED_PLATFORMS)[number];

export type UnifiedActionRecord = {
  platform: UnifiedPlatform;
  action: string;
  timestamp: string;
  status: ActionLogStatus;
  metadata: Record<string, unknown>;
};

export type PaginatedUnifiedActions = {
  actions: UnifiedActionRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export type ActionLogFilterOptions = {
  limit?: number;
  offset?: number;
  platform?: string;
  platforms?: string[];
  account?: string;
  status?: ActionLogStatus;
  action?: string;
  fromDate?: string;
  toDate?: string;
  errorKeyword?: string;
  sort?: 'asc' | 'desc';
};

export type PaginatedActionLogs = {
  actions: ActionLogRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
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

const queryDbLogs = async (
  options: ActionLogFilterOptions & { countOnly?: boolean },
): Promise<{ records: ActionLogRecord[]; total: number }> => {
  const pool = getPool();
  if (!pool) return { records: [], total: 0 };

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (options.platforms?.length) {
    const placeholders = options.platforms.map((platform) => {
      values.push(platform);
      return `$${values.length}`;
    });
    conditions.push(`platform IN (${placeholders.join(', ')})`);
  } else if (options.platform) {
    values.push(options.platform);
    conditions.push(`platform = $${values.length}`);
  }
  if (options.account) {
    values.push(options.account);
    conditions.push(`account = $${values.length}`);
  }
  if (options.status) {
    values.push(options.status);
    conditions.push(`status = $${values.length}`);
  }
  if (options.action) {
    values.push(options.action);
    conditions.push(`action = $${values.length}`);
  }
  if (options.fromDate) {
    values.push(options.fromDate);
    conditions.push(`created_at >= $${values.length}::timestamptz`);
  }
  if (options.toDate) {
    values.push(options.toDate);
    conditions.push(`created_at <= $${values.length}::timestamptz`);
  }
  if (options.errorKeyword) {
    values.push(`%${options.errorKeyword}%`);
    conditions.push(`error ILIKE $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM action_logs ${where}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  if (options.countOnly) {
    return { records: [], total };
  }

  const limit = Math.max(1, Math.min(options.limit || 20, 100));
  const offset = Math.max(0, options.offset || 0);
  const sortOrder = options.sort === 'asc' ? 'ASC' : 'DESC';

  values.push(limit);
  const limitParam = values.length;
  values.push(offset);
  const offsetParam = values.length;

  const result = await pool.query(
    `SELECT id, platform, action, account, username, status, error, details, created_at
     FROM action_logs
     ${where}
     ORDER BY created_at ${sortOrder}
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  );

  return { records: result.rows.map(mapRecord), total };
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

const filterFileLogs = (
  entries: ActionLogRecord[],
  options: ActionLogFilterOptions,
): ActionLogRecord[] => {
  return entries.filter((entry) => {
    if (options.platforms?.length && !options.platforms.includes(entry.platform)) return false;
    if (!options.platforms?.length && options.platform && entry.platform !== options.platform)
      return false;
    if (options.account && entry.account !== options.account) return false;
    if (options.status && entry.status !== options.status) return false;
    if (options.action && entry.action !== options.action) return false;
    if (options.fromDate && entry.createdAt < options.fromDate) return false;
    if (options.toDate && entry.createdAt > options.toDate) return false;
    if (
      options.errorKeyword &&
      (!entry.error || !entry.error.toLowerCase().includes(options.errorKeyword.toLowerCase()))
    ) {
      return false;
    }
    return true;
  });
};

export const listActionLogs = async (
  options?: ActionLogFilterOptions,
): Promise<PaginatedActionLogs> => {
  const limit = Math.max(1, Math.min(options?.limit || 20, 100));
  const offset = Math.max(0, options?.offset || 0);
  const sort = options?.sort || 'desc';

  if (isDbConnected()) {
    const { records, total } = await queryDbLogs({ ...options, limit, offset, sort });
    return {
      actions: records,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + records.length < total,
      },
    };
  }

  let entries = await readFileLogs();
  entries = filterFileLogs(entries, options || {});

  if (sort === 'asc') {
    entries = entries.reverse();
  }

  const total = entries.length;
  const paginatedEntries = entries.slice(offset, offset + limit);

  return {
    actions: paginatedEntries,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + paginatedEntries.length < total,
    },
  };
};

const compareActionRecords = (
  left: ActionLogRecord,
  right: ActionLogRecord,
  sort: 'asc' | 'desc',
): number => {
  const byTime = left.createdAt.localeCompare(right.createdAt);
  if (byTime !== 0) {
    return sort === 'asc' ? byTime : -byTime;
  }

  const byPlatform = left.platform.localeCompare(right.platform);
  if (byPlatform !== 0) {
    return byPlatform;
  }

  return left.id.localeCompare(right.id);
};

type MergeHeapItem = {
  record: ActionLogRecord;
  listIndex: number;
  itemIndex: number;
};

const heapPush = (heap: MergeHeapItem[], item: MergeHeapItem, sort: 'asc' | 'desc') => {
  heap.push(item);
  let index = heap.length - 1;

  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (compareActionRecords(heap[index].record, heap[parent].record, sort) >= 0) {
      break;
    }
    [heap[index], heap[parent]] = [heap[parent], heap[index]];
    index = parent;
  }
};

const heapPop = (heap: MergeHeapItem[], sort: 'asc' | 'desc'): MergeHeapItem => {
  const top = heap[0];
  const last = heap.pop();
  if (!last || heap.length === 0) {
    return top;
  }

  heap[0] = last;
  let index = 0;

  while (true) {
    const leftChild = index * 2 + 1;
    const rightChild = index * 2 + 2;
    let smallest = index;

    if (
      leftChild < heap.length &&
      compareActionRecords(heap[leftChild].record, heap[smallest].record, sort) < 0
    ) {
      smallest = leftChild;
    }
    if (
      rightChild < heap.length &&
      compareActionRecords(heap[rightChild].record, heap[smallest].record, sort) < 0
    ) {
      smallest = rightChild;
    }
    if (smallest === index) {
      break;
    }

    [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
    index = smallest;
  }

  return top;
};

export const mergeSortedActionLists = (
  lists: ActionLogRecord[][],
  sort: 'asc' | 'desc' = 'desc',
): ActionLogRecord[] => {
  const heap: MergeHeapItem[] = [];

  lists.forEach((list, listIndex) => {
    if (list.length > 0) {
      heapPush(heap, { record: list[0], listIndex, itemIndex: 0 }, sort);
    }
  });

  const merged: ActionLogRecord[] = [];
  while (heap.length > 0) {
    const current = heapPop(heap, sort);
    merged.push(current.record);

    const source = lists[current.listIndex];
    const nextIndex = current.itemIndex + 1;
    if (nextIndex < source.length) {
      heapPush(
        heap,
        { record: source[nextIndex], listIndex: current.listIndex, itemIndex: nextIndex },
        sort,
      );
    }
  }

  return merged;
};

const sortActionRecords = (entries: ActionLogRecord[], sort: 'asc' | 'desc'): ActionLogRecord[] => {
  const sorted = [...entries];
  sorted.sort((left, right) => compareActionRecords(left, right, sort));
  return sorted;
};

const fetchPlatformActionLists = async (
  options: ActionLogFilterOptions,
): Promise<ActionLogRecord[][]> => {
  const sort = options.sort || 'desc';
  const sharedFilters = {
    account: options.account,
    status: options.status,
    action: options.action,
    fromDate: options.fromDate,
    toDate: options.toDate,
    errorKeyword: options.errorKeyword,
    sort,
  };

  if (isDbConnected()) {
    return Promise.all(
      UNIFIED_PLATFORMS.map(async (platform) => {
        const { records } = await queryDbLogs({
          ...sharedFilters,
          platform,
          limit: 500,
          offset: 0,
          sort,
        });
        return records;
      }),
    );
  }

  const entries = await readFileLogs();
  return UNIFIED_PLATFORMS.map((platform) =>
    sortActionRecords(filterFileLogs(entries, { ...sharedFilters, platform }), sort),
  );
};

const toUnifiedAction = (entry: ActionLogRecord): UnifiedActionRecord => {
  const metadata: Record<string, unknown> = {
    ...(entry.details || {}),
    account: entry.account,
  };

  if (entry.username) {
    metadata.username = entry.username;
  }
  if (entry.error) {
    metadata.error = entry.error;
  }

  return {
    platform: entry.platform as UnifiedPlatform,
    action: entry.action,
    timestamp: entry.createdAt,
    status: entry.status,
    metadata,
  };
};

export const listUnifiedActionLogs = async (options?: {
  limit?: number;
  offset?: number;
  account?: string;
  status?: ActionLogStatus;
  action?: string;
  fromDate?: string;
  toDate?: string;
  errorKeyword?: string;
  sort?: 'asc' | 'desc';
}): Promise<PaginatedUnifiedActions> => {
  const limit = Math.max(1, Math.min(options?.limit || 20, 100));
  const offset = Math.max(0, options?.offset || 0);
  const sort = options?.sort || 'desc';

  const platformLists = await fetchPlatformActionLists({ ...options, sort });
  const merged = mergeSortedActionLists(platformLists, sort);
  const page = merged.slice(offset, offset + limit);

  return {
    actions: page.map(toUnifiedAction),
    pagination: {
      total: merged.length,
      limit,
      offset,
      hasMore: offset + page.length < merged.length,
    },
  };
};

export const listActionLogsLegacy = async (options?: {
  limit?: number;
  platform?: string;
  account?: string;
}): Promise<ActionLogRecord[]> => {
  const result = await listActionLogs(options);
  return result.actions;
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
    const { records } = await queryDbLogs({ limit: fileLimit, platform, account });
    return summarize(records);
  }

  const fileLimit = Math.max(1, Math.min(options?.limit || 500, 500));
  const entries = await readFileLogs();
  const filtered = filterFileLogs(entries, { platform, account }).slice(0, fileLimit);
  return summarize(filtered);
};