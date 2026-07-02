import express from 'express';
import request from 'supertest';
import { registerHelloRoute } from './hello';

describe('hello route', () => {
  test('GET /hello returns bot detection test payload', async () => {
    const app = express();
    registerHelloRoute(app);

    const res = await request(app).get('/hello');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
