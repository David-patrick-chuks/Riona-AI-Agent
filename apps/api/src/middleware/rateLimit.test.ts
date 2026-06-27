import { Request, Response, NextFunction } from 'express';
import { createRateLimiter, stopCleanupInterval, clearAllStores } from './rateLimit';

describe('rateLimit middleware', () => {
  afterAll(() => {
    stopCleanupInterval();
  });

  afterEach(() => {
    clearAllStores();
  });

  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let headers: Record<string, string>;

  beforeEach(() => {
    headers = {};
    mockReq = {
      ip: '127.0.0.1',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' } as any,
    };
    mockRes = {
      setHeader: jest.fn((key: string, value: string) => {
        headers[key] = value;
        return mockRes as Response;
      }),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test('allows requests within limit', () => {
    const limiter = createRateLimiter('test-allow', {
      windowMs: 60000,
      maxRequests: 5,
    });

    limiter(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(headers['X-RateLimit-Limit']).toBe('5');
    expect(headers['X-RateLimit-Remaining']).toBe('4');
  });

  test('blocks requests exceeding limit', () => {
    const limiter = createRateLimiter('test-block', {
      windowMs: 60000,
      maxRequests: 2,
    });

    // First two requests pass
    limiter(mockReq as Request, mockRes as Response, mockNext);
    limiter(mockReq as Request, mockRes as Response, mockNext);

    // Third request should be blocked
    limiter(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(String),
        retryAfter: expect.any(Number),
      }),
    );
  });

  test('uses custom key generator', () => {
    const limiter = createRateLimiter('test-custom-key', {
      windowMs: 60000,
      maxRequests: 2,
      keyGenerator: () => 'custom-key',
    });

    // Different IPs but same custom key
    (mockReq as any).ip = '192.168.1.1';
    limiter(mockReq as Request, mockRes as Response, mockNext);

    (mockReq as any).ip = '192.168.1.2';
    limiter(mockReq as Request, mockRes as Response, mockNext);

    // Third request with different IP but same key should be blocked
    (mockReq as any).ip = '192.168.1.3';
    limiter(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(429);
  });

  test('skip function bypasses rate limiting', () => {
    const limiter = createRateLimiter('test-skip', {
      windowMs: 60000,
      maxRequests: 1,
      skip: () => true,
    });

    // Should pass despite limit of 1
    limiter(mockReq as Request, mockRes as Response, mockNext);
    limiter(mockReq as Request, mockRes as Response, mockNext);
    limiter(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(3);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test('extracts IP from X-Forwarded-For header', () => {
    const limiter = createRateLimiter('test-forwarded', {
      windowMs: 60000,
      maxRequests: 1,
    });

    mockReq.headers = { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' };
    limiter(mockReq as Request, mockRes as Response, mockNext);

    // Different forwarded IP should have separate limit
    mockReq.headers = { 'x-forwarded-for': '10.0.0.3' };
    limiter(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(2);
  });

  test('sets Retry-After header when limit exceeded', () => {
    const limiter = createRateLimiter('test-retry-after', {
      windowMs: 60000,
      maxRequests: 1,
    });

    limiter(mockReq as Request, mockRes as Response, mockNext);
    limiter(mockReq as Request, mockRes as Response, mockNext);

    expect(headers['Retry-After']).toBeDefined();
    expect(Number(headers['Retry-After'])).toBeGreaterThan(0);
  });

  test('uses custom error message', () => {
    const customMessage = 'Custom rate limit message';
    const limiter = createRateLimiter('test-custom-msg', {
      windowMs: 60000,
      maxRequests: 1,
      message: customMessage,
    });

    limiter(mockReq as Request, mockRes as Response, mockNext);
    limiter(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: customMessage,
      }),
    );
  });
});
