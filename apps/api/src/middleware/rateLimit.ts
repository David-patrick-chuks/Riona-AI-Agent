import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipFailedRequests?: boolean; // Don't count failed requests
  skip?: (req: Request) => boolean; // Skip rate limiting for certain requests
}

// In-memory stores for different rate limit types
const stores: { [name: string]: RateLimitStore } = {};

// Cleanup old entries periodically (every 5 minutes)
const cleanupInterval = setInterval(
  () => {
    const now = Date.now();
    for (const storeName of Object.keys(stores)) {
      const store = stores[storeName];
      for (const key of Object.keys(store)) {
        if (store[key].resetTime < now) {
          delete store[key];
        }
      }
    }
  },
  5 * 60 * 1000,
);

/** Stop the cleanup interval (useful for tests) */
export function stopCleanupInterval(): void {
  clearInterval(cleanupInterval);
}

/** Clear all rate limit stores (useful for tests) */
export function clearAllStores(): void {
  for (const key of Object.keys(stores)) {
    delete stores[key];
  }
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header if behind proxy, otherwise uses IP
 */
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * Get authenticated user identifier if available
 */
const getAuthenticatedUser = (req: Request): string | null => {
  const user = (req as any).user;
  if (user && user.username) {
    return `user:${user.username}:${user.account || 'default'}`;
  }
  return null;
};

/**
 * Creates a rate limiting middleware
 * @param name - Unique name for this rate limiter (used for storage)
 * @param config - Rate limit configuration
 */
export function createRateLimiter(name: string, config: RateLimitConfig) {
  // Initialize store for this limiter
  if (!stores[name]) {
    stores[name] = {};
  }
  const store = stores[name];

  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req: Request) => getClientIp(req),
    skip,
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    // Check if we should skip this request
    if (skip && skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create entry
    let entry = store[key];
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      store[key] = entry;
    }

    // Increment count
    entry.count++;

    // Calculate remaining requests and reset time
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', String(resetSeconds));
      logger.warn(`Rate limit exceeded for ${name}: ${key} (${entry.count}/${maxRequests})`);
      return res.status(429).json({
        error: message,
        retryAfter: resetSeconds,
      });
    }

    next();
  };
}

// ==================== Pre-configured Rate Limiters ====================

/**
 * Rate limiter for login attempts
 * Default: 5 attempts per 15 minutes per IP
 */
export const loginLimiter = createRateLimiter('login', {
  windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  maxRequests: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 5,
  message: 'Too many login attempts. Please try again later.',
  keyGenerator: getClientIp,
});

/**
 * Rate limiter for authenticated API actions (interact, DM, post)
 * Default: 10 requests per minute per user
 */
export const actionLimiter = createRateLimiter('action', {
  windowMs: Number(process.env.RATE_LIMIT_ACTION_WINDOW_MS) || 60 * 1000, // 1 minute
  maxRequests: Number(process.env.RATE_LIMIT_ACTION_MAX) || 10,
  message: 'Too many actions. Please slow down.',
  keyGenerator: (req: Request) => {
    // Use authenticated user if available, otherwise fall back to IP
    return getAuthenticatedUser(req) || getClientIp(req);
  },
});

/**
 * Rate limiter for DM sending (stricter to prevent spam)
 * Default: 3 DMs per minute per user
 */
export const dmLimiter = createRateLimiter('dm', {
  windowMs: Number(process.env.RATE_LIMIT_DM_WINDOW_MS) || 60 * 1000, // 1 minute
  maxRequests: Number(process.env.RATE_LIMIT_DM_MAX) || 3,
  message: 'Too many direct messages. Please wait before sending more.',
  keyGenerator: (req: Request) => {
    return getAuthenticatedUser(req) || getClientIp(req);
  },
});

/**
 * Rate limiter for scraping operations (resource intensive)
 * Default: 2 scrapes per 5 minutes per user
 */
export const scrapeLimiter = createRateLimiter('scrape', {
  windowMs: Number(process.env.RATE_LIMIT_SCRAPE_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
  maxRequests: Number(process.env.RATE_LIMIT_SCRAPE_MAX) || 2,
  message: 'Scraping rate limit reached. Please wait before scraping again.',
  keyGenerator: (req: Request) => {
    return getAuthenticatedUser(req) || getClientIp(req);
  },
});

/**
 * General API rate limiter for all other endpoints
 * Default: 60 requests per minute per IP
 */
export const generalLimiter = createRateLimiter('general', {
  windowMs: Number(process.env.RATE_LIMIT_GENERAL_WINDOW_MS) || 60 * 1000, // 1 minute
  maxRequests: Number(process.env.RATE_LIMIT_GENERAL_MAX) || 60,
  message: 'Too many requests. Please try again later.',
  keyGenerator: getClientIp,
});
