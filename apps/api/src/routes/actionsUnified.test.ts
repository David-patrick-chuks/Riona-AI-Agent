import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import actionsUnifiedRouter from './actionsUnified';
import { signToken } from '../secret';
import * as actionLogService from '../../services/actionLog';

jest.mock('../../services/actionLog', () => ({
  listActionLogs: jest.fn().mockResolvedValue({
    actions: [
      {
        id: '1',
        platform: 'instagram',
        action: 'post-photo',
        account: 'default',
        status: 'success',
        createdAt: '2025-01-15T10:00:00.000Z',
      },
      {
        id: '2',
        platform: 'twitter',
        action: 'post-tweet',
        account: 'default',
        status: 'success',
        createdAt: '2025-01-15T11:00:00.000Z',
      },
    ],
    pagination: { total: 2, limit: 20, offset: 0, hasMore: false },
  }),
}));

describe('Unified action log endpoint', () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/actions/unified', actionsUnifiedRouter);

  const token = signToken({ username: 'testuser', account: 'default' });

  test('GET /api/actions/unified responds with HTTP 200', async () => {
    const res = await request(app).get('/api/actions/unified').set('Cookie', `token=${token}`);
    expect(res.status).toBe(200);
  });

  test('Response includes actions from both IG and Twitter sources', async () => {
    const res = await request(app).get('/api/actions/unified').set('Cookie', `token=${token}`);
    const { actions } = res.body;
    const platforms = actions.map((a: any) => a.platform);
    expect(platforms).toContain('instagram');
    expect(platforms).toContain('twitter');
  });

  test('Each action has a consistent shape: platform, action, timestamp, status, metadata', async () => {
    const res = await request(app).get('/api/actions/unified').set('Cookie', `token=${token}`);
    const { actions } = res.body;
    expect(actions).toHaveLength(2);
    for (const action of actions) {
      expect(action).toHaveProperty('platform');
      expect(action).toHaveProperty('action');
      expect(action).toHaveProperty('timestamp');
      expect(action).toHaveProperty('status');
      expect(action).toHaveProperty('metadata');
    }
  });

  test('Supports pagination via ?limit= and ?offset= query params', async () => {
    const res = await request(app)
      .get('/api/actions/unified')
      .query({ limit: 1, offset: 0 })
      .set('Cookie', `token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(1);
    expect(res.body.pagination.offset).toBe(0);
    expect(res.body.actions.length).toBeLessThanOrEqual(1);
  });

  test('Includes pagination metadata with hasMore flag', async () => {
    const res = await request(app).get('/api/actions/unified').set('Cookie', `token=${token}`);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('hasMore');
  });
});
