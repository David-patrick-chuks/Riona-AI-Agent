import { Router, Request, Response } from 'express';
import { listActionLogs } from '../../services/actionLog';

const router = Router();

/**
 * GET /api/actions/unified
 * Returns a merged, paginated action log from Instagram and Twitter actions
 * in a single consistent JSON schema.
 *
 * Query params:
 *   - limit: number of results per page (default 20, max 100)
 *   - offset: pagination offset (default 0)
 *   - platform: filter by platform ("instagram" | "twitter")
 *   - status: filter by status ("success" | "error")
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20;
    const rawOffset = Number(req.query.offset);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const status = req.query.status === 'success' || req.query.status === 'error'
      ? req.query.status
      : undefined;

    const result = await listActionLogs({
      limit: Math.min(Math.max(limit, 1), 100),
      offset,
      platform,
      status,
    });

    // Normalize to consistent shape: platform, action, timestamp, status, metadata
    const unifiedActions = result.actions.map((a) => ({
      platform: a.platform,
      action: a.action,
      timestamp: a.createdAt,
      status: a.status,
      metadata: {
        account: a.account,
        ...(a.username && { username: a.username }),
        ...(a.error && { error: a.error }),
        ...(a.details && { details: a.details }),
      },
    }));

    return res.status(200).json({
      actions: unifiedActions,
      pagination: {
        total: result.pagination.total,
        limit: result.pagination.limit,
        offset: result.pagination.offset,
        hasMore: result.pagination.hasMore,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Failed to load unified action logs';
    return res.status(500).json({ error: errMsg });
  }
});

export default router;
