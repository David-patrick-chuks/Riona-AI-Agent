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
  getIgClientStatus: jest.fn(() => ({ connected: false })),
  getIgClientsSnapshot: jest.fn(() => ({})),
}));

jest.mock('../services/actionLog', () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
  getActionSummary: jest.fn().mockResolvedValue({}),
  listActionLogs: jest.fn().mockResolvedValue({
    actions: [],
    pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
  }),
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
import { listActionLogs } from '../services/actionLog';

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
    });

    test('GET /api/config returns feature flags when authenticated', async () => {
      const res = await request(app).get('/api/config').set('Cookie', `token=${token}`);
      expect(res.status).toBe(200);
      expect(res.body.features).toMatchObject({
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

    test('GET /api/actions/unified merges instagram and twitter actions with pagination', async () => {
      const mockedListActionLogs = listActionLogs as jest.MockedFunction<typeof listActionLogs>;
      mockedListActionLogs
        .mockResolvedValueOnce({
          actions: [
            {
              id: 'ig-1',
              platform: 'instagram',
              action: 'like',
              account: 'default',
              username: 'ig-user',
              status: 'success',
              details: { mediaId: '123' },
              createdAt: '2026-07-01T08:30:00.000Z',
            },
          ],
          pagination: { total: 1, limit: 2, offset: 0, hasMore: false },
        })
        .mockResolvedValueOnce({
          actions: [
            {
              id: 'tw-1',
              platform: 'twitter',
              action: 'tweet',
              account: 'default',
              username: 'tw-user',
              status: 'error',
              error: 'rate limit',
              details: { tweetId: '456' },
              createdAt: '2026-07-01T08:31:00.000Z',
            },
          ],
          pagination: { total: 1, limit: 2, offset: 0, hasMore: false },
        });

      const res = await request(app)
        .get('/api/actions/unified?limit=2&offset=0&account=default')
        .set('Cookie', `token=${token}`);

      expect(res.status).toBe(200);
      expect(mockedListActionLogs).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ platform: 'instagram', limit: 2, offset: 0, account: 'default' }),
      );
      expect(mockedListActionLogs).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ platform: 'twitter', limit: 2, offset: 0, account: 'default' }),
      );
      expect(res.body).toEqual({
        actions: [
          {
            platform: 'twitter',
            action: 'tweet',
            timestamp: '2026-07-01T08:31:00.000Z',
            status: 'error',
            metadata: {
              account: 'default',
              username: 'tw-user',
              error: 'rate limit',
              details: { tweetId: '456' },
            },
          },
          {
            platform: 'instagram',
            action: 'like',
            timestamp: '2026-07-01T08:30:00.000Z',
            status: 'success',
            metadata: {
              account: 'default',
              username: 'ig-user',
              error: null,
              details: { mediaId: '123' },
            },
          },
        ],
        pagination: {
          total: 2,
          limit: 2,
          offset: 0,
          hasMore: false,
        },
      });
    });
  });
});
