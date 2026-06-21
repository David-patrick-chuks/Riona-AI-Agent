import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { closeDB } from '../config/db';
import {
  createWebhook,
  listWebhooks,
  deleteWebhook,
  getWebhook,
  updateWebhookStatus,
  signPayload,
  verifySignature,
  isValidEvent,
  validateWebhookUrl,
  getValidEvents,
} from './webhooks';

describe('webhook service', () => {
  const originalPath = process.env.WEBHOOKS_PATH;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'riona-webhooks-'));
    process.env.WEBHOOKS_PATH = path.join(tempDir, 'webhooks.json');
  });

  afterEach(async () => {
    process.env.WEBHOOKS_PATH = originalPath;
    await closeDB();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('createWebhook', () => {
    test('creates a webhook with valid input', async () => {
      const webhook = await createWebhook({
        url: 'https://example.com/webhook',
        events: ['action.login', 'action.error'],
        account: 'test-account',
      });

      expect(webhook.id).toMatch(/^wh_/);
      expect(webhook.url).toBe('https://example.com/webhook');
      expect(webhook.events).toEqual(['action.login', 'action.error']);
      expect(webhook.secret).toMatch(/^whsec_/);
      expect(webhook.status).toBe('active');
      expect(webhook.account).toBe('test-account');
      expect(webhook.failureCount).toBe(0);
    });

    test('rejects invalid URL', async () => {
      await expect(
        createWebhook({
          url: 'not-a-valid-url',
          events: ['action.login'],
        }),
      ).rejects.toThrow('Invalid webhook URL');
    });

    test('rejects invalid events', async () => {
      await expect(
        createWebhook({
          url: 'https://example.com/webhook',
          events: ['invalid.event' as any],
        }),
      ).rejects.toThrow('Invalid events');
    });

    test('rejects empty events array', async () => {
      await expect(
        createWebhook({
          url: 'https://example.com/webhook',
          events: [],
        }),
      ).rejects.toThrow('At least one event must be specified');
    });

    test('uses default account when not specified', async () => {
      const webhook = await createWebhook({
        url: 'https://example.com/webhook',
        events: ['action.login'],
      });

      expect(webhook.account).toBe('default');
    });
  });

  describe('listWebhooks', () => {
    test('lists all webhooks', async () => {
      await createWebhook({
        url: 'https://example.com/webhook1',
        events: ['action.login'],
        account: 'account1',
      });
      await createWebhook({
        url: 'https://example.com/webhook2',
        events: ['action.error'],
        account: 'account2',
      });

      const webhooks = await listWebhooks();
      expect(webhooks).toHaveLength(2);
    });

    test('filters by account', async () => {
      await createWebhook({
        url: 'https://example.com/webhook1',
        events: ['action.login'],
        account: 'account1',
      });
      await createWebhook({
        url: 'https://example.com/webhook2',
        events: ['action.error'],
        account: 'account2',
      });

      const webhooks = await listWebhooks('account1');
      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].account).toBe('account1');
    });

    test('does not expose secrets', async () => {
      await createWebhook({
        url: 'https://example.com/webhook',
        events: ['action.login'],
      });

      const webhooks = await listWebhooks();
      expect(webhooks[0]).not.toHaveProperty('secret');
    });
  });

  describe('getWebhook', () => {
    test('retrieves webhook by id', async () => {
      const created = await createWebhook({
        url: 'https://example.com/webhook',
        events: ['action.login'],
      });

      const webhook = await getWebhook(created.id);
      expect(webhook).not.toBeNull();
      expect(webhook?.id).toBe(created.id);
      expect(webhook?.secret).toBe(created.secret);
    });

    test('returns null for non-existent id', async () => {
      const webhook = await getWebhook('non-existent-id');
      expect(webhook).toBeNull();
    });
  });

  describe('deleteWebhook', () => {
    test('deletes webhook by id', async () => {
      const webhook = await createWebhook({
        url: 'https://example.com/webhook',
        events: ['action.login'],
      });

      const deleted = await deleteWebhook(webhook.id);
      expect(deleted).toBe(true);

      const found = await getWebhook(webhook.id);
      expect(found).toBeNull();
    });

    test('returns false for non-existent id', async () => {
      const deleted = await deleteWebhook('non-existent-id');
      expect(deleted).toBe(false);
    });

    test('respects account filter', async () => {
      const webhook = await createWebhook({
        url: 'https://example.com/webhook',
        events: ['action.login'],
        account: 'account1',
      });

      const deleted = await deleteWebhook(webhook.id, 'account2');
      expect(deleted).toBe(false);

      const found = await getWebhook(webhook.id);
      expect(found).not.toBeNull();
    });
  });

  describe('updateWebhookStatus', () => {
    test('updates webhook status', async () => {
      const webhook = await createWebhook({
        url: 'https://example.com/webhook',
        events: ['action.login'],
      });

      const updated = await updateWebhookStatus(webhook.id, 'paused');
      expect(updated).toBe(true);

      const found = await getWebhook(webhook.id);
      expect(found?.status).toBe('paused');
    });

    test('updates failure count', async () => {
      const webhook = await createWebhook({
        url: 'https://example.com/webhook',
        events: ['action.login'],
      });

      await updateWebhookStatus(webhook.id, 'active', 3);
      const found = await getWebhook(webhook.id);
      expect(found?.failureCount).toBe(3);
    });
  });

  describe('signature verification', () => {
    test('signs and verifies payload correctly', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const secret = 'whsec_testsecret123';

      const signature = signPayload(payload, secret);
      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]+$/);

      const isValid = verifySignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    test('rejects invalid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const secret = 'whsec_testsecret123';

      const isValid = verifySignature(payload, 't=12345,v1=invalidsig', secret);
      expect(isValid).toBe(false);
    });

    test('rejects expired timestamp', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const secret = 'whsec_testsecret123';

      // Create signature with old timestamp
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const signedPayload = `${oldTimestamp}.${payload}`;
      const sig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
      const signature = `t=${oldTimestamp},v1=${sig}`;

      const isValid = verifySignature(payload, signature, secret, 300);
      expect(isValid).toBe(false);
    });

    test('rejects malformed signature', () => {
      const payload = JSON.stringify({ event: 'test', data: {} });
      const secret = 'whsec_testsecret123';

      expect(verifySignature(payload, 'malformed', secret)).toBe(false);
      expect(verifySignature(payload, 't=12345', secret)).toBe(false);
      expect(verifySignature(payload, 'v1=abc', secret)).toBe(false);
    });
  });

  describe('validation helpers', () => {
    test('isValidEvent validates correctly', () => {
      expect(isValidEvent('action.login')).toBe(true);
      expect(isValidEvent('action.interact')).toBe(true);
      expect(isValidEvent('action.dm')).toBe(true);
      expect(isValidEvent('action.post')).toBe(true);
      expect(isValidEvent('action.error')).toBe(true);
      expect(isValidEvent('schedule.completed')).toBe(true);
      expect(isValidEvent('schedule.failed')).toBe(true);
      expect(isValidEvent('invalid.event')).toBe(false);
    });

    test('validateWebhookUrl validates correctly', () => {
      expect(validateWebhookUrl('https://example.com')).toBe(true);
      expect(validateWebhookUrl('http://localhost:3000')).toBe(true);
      expect(validateWebhookUrl('ftp://example.com')).toBe(false);
      expect(validateWebhookUrl('not-a-url')).toBe(false);
    });

    test('getValidEvents returns all events', () => {
      const events = getValidEvents();
      expect(events).toContain('action.login');
      expect(events).toContain('action.error');
      expect(events).toContain('schedule.completed');
      expect(events.length).toBe(7);
    });
  });
});
