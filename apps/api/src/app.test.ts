jest.mock('./config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  setupErrorHandlers: jest.fn(),
}));

jest.mock('./routes/api', () => {
  const express = require('express');
  return {
    __esModule: true,
    default: express.Router(),
  };
});

jest.mock('./services/metrics', () => ({
  metricsMiddleware: jest.fn((_req, _res, next) => next()),
}));

jest.mock('./secret', () => ({
  verifyToken: jest.fn(),
  getTokenFromRequest: jest.fn(),
}));

jest.mock('./client/Instagram', () => ({
  getIgClient: jest.fn(),
  closeIgClient: jest.fn(),
}));

jest.mock('./utils/env', () => ({
  getBoolEnv: jest.fn(() => false),
  getNumberEnv: jest.fn((_key, fallback) => fallback),
}));

jest.mock('./config/igProfile', () => ({
  getEffectiveIgProfile: jest.fn(),
}));

jest.mock('./utils', () => ({
  setup_HandleError: jest.fn(),
  setIgCooldown: jest.fn(),
  getIgCooldown: jest.fn(() => Promise.resolve({ until: 0 })),
}));

import request from 'supertest';
import app from './app';

describe('application routes', () => {
  test('GET /hello returns the bounty verification payload', async () => {
    const res = await request(app).get('/hello');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ ok: true });
  });
});
