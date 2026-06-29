jest.mock('puppeteer-extra', () => ({
  use: jest.fn(),
  launch: jest.fn(),
}));

jest.mock('puppeteer-extra-plugin-stealth', () => () => ({}));

jest.mock('puppeteer-extra-plugin-adblocker', () => () => ({}));

jest.mock('puppeteer', () => ({
  DEFAULT_INTERCEPT_RESOLUTION_PRIORITY: 0,
}));

jest.mock('./config/db', () => ({
  isDbConnected: jest.fn(() => false),
}));

jest.mock('./client/Instagram', () => ({
  getIgClient: jest.fn(),
  closeIgClient: jest.fn(),
  scrapeFollowersHandler: jest.fn(),
  getIgClientStatus: jest.fn(() => ({ connected: false })),
  getIgClientsSnapshot: jest.fn(() => ({})),
}));

jest.mock('./services/actionLog', () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
  getActionSummary: jest.fn().mockResolvedValue({}),
  listActionLogs: jest.fn().mockResolvedValue([]),
}));

jest.mock('./services/metrics', () => ({
  metricsMiddleware: jest.fn((_req, _res, next) => next()),
  getMetrics: jest.fn(() => ({ uptime: 0, uptimeFormatted: '0s', requests: 0 })),
}));

jest.mock('./config/accounts', () => ({
  getAccount: jest.fn(),
  getAccountsMap: jest.fn(() => ({})),
}));

import request from 'supertest';
import app from './app';

describe('hello endpoint', () => {
  test('GET /hello returns bot-detection smoke payload', async () => {
    const res = await request(app).get('/hello');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
