jest.mock('puppeteer-extra', () => ({
  use: jest.fn(),
  launch: jest.fn(),
}));

jest.mock('puppeteer-extra-plugin-stealth', () => () => ({}));

jest.mock('puppeteer-extra-plugin-adblocker', () => () => ({}));

jest.mock('puppeteer', () => ({
  DEFAULT_INTERCEPT_RESOLUTION_PRIORITY: 0,
}));

jest.mock('../config/db', () => ({
  isDbConnected: jest.fn(() => false),
}));

jest.mock('../client/Instagram', () => ({
  getIgClient: jest.fn(),
  closeIgClient: jest.fn(),
  scrapeFollowersHandler: jest.fn(),
  logAction: jest.fn().mockResolvedValue(undefined),
  getActionSummary: jest.fn().mockResolvedValue({}),
  listActionLogs: jest.fn().mockResolvedValue([]),
  getInstagramActionLogs: jest.fn().mockResolvedValue([]),
  getTwitterActionLogs: jest.fn().mockResolvedValue([]),
}));

jest.mock('../services/metrics', () => ({
  getActionSummary: jest.fn().mockResolvedValue({}),
  listActionLogs: jest.fn().mockResolvedValue([]),
}));

jest.mock('../services/metrics', () => ({
  getMetrics: jest.fn(() => ({
    uptime: 120,
    uptimeFormatted: '2m 0s',
    requests: 0,
  })),
}));

jest.mock('../config/accounts', () => ({
  getAccount: jest.fn(),
  getAccountsMap: jest.fn(() => ({})),
}));

import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import apiRoutes from './api';
import { signToken } from '../secret';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', apiRoutes);

describe('API routes', () => {
  describe('public endpoints', () => {
    test('GET /api/ping returns pong', async () => {
      const res = await request(app).get('/api/ping');
      expect(res.status).toBe(200);
      expect(res.text).toBe('pong');
    });

    test('GET /api/version returns build metadata', async () => {
      const res = await request(app).get('/api/version');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        name: 'Riona AI Agent',
        node: expect.any(String),
        platform: expect.any(String),
        uptime: expect.any(Number),
      });
    });

    test('GET /api/status reports database connectivity', async () => {
      const res = await request(app).get('/api/status');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ dbConnected: false });
    });

    test('GET /api/health returns minimal payload without auth', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, dbConnected: false });
    });

    test('GET /api/config returns public rate limits without auth', async () => {
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      expect(res.body.rateLimits).toBeDefined();
      expect(res.body.rateLimits.login.max).toBe(5);
      expect(res.body.features).toBeUndefined();
    });

    test('GET /api/docs lists API endpoints', async () => {
      const res = await request(app).get('/api/docs');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Riona AI Agent API');
      expect(res.body.endpoints.public.length).toBeGreaterThan(0);
    });

    test('GET /api/metrics returns public uptime only without auth', async () => {
      const res = await request(app).get('/api/metrics');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.uptime).toBe(120);
      expect(res.body.requests).toBeUndefined();
    });
  });

  describe('authenticated endpoints', () => {
    const token = signToken({ username: 'testuser', account: 'default' });

    test('GET /api/health returns extended payload with valid token', async () => {
      const res = await request(app).get('/api/health').set('Cookie', `token=${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.igClient).toBeDefined();
      expect(res.body.geminiKeys).toBeDefined();
      expect(res.body.igClient).toBeDefined();
      expect(res.body.geminiKeys).toBeDefined();
    });

    test('GET /api/actions/unified returns merged action logs with default pagination', async () => {
      const { getInstagramActionLogs, getTwitterActionLogs } = require('../services/actionLog');
      getInstagramActionLogs.mockResolvedValue([
        { id: 'ig-1', platform: 'instagram', action: 'like', timestamp: '2024-01-01T00:00:00Z', status: 'success', metadata: { postId: '123' } },
      ]);
      getTwitterActionLogs.mockResolvedValue([
        { id: 'tw-1', platform: 'twitter', action: 'tweet', timestamp: '2024-01-02T00:00:00Z', status: 'success', metadata: { tweetId: '456' } },
      ]);

      const res = await request(app).get('/api/actions/unified').set('Cookie', `token=${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toMatchObject({
        platform: expect.any(String),
        action: expect.any(String),
        timestamp: expect.any(String),
        status: expect.any(String),
        metadata: expect.any(Object),
      });
    });

    test('GET /api/actions/unified supports limit and offset pagination', async () => {
      const { getInstagramActionLogs, getTwitterActionLogs } = require('../services/actionLog');
      getInstagramActionLogs.mockResolvedValue([
        { id: 'ig-1', platform: 'instagram', action: 'like', timestamp: '2024-01-01T00:00:00Z', status: 'success', metadata: { postId: '123' } },
        { id: 'ig-2', platform: 'instagram', action: 'comment', timestamp: '2024-01-03T00:00:00Z', status: 'success', metadata: { postId: '124' } },
      ]);
      getTwitterActionLogs.mockResolvedValue([
        { id: 'tw-1', platform: 'twitter', action: 'tweet', timestamp: '2024-01-02T00:00:00Z', status: 'success', metadata: { tweetId: '456' } },
      ]);

      const res = await request(app).get('/api/actions/unified?limit=2&offset=1').set('Cookie', `token=${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].id).toBe('tw-1');
      expect(res.body[1].id).toBe('ig-2');
    });

    test('GET /api/actions/unified returns empty array when no logs exist', async () => {
      const { getInstagramActionLogs, getTwitterActionLogs } = require('../services/actionLog');
      getInstagramActionLogs.mockResolvedValue([]);
      getTwitterActionLogs.mockResolvedValue([]);

      const res = await request(app).get('/api/actions/unified').set('Cookie', `token=${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('GET /api/actions/unified sorts actions by timestamp descending', async () => {
      const { getInstagramActionLogs, getTwitterActionLogs } = require('../services/actionLog');
      getInstagramActionLogs.mockResolvedValue([
        { id: 'ig-1', platform: 'instagram', action: 'like', timestamp: '2024-01-01T00:00:00Z', status: 'success', metadata: {} },
      ]);
      getTwitterActionLogs.mockResolvedValue([
        { id: 'tw-1', platform: 'twitter', action: 'tweet', timestamp: '2024-01-02T00:00:00Z', status: 'success', metadata: {} },
      ]);

      const res = await request(app).get('/api/actions/unified').set('Cookie', `token=${token}`);
      expect(res.status).toBe(200);
      expect(res.body[0].timestamp).toBe('2024-01-02T00:00:00Z');
      expect(res.body[1].timestamp).toBe('2024-01-01T00:00:00Z');
    });

    test('GET /api/config returns feature flags when authenticated', async () => {
      const res = await request(app).get('/a
        dbConnected: false,
        igAgentEnabled: false,
      });
      expect(res.body.instagram).toMatchObject({
        runProfile: expect.any(String),
        effectiveProfile: expect.any(String),
      });
    });

    test('GET /api/accounts requires authentication', async () => {
      const res = await request(app).get('/api/accounts');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/authenticated/i);
    });

    test('GET /api/accounts returns account overview when authenticated', async () => {
      const res = await request(app).get('/api/accounts').set('Cookie', `token=${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        accounts: [],
        igProfile: expect.any(String),
        effectiveProfile: expect.any(String),
      });
    });

    test('GET /api/me returns current user', async () => {
      const res = await request(app).get('/api/me').set('Cookie', `token=${token}`);
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('testuser');
      expect(res.body.account).toBe('default');
    });
  });
});
