import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import logger from '../config/logger';
import { getPool, isDbConnected } from '../config/db';

export type WebhookEvent =
  | 'action.login'
  | 'action.interact'
  | 'action.dm'
  | 'action.post'
  | 'action.error'
  | 'schedule.completed'
  | 'schedule.failed';

export type WebhookStatus = 'active' | 'paused' | 'failed';

export type WebhookRegistration = {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  status: WebhookStatus;
  account: string;
  createdAt: string;
  lastTriggeredAt?: string;
  failureCount: number;
};

export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
};

export type WebhookCreateInput = {
  url: string;
  events: WebhookEvent[];
  account?: string;
};

const VALID_EVENTS: WebhookEvent[] = [
  'action.login',
  'action.interact',
  'action.dm',
  'action.post',
  'action.error',
  'schedule.completed',
  'schedule.failed',
];

const getWebhooksPath = () =>
  process.env.WEBHOOKS_PATH || path.join(process.cwd(), 'data', 'webhooks.json');

const generateId = () => `wh_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

const generateSecret = () => `whsec_${crypto.randomBytes(32).toString('hex')}`;

export const isValidEvent = (event: string): event is WebhookEvent =>
  VALID_EVENTS.includes(event as WebhookEvent);

export const validateWebhookUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const readFileWebhooks = async (): Promise<WebhookRegistration[]> => {
  try {
    const raw = await fs.readFile(getWebhooksPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') return [];
    logger.warn('Failed to read webhooks file.', error);
    return [];
  }
};

const writeFileWebhooks = async (webhooks: WebhookRegistration[]) => {
  const filePath = getWebhooksPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(webhooks, null, 2));
};

let fileWebhookChain: Promise<void> = Promise.resolve();

const withFileWebhookLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  const run = fileWebhookChain.then(fn, fn);
  fileWebhookChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

export const createWebhook = async (input: WebhookCreateInput): Promise<WebhookRegistration> => {
  if (!validateWebhookUrl(input.url)) {
    throw new Error('Invalid webhook URL. Must be a valid HTTP or HTTPS URL.');
  }

  const invalidEvents = input.events.filter((e) => !isValidEvent(e));
  if (invalidEvents.length > 0) {
    throw new Error(
      `Invalid events: ${invalidEvents.join(', ')}. Valid events: ${VALID_EVENTS.join(', ')}`,
    );
  }

  if (input.events.length === 0) {
    throw new Error('At least one event must be specified.');
  }

  const webhook: WebhookRegistration = {
    id: generateId(),
    url: input.url,
    events: input.events,
    secret: generateSecret(),
    status: 'active',
    account: input.account || 'default',
    createdAt: new Date().toISOString(),
    failureCount: 0,
  };

  if (isDbConnected()) {
    const pool = getPool();
    if (pool) {
      await pool.query(
        `INSERT INTO webhooks (id, url, events, secret, status, account, created_at, failure_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          webhook.id,
          webhook.url,
          JSON.stringify(webhook.events),
          webhook.secret,
          webhook.status,
          webhook.account,
          webhook.createdAt,
          webhook.failureCount,
        ],
      );
      return webhook;
    }
  }

  await withFileWebhookLock(async () => {
    const webhooks = await readFileWebhooks();
    webhooks.push(webhook);
    await writeFileWebhooks(webhooks);
  });

  return webhook;
};

export const listWebhooks = async (
  account?: string,
): Promise<Omit<WebhookRegistration, 'secret'>[]> => {
  let webhooks: WebhookRegistration[];

  if (isDbConnected()) {
    const pool = getPool();
    if (pool) {
      const result = await pool.query(
        account
          ? 'SELECT id, url, events, status, account, created_at, last_triggered_at, failure_count FROM webhooks WHERE account = $1 ORDER BY created_at DESC'
          : 'SELECT id, url, events, status, account, created_at, last_triggered_at, failure_count FROM webhooks ORDER BY created_at DESC',
        account ? [account] : [],
      );
      return result.rows.map((row: any) => ({
        id: row.id,
        url: row.url,
        events: typeof row.events === 'string' ? JSON.parse(row.events) : row.events,
        status: row.status,
        account: row.account,
        createdAt: row.created_at,
        lastTriggeredAt: row.last_triggered_at || undefined,
        failureCount: row.failure_count,
      }));
    }
  }

  webhooks = await readFileWebhooks();
  if (account) {
    webhooks = webhooks.filter((w) => w.account === account);
  }

  return webhooks.map(({ secret: _secret, ...rest }) => rest);
};

export const getWebhook = async (id: string): Promise<WebhookRegistration | null> => {
  if (isDbConnected()) {
    const pool = getPool();
    if (pool) {
      const result = await pool.query('SELECT * FROM webhooks WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        url: row.url,
        events: typeof row.events === 'string' ? JSON.parse(row.events) : row.events,
        secret: row.secret,
        status: row.status,
        account: row.account,
        createdAt: row.created_at,
        lastTriggeredAt: row.last_triggered_at || undefined,
        failureCount: row.failure_count,
      };
    }
  }

  const webhooks = await readFileWebhooks();
  return webhooks.find((w) => w.id === id) || null;
};

