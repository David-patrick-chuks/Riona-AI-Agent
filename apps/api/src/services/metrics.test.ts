import { Request, Response, NextFunction } from 'express';
import { metricsMiddleware, getMetrics, resetMetrics } from './metrics';

describe('metrics service', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let finishCallback: (() => void) | null;

  beforeEach(() => {
    resetMetrics();
    finishCallback = null;
    mockReq = {
      method: 'GET',
      path: '/api/test',
      route: { path: '/test' },
    };
    mockRes = {
      statusCode: 200,
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
        return mockRes as Response;
      }),
    };
    mockNext = jest.fn();
  });

  test('getMetrics returns initial state', () => {
    const metrics = getMetrics();

    expect(metrics.totalRequests).toBe(0);
    expect(metrics.totalErrors).toBe(0);
    expect(metrics.errorRate).toBe('0%');
    expect(metrics.rateLimitHits).toBe(0);
    expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    expect(metrics.uptimeFormatted).toMatch(/\d+h \d+m \d+s/);
  });

  test('metricsMiddleware tracks requests', () => {
    metricsMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));

    // Simulate request completion
    if (finishCallback) finishCallback();

    const metrics = getMetrics();
    expect(metrics.totalRequests).toBe(1);
    expect(metrics.statusCodes[200]).toBe(1);
  });

  test('metricsMiddleware tracks errors (4xx/5xx)', () => {
    mockRes.statusCode = 500;
    metricsMiddleware(mockReq as Request, mockRes as Response, mockNext);
    if (finishCallback) finishCallback();

    const metrics = getMetrics();
    expect(metrics.totalRequests).toBe(1);
    expect(metrics.totalErrors).toBe(1);
    expect(metrics.errorRate).toBe('100.00%');
  });

  test('metricsMiddleware tracks rate limit hits (429)', () => {
    mockRes.statusCode = 429;
    metricsMiddleware(mockReq as Request, mockRes as Response, mockNext);
    if (finishCallback) finishCallback();

    const metrics = getMetrics();
    expect(metrics.rateLimitHits).toBe(1);
    expect(metrics.statusCodes[429]).toBe(1);
  });

  test('metricsMiddleware tracks per-endpoint stats', () => {
    // First request
    metricsMiddleware(mockReq as Request, mockRes as Response, mockNext);
    if (finishCallback) finishCallback();

    // Second request to same endpoint
    metricsMiddleware(mockReq as Request, mockRes as Response, mockNext);
    if (finishCallback) finishCallback();

    const metrics = getMetrics();
    const endpoint = metrics.endpoints['GET /test'];

    expect(endpoint).toBeDefined();
    expect(endpoint.count).toBe(2);
    expect(endpoint.errors).toBe(0);
    expect(endpoint.avgMs).toBeGreaterThanOrEqual(0);
  });

  test('resetMetrics clears all data', () => {
    // Add some data
    metricsMiddleware(mockReq as Request, mockRes as Response, mockNext);
    if (finishCallback) finishCallback();

    let metrics = getMetrics();
    expect(metrics.totalRequests).toBe(1);

    // Reset
    resetMetrics();

    metrics = getMetrics();
    expect(metrics.totalRequests).toBe(0);
    expect(metrics.totalErrors).toBe(0);
    expect(Object.keys(metrics.endpoints)).toHaveLength(0);
    expect(Object.keys(metrics.statusCodes)).toHaveLength(0);
  });
});
