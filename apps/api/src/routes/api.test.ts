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
  logAction: jest.fn().mockResolvedValue(undefined),
  getActionSummary: jest.fn().mockResolvedValue({}),
  listActionLogs: jest.fn().mockResolvedValue([]),
  getUnifiedActionLog: jest.fn().mockResolvedValue([]),
}));

jest.mock('../services/metrics', () => ({
jest.mock('../services/actionLog', () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
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

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/actions/unified returns merged action log with pagination', async () => {
      const { getUnifiedActionLog } = require('../services/actionLog');
      const mockActions = [
        {
          platform: 'instagram',
          action: 'like',
          timestamp: '2024-01-01T00:00:00.000Z',
          status: 'success',
          metadata: { postId: '123' },
        },
        {
          platform: 'twitter',
          action: 'tweet',
          timestamp: '2024-01-02T00:00:00.000Z',
          status: 'success',
          metadata: { tweetId: '456' },
        },
      ];
      getUnifiedActionLog.mockResolvedValue(mockActions);

      const res = await request(app)
        .get('/api/actions/unified')
        .set('Cookie', `token=${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty('platform');
      expect(res.body[0]).toHaveProperty('action');
      expect(res.body[0]).toHaveProperty('timestamp');
      expect(res.body[0]).toHaveProperty('status');
      expect(res.body[0]).toHaveProperty('metadata');
      expect(getUnifiedActionLog).toHaveBeenCalledWith({ limit: 50, offset: 0 });
    });

    test('GET /api/actions/unified supports limit and offset query params', async () => {
      const { getUnifiedActionLog } = require('../services/actionLog');
      await request(app)
        .get('/api/actions/unified?limit=10&offset=5')
        .set('Cookie', `token=${token}`);
      expect(getUnifiedActionLog).toHaveBeenCalledWith({ limit: 10, offset: 5 });
    });
  });
});
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
  });
});
