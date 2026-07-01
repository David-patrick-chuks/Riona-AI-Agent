jest.mock('./config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  setupErrorHandlers: jest.fn(),
}));

jest.mock('./services/metrics', () => ({
  metricsMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('./secret', () => ({
  verifyToken: jest.fn(() => null),
  getTokenFromRequest: jest.fn(() => null),
}));

jest.mock('./client/Instagram', () => ({
  getIgClient: jest.fn(),
  closeIgClient: jest.fn(),
}));

jest.mock('./utils/env', () => ({
  getBoolEnv: jest.fn(() => false),
  getNumberEnv: jest.fn(() => 60),
}));

jest.mock('./config/igProfile', () => ({
  getEffectiveIgProfile: jest.fn(),
}));

jest.mock('./utils', () => ({
  setup_HandleError: jest.fn(),
  setIgCooldown: jest.fn(),
  getIgCooldown: jest.fn(async () => ({ until: 0 })),
}));

jest.mock('./views/dashboard', () => ({
  dashboardHtml: '<html>dashboard</html>',
}));

jest.mock('./views/metrics', () => ({
  metricsHtml: '<html>metrics</html>',
}));

jest.mock('./routes/api', () => {
  const express = require('express');
  return express.Router();
});

import request from 'supertest';
import app from './app';

describe('app', () => {
  test('GET /hello returns ok payload', async () => {
    const res = await request(app).get('/hello');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