export const deleteWebhook = async (id: string, account?: string): Promise<boolean> => {
  if (isDbConnected()) {
    const pool = getPool();
    if (pool) {
      const result = await pool.query(
        account
          ? 'DELETE FROM webhooks WHERE id = $1 AND account = $2'
          : 'DELETE FROM webhooks WHERE id = $1',
        account ? [id, account] : [id],
      );
      return (result.rowCount ?? 0) > 0;
    }
  }

  return withFileWebhookLock(async () => {
    const webhooks = await readFileWebhooks();
    const index = webhooks.findIndex((w) => w.id === id && (!account || w.account === account));
    if (index === -1) return false;
    webhooks.splice(index, 1);
    await writeFileWebhooks(webhooks);
    return true;
  });
};

export const updateWebhookStatus = async (
  id: string,
  status: WebhookStatus,
  failureCount?: number,
): Promise<boolean> => {
  if (isDbConnected()) {
    const pool = getPool();
    if (pool) {
      const result = await pool.query(
        failureCount !== undefined
          ? 'UPDATE webhooks SET status = $2, failure_count = $3 WHERE id = $1'
          : 'UPDATE webhooks SET status = $2 WHERE id = $1',
        failureCount !== undefined ? [id, status, failureCount] : [id, status],
      );
      return (result.rowCount ?? 0) > 0;
    }
  }

  return withFileWebhookLock(async () => {
    const webhooks = await readFileWebhooks();
    const webhook = webhooks.find((w) => w.id === id);
    if (!webhook) return false;
    webhook.status = status;
    if (failureCount !== undefined) webhook.failureCount = failureCount;
    await writeFileWebhooks(webhooks);
    return true;
  });
};

export const signPayload = (payload: string, secret: string): string => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
};

export const verifySignature = (
  payload: string,
  signature: string,
  secret: string,
  tolerance = 300,
): boolean => {
  const parts = signature.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const signaturePart = parts.find((p) => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) return false;

  const timestamp = parseInt(timestampPart.slice(2), 10);
  const providedSignature = signaturePart.slice(3);

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature));
};

export const triggerWebhooks = async (
  event: WebhookEvent,
  data: Record<string, unknown>,
  account?: string,
): Promise<{ sent: number; failed: number }> => {
  let webhooks: WebhookRegistration[];

  if (isDbConnected()) {
    const pool = getPool();
    if (pool) {
      const result = await pool.query(
        account
          ? "SELECT * FROM webhooks WHERE status = 'active' AND account = $1"
          : "SELECT * FROM webhooks WHERE status = 'active'",
        account ? [account] : [],
      );
      webhooks = result.rows.map((row: any) => ({
        id: row.id,
        url: row.url,
        events: typeof row.events === 'string' ? JSON.parse(row.events) : row.events,
        secret: row.secret,
        status: row.status,
        account: row.account,
        createdAt: row.created_at,
        lastTriggeredAt: row.last_triggered_at || undefined,
        failureCount: row.failure_count,
      }));
    } else {
      webhooks = [];
    }
  } else {
    webhooks = await readFileWebhooks();
    webhooks = webhooks.filter((w) => w.status === 'active');
    if (account) {
      webhooks = webhooks.filter((w) => w.account === account);
    }
  }

  const matching = webhooks.filter((w) => w.events.includes(event));
  let sent = 0;
  let failed = 0;

  for (const webhook of matching) {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);
    const signature = signPayload(payloadString, webhook.secret);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-ID': webhook.id,
        },
        body: payloadString,
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        sent++;
        await updateWebhookStatus(webhook.id, 'active', 0);
        if (isDbConnected()) {
          const pool = getPool();
          if (pool) {
            await pool.query('UPDATE webhooks SET last_triggered_at = NOW() WHERE id = $1', [
              webhook.id,
            ]);
          }
        }
      } else {
        failed++;
        const newFailureCount = webhook.failureCount + 1;
        const newStatus = newFailureCount >= 5 ? 'failed' : 'active';
        await updateWebhookStatus(webhook.id, newStatus, newFailureCount);
        logger.warn(`Webhook ${webhook.id} failed with status ${response.status}`);
      }
    } catch (error) {
      failed++;
      const newFailureCount = webhook.failureCount + 1;
      const newStatus = newFailureCount >= 5 ? 'failed' : 'active';
      await updateWebhookStatus(webhook.id, newStatus, newFailureCount);
      logger.warn(`Webhook ${webhook.id} failed:`, error);
    }
  }

  return { sent, failed };
};

export const getValidEvents = (): WebhookEvent[] => [...VALID_EVENTS];
