import { Request, Response, NextFunction } from 'express';

interface EndpointMetrics {
  count: number;
  errors: number;
  totalMs: number;
}

interface Metrics {
  startTime: number;
  totalRequests: number;
  totalErrors: number;
  endpoints: Record<string, EndpointMetrics>;
  statusCodes: Record<number, number>;
  rateLimitHits: number;
}

const metrics: Metrics = {
  startTime: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
  endpoints: {},
  statusCodes: {},
  rateLimitHits: 0,
};

/** Middleware to track request metrics */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const endpoint = `${req.method} ${req.route?.path || req.path}`;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    metrics.totalRequests++;
    metrics.statusCodes[statusCode] = (metrics.statusCodes[statusCode] || 0) + 1;

    if (!metrics.endpoints[endpoint]) {
      metrics.endpoints[endpoint] = { count: 0, errors: 0, totalMs: 0 };
    }
    metrics.endpoints[endpoint].count++;
    metrics.endpoints[endpoint].totalMs += duration;

    if (statusCode >= 400) {
      metrics.totalErrors++;
      metrics.endpoints[endpoint].errors++;
    }

    if (statusCode === 429) {
      metrics.rateLimitHits++;
    }
  });

  next();
}

/** Get current metrics snapshot */
export function getMetrics(): {
  uptime: number;
  uptimeFormatted: string;
  totalRequests: number;
  totalErrors: number;
  errorRate: string;
  rateLimitHits: number;
  endpoints: Record<string, { count: number; errors: number; avgMs: number }>;
  statusCodes: Record<number, number>;
} {
  const uptimeMs = Date.now() - metrics.startTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  const endpointStats: Record<string, { count: number; errors: number; avgMs: number }> = {};
  for (const [endpoint, data] of Object.entries(metrics.endpoints)) {
    endpointStats[endpoint] = {
      count: data.count,
      errors: data.errors,
      avgMs: data.count > 0 ? Math.round(data.totalMs / data.count) : 0,
    };
  }

  const errorRate =
    metrics.totalRequests > 0
      ? ((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(2) + '%'
      : '0%';

  return {
    uptime: uptimeMs,
    uptimeFormatted: `${hours}h ${minutes}m ${seconds}s`,
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    errorRate,
    rateLimitHits: metrics.rateLimitHits,
    endpoints: endpointStats,
    statusCodes: metrics.statusCodes,
  };
}

/** Reset metrics (useful for tests) */
export function resetMetrics(): void {
  metrics.startTime = Date.now();
  metrics.totalRequests = 0;
  metrics.totalErrors = 0;
  metrics.endpoints = {};
  metrics.statusCodes = {};
  metrics.rateLimitHits = 0;
}
