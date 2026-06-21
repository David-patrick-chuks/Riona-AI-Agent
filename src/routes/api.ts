import express, { Request, Response, NextFunction } from 'express';
import {
  getIgClient,
  closeIgClient,
  scrapeFollowersHandler,
  getIgClientStatus,
  getIgClientsSnapshot,
} from '../client/Instagram';
import {
  getPosterClient,
  schedulePhotoPost,
  cancelScheduledPost,
  listScheduledPosts,
} from '../client/InstagramPoster';
import logger from '../config/logger';
import { isDbConnected } from '../config/db';
import { signToken, verifyToken, getTokenFromRequest } from '../secret';
import { geminiApiKeys } from '../secret';
import { getLastRunSummary } from '../utils/igRunSummary';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { getAccount, getAccountsMap } from '../config/accounts';
import { getActionSummary, listActionLogs, logAction } from '../services/actionLog';
import {
  loginLimiter,
  actionLimiter,
  dmLimiter,
  scrapeLimiter,
  generalLimiter,
} from '../middleware/rateLimit';
import { getMetrics } from '../services/metrics';
import { sanitizeFilename, validateInputLength } from '../utils';

const router = express.Router();

// Apply general rate limiter to all API routes
router.use(generalLimiter);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// JWT Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const payload = verifyToken(token);
  if (!payload || typeof payload !== 'object' || !('username' in payload)) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  (req as any).user = {
    username: payload.username,
    account: (payload as any).account || 'default',
  };
  next();
}

// Status endpoint
router.get('/status', (_req: Request, res: Response) => {
  const status = {
    dbConnected: isDbConnected(),
  };
  return res.json(status);
});

// Health endpoint — public minimal payload; full details when authenticated
router.get('/health', (req: Request, res: Response) => {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyToken(token) : null;
  const isAuthenticated = !!payload && typeof payload === 'object' && 'username' in payload;

  if (!isAuthenticated) {
    return res.json({
      ok: true,
      dbConnected: isDbConnected(),
    });
  }

  const accountQuery = typeof req.query.account === 'string' ? req.query.account : null;
  const allQuery = req.query.all === '1' || req.query.all === 'true';
  const accountsMap = getAccountsMap();
  const accountKeys = new Set<string>(['default', ...Object.keys(accountsMap || {})]);

  if (accountQuery) {
    return res.json({
      ok: true,
      dbConnected: isDbConnected(),
      account: accountQuery,
      accountConfigured: !!accountsMap?.[accountQuery],
      igClient: getIgClientStatus(accountQuery),
      igClients: getIgClientsSnapshot(),
      geminiKeys: geminiApiKeys.length,
      lastIgRun: getLastRunSummary(),
    });
  }

  if (allQuery) {
    const perAccount: Record<
      string,
      { configured: boolean; igClient: ReturnType<typeof getIgClientStatus> }
    > = {};
    for (const key of accountKeys) {
      perAccount[key] = {
        configured: !!accountsMap?.[key],
        igClient: getIgClientStatus(key),
      };
    }
    return res.json({
      ok: true,
      dbConnected: isDbConnected(),
      igClient: getIgClientStatus('default'),
      igClients: getIgClientsSnapshot(),
      accounts: perAccount,
      geminiKeys: geminiApiKeys.length,
      lastIgRun: getLastRunSummary(),
    });
  }

  return res.json({
    ok: true,
    dbConnected: isDbConnected(),
    igClient: getIgClientStatus('default'),
    igClients: getIgClientsSnapshot(),
    accounts: Array.from(accountKeys),
    geminiKeys: geminiApiKeys.length,
    lastIgRun: getLastRunSummary(),
  });
});

// Metrics endpoint — returns server performance metrics (auth required for detailed data)
router.get('/metrics', (req: Request, res: Response) => {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyToken(token) : null;
  const isAuthenticated = !!payload && typeof payload === 'object' && 'username' in payload;

  const metrics = getMetrics();

  if (!isAuthenticated) {
    // Public: only basic uptime info
    return res.json({
      ok: true,
      uptime: metrics.uptime,
      uptimeFormatted: metrics.uptimeFormatted,
    });
  }

  // Authenticated: full metrics
  return res.json(metrics);
});

// Login endpoint (rate limited to prevent brute force)
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password, account } = req.body;
    const acct = account ? String(account) : undefined;
    let u = username;
    let p = password;
    if (!u || !p) {
      const fromFile = acct ? getAccount(acct) : null;
      if (fromFile) {
        u = fromFile.username;
        p = fromFile.password;
      }
    }
    if (!u || !p) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    await getIgClient(u, p, acct || 'default');
    // Sign JWT and set as httpOnly cookie
    const token = signToken({ username: u, account: acct || 'default' });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
      secure: process.env.NODE_ENV === 'production',
    });
    await logAction({
      platform: 'instagram',
      action: 'login',
      status: 'success',
      account: acct || 'default',
      username: u,
    });
    return res.json({ message: 'Login successful' });
  } catch (error) {
    logger.error('Login error:', error);
    await logAction({
      platform: 'instagram',
      action: 'login',
      status: 'error',
      account: req.body?.account ? String(req.body.account) : 'default',
      username: req.body?.username ? String(req.body.username) : undefined,
      error: getErrorMessage(error),
    });
    return res.status(500).json({ error: 'Failed to login' });
  }
});

// Auth check endpoint
router.get('/me', (req: Request, res: Response) => {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const payload = verifyToken(token);
  if (!payload || typeof payload !== 'object' || !('username' in payload)) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  return res.json({ username: payload.username, account: (payload as any).account || 'default' });
});

// All routes below require authentication
router.use(requireAuth);

// Endpoint to clear Instagram cookies (authenticated)
router.delete('/clear-cookies', async (req, res) => {
  const account = (req as any).user?.account || 'default';
  const { getInstagramCookiesPath } = await import('../utils');
  const cookiesPath = path.join(
    process.cwd(),
    getInstagramCookiesPath(account).replace(/^\.\//, ''),
  );
  try {
    await fs.unlink(cookiesPath);
    await logAction({
      platform: 'instagram',
      action: 'clear-cookies',
      status: 'success',
      account,
      username: (req as any).user?.username,
    });
    res.json({ success: true, message: 'Instagram cookies cleared.' });
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      await logAction({
        platform: 'instagram',
        action: 'clear-cookies',
        status: 'success',
        account,
        username: (req as any).user?.username,
        details: { message: 'No cookies to clear.' },
      });
      res.json({ success: true, message: 'No cookies to clear.' });
    } else {
      await logAction({
        platform: 'instagram',
        action: 'clear-cookies',
        status: 'error',
        account,
        username: (req as any).user?.username,
        error: getErrorMessage(err),
      });
      res
        .status(500)
        .json({ success: false, message: 'Failed to clear cookies.', error: err.message });
    }
  }
});

// Interact with posts endpoint (rate limited)
router.post('/interact', actionLimiter, async (req: Request, res: Response) => {
  try {
    const account = (req as any).user.account || 'default';
    const igClient = await getIgClient((req as any).user.username, undefined, account);
    await igClient.interactWithPosts();
    await logAction({
      platform: 'instagram',
      action: 'interact',
      status: 'success',
      account,
      username: (req as any).user.username,
    });
    return res.json({ message: 'Interaction successful' });
  } catch (error) {
    logger.error('Interaction error:', error);
    await logAction({
      platform: 'instagram',
      action: 'interact',
      status: 'error',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      error: getErrorMessage(error),
    });
    return res.status(500).json({ error: 'Failed to interact with posts' });
  }
});

// Send direct message endpoint (strict rate limit to prevent spam)
router.post('/dm', dmLimiter, async (req: Request, res: Response) => {
  try {
    const { username, message } = req.body;
    if (!username || !message) {
      return res.status(400).json({ error: 'Username and message are required' });
    }
    // Validate input lengths
    const usernameValidation = validateInputLength(username, 'username');
    if (!usernameValidation.valid) {
      return res.status(400).json({ error: usernameValidation.error });
    }
    const messageValidation = validateInputLength(message, 'message');
    if (!messageValidation.valid) {
      return res.status(400).json({ error: messageValidation.error });
    }
    const account = (req as any).user.account || 'default';
    const igClient = await getIgClient((req as any).user.username, undefined, account);
    await igClient.sendDirectMessage(username, message);
    await logAction({
      platform: 'instagram',
      action: 'dm',
      status: 'success',
      account,
      username: (req as any).user.username,
      details: { targetUsername: username },
    });
    return res.json({ message: 'Message sent successfully' });
  } catch (error) {
    logger.error('DM error:', error);
    await logAction({
      platform: 'instagram',
      action: 'dm',
      status: 'error',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      error: getErrorMessage(error),
    });
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// Send messages from file endpoint (strict rate limit to prevent spam)
router.post('/dm-file', dmLimiter, async (req: Request, res: Response) => {
  try {
    const { file, message, mediaPath } = req.body;
    if (!file || !message) {
      return res.status(400).json({ error: 'File and message are required' });
    }
    // Validate message length
    const messageValidation = validateInputLength(message, 'message');
    if (!messageValidation.valid) {
      return res.status(400).json({ error: messageValidation.error });
    }
    const account = (req as any).user.account || 'default';
    const igClient = await getIgClient((req as any).user.username, undefined, account);
    await igClient.sendDirectMessagesFromFile(file, message, mediaPath);
    await logAction({
      platform: 'instagram',
      action: 'dm-file',
      status: 'success',
      account,
      username: (req as any).user.username,
      details: { file },
    });
    return res.json({ message: 'Messages sent successfully' });
  } catch (error) {
    logger.error('File DM error:', error);
    await logAction({
      platform: 'instagram',
      action: 'dm-file',
      status: 'error',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      error: getErrorMessage(error),
    });
    return res.status(500).json({ error: 'Failed to send messages from file' });
  }
});

// Post photo endpoint (Instagram API client, rate limited)
router.post('/post-photo', actionLimiter, async (req: Request, res: Response) => {
  try {
    const { imageUrl, caption } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }
    // Validate caption length if provided
    if (caption) {
      const captionValidation = validateInputLength(caption, 'caption');
      if (!captionValidation.valid) {
        return res.status(400).json({ error: captionValidation.error });
      }
    }
    const account = (req as any).user.account || 'default';
    const client = await getPosterClient(undefined, undefined, account);
    const result = await client.postPhoto(imageUrl, caption || '');
    await logAction({
      platform: 'instagram',
      action: 'post-photo',
      status: 'success',
      account,
      username: (req as any).user.username,
      details: { imageUrl },
    });
    return res.json({ success: true, result });
  } catch (error) {
    logger.error('Post photo error:', error);
    await logAction({
      platform: 'instagram',
      action: 'post-photo',
      status: 'error',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      error: getErrorMessage(error),
    });
    return res.status(500).json({ error: 'Failed to post photo' });
  }
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Post photo from file (multipart, rate limited)
router.post(
  '/post-photo-file',
  actionLimiter,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const caption = req.body?.caption || '';
      if (!file || !file.buffer) {
        return res.status(400).json({ error: 'image file is required' });
      }
      if (!file.mimetype || !ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return res.status(400).json({
          error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
        });
      }
      // Validate caption length if provided
      if (caption) {
        const captionValidation = validateInputLength(caption, 'caption');
        if (!captionValidation.valid) {
          return res.status(400).json({ error: captionValidation.error });
        }
      }
      const account = (req as any).user.account || 'default';
      const client = await getPosterClient(undefined, undefined, account);
      const result = await client.postPhotoBuffer(file.buffer, caption);
      await logAction({
        platform: 'instagram',
        action: 'post-photo-file',
        status: 'success',
        account,
        username: (req as any).user.username,
        details: { filename: file.originalname, size: file.size },
      });
      return res.json({ success: true, result });
    } catch (error) {
      logger.error('Post photo file error:', error);
      await logAction({
        platform: 'instagram',
        action: 'post-photo-file',
        status: 'error',
        account: (req as any).user.account || 'default',
        username: (req as any).user.username,
        error: getErrorMessage(error),
      });
      return res.status(500).json({ error: 'Failed to post photo file' });
    }
  },
);

// Schedule photo post endpoint (cron syntax)
router.post('/schedule-post', async (req: Request, res: Response) => {
  try {
    const { imageUrl, caption, cronTime } = req.body;
    if (!imageUrl || !cronTime) {
      return res.status(400).json({ error: 'imageUrl and cronTime are required' });
    }
    // Validate caption length if provided
    if (caption) {
      const captionValidation = validateInputLength(caption, 'caption');
      if (!captionValidation.valid) {
        return res.status(400).json({ error: captionValidation.error });
      }
    }
    const account = (req as any).user.account || 'default';
    const jobId = await schedulePhotoPost(imageUrl, caption || '', cronTime, account);
    await logAction({
      platform: 'instagram',
      action: 'schedule-post',
      status: 'success',
      account,
      username: (req as any).user.username,
      details: { imageUrl, cronTime, jobId },
    });
    return res.json({ success: true, message: 'Post scheduled', jobId });
  } catch (error) {
    logger.error('Schedule post error:', error);
    await logAction({
      platform: 'instagram',
      action: 'schedule-post',
      status: 'error',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      error: getErrorMessage(error),
    });
    return res.status(500).json({ error: 'Failed to schedule post' });
  }
});

router.get('/scheduled-posts', async (req: Request, res: Response) => {
  try {
    const account = (req as any).user.account || 'default';
    const jobs = listScheduledPosts(account);
    return res.json({ jobs });
  } catch (error) {
    logger.error('List scheduled posts error:', error);
    return res.status(500).json({ error: 'Failed to list scheduled posts' });
  }
});

router.delete('/scheduled-posts/:jobId', async (req: Request, res: Response) => {
  try {
    const account = (req as any).user.account || 'default';
    const jobId = String(req.params.jobId);
    const jobs = listScheduledPosts(account);
    if (!jobs.some((job) => job.id === jobId)) {
      return res.status(404).json({ error: 'Scheduled post not found for this account' });
    }
    const cancelled = cancelScheduledPost(jobId);
    if (!cancelled) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }
    await logAction({
      platform: 'instagram',
      action: 'cancel-scheduled-post',
      status: 'success',
      account,
      username: (req as any).user.username,
      details: { jobId },
    });
    return res.json({ success: true, jobId });
  } catch (error) {
    logger.error('Cancel scheduled post error:', error);
    return res.status(500).json({ error: 'Failed to cancel scheduled post' });
  }
});

// Scrape followers endpoint (rate limited - resource intensive)
router.post('/scrape-followers', scrapeLimiter, async (req: Request, res: Response) => {
  const { targetAccount, maxFollowers } = req.body;
  const account = (req as any).user.account || 'default';
  const acct = getAccount(account);
  try {
    const result = await scrapeFollowersHandler(
      targetAccount,
      maxFollowers,
      acct?.username || (req as any).user.username,
      acct?.password,
      account,
    );
    await logAction({
      platform: 'instagram',
      action: 'scrape-followers',
      status: 'success',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      details: { targetAccount, maxFollowers: Number(maxFollowers) || undefined },
    });
    if (Array.isArray(result)) {
      if (req.query.download === '1') {
        // Sanitize filename to prevent path traversal and header injection
        const safeAccountName = sanitizeFilename(String(targetAccount));
        const filename = `${safeAccountName}_followers.txt`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/plain');
        res.send(result.join('\n'));
      } else {
        res.json({ success: true, followers: result });
      }
    } else {
      res.json({ success: true, result });
    }
  } catch (error) {
    await logAction({
      platform: 'instagram',
      action: 'scrape-followers',
      status: 'error',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      error: getErrorMessage(error),
    });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET handler for scrape-followers to support file download (rate limited)
router.get('/scrape-followers', scrapeLimiter, async (req: Request, res: Response) => {
  const { targetAccount, maxFollowers: rawMaxFollowers } = req.query;
  const parsedMaxFollowers = Number(rawMaxFollowers);
  const maxFollowers =
    Number.isFinite(parsedMaxFollowers) && parsedMaxFollowers > 0 ? parsedMaxFollowers : 100;
  const account = (req as any).user.account || 'default';
  const acct = getAccount(account);
  try {
    const result = await scrapeFollowersHandler(
      String(targetAccount),
      maxFollowers,
      acct?.username || (req as any).user.username,
      acct?.password,
      account,
    );
    await logAction({
      platform: 'instagram',
      action: 'scrape-followers-download',
      status: 'success',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      details: {
        targetAccount: String(targetAccount),
        maxFollowers,
      },
    });
    if (Array.isArray(result)) {
      // Sanitize filename to prevent path traversal and header injection
      const safeAccountName = sanitizeFilename(String(targetAccount));
      const filename = `${safeAccountName}_followers.txt`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/plain');
      res.send(result.join('\n'));
    } else {
      res.status(400).send('No followers found.');
    }
  } catch (error) {
    await logAction({
      platform: 'instagram',
      action: 'scrape-followers-download',
      status: 'error',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      error: getErrorMessage(error),
    });
    res.status(500).send('Error scraping followers.');
  }
});

router.get('/actions', async (req: Request, res: Response) => {
  try {
    // Parse pagination params
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20;
    const rawOffset = Number(req.query.offset);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    // Parse filter params
    const account = typeof req.query.account === 'string' ? req.query.account : undefined;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const status =
      req.query.status === 'success' || req.query.status === 'error' ? req.query.status : undefined;
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;
    const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : undefined;
    const errorKeyword =
      typeof req.query.errorKeyword === 'string' ? req.query.errorKeyword : undefined;
    const sort = req.query.sort === 'asc' ? 'asc' : 'desc';

    const result = await listActionLogs({
      limit,
      offset,
      account,
      platform,
      status,
      action,
      fromDate,
      toDate,
      errorKeyword,
      sort,
    });

    return res.json(result);
  } catch (error) {
    logger.error('Actions listing error:', error);
    return res.status(500).json({ error: 'Failed to load action logs' });
  }
});

router.get('/actions/summary', async (req: Request, res: Response) => {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 50;
    const account = typeof req.query.account === 'string' ? req.query.account : undefined;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const summary = await getActionSummary({ limit, account, platform });
    return res.json(summary);
  } catch (error) {
    logger.error('Actions summary error:', error);
    return res.status(500).json({ error: 'Failed to load action summary' });
  }
});

// Helper to calculate date range presets
const getDateRangePreset = (preset: string): { fromDate: string; toDate: string } | undefined => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return {
        fromDate: today.toISOString(),
        toDate: now.toISOString(),
      };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        fromDate: yesterday.toISOString(),
        toDate: today.toISOString(),
      };
    }
    case 'last7days': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return {
        fromDate: weekAgo.toISOString(),
        toDate: now.toISOString(),
      };
    }
    case 'last30days': {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return {
        fromDate: monthAgo.toISOString(),
        toDate: now.toISOString(),
      };
    }
    default:
      return undefined;
  }
};

// Get action log statistics/counts
router.get('/actions/stats', async (req: Request, res: Response) => {
  try {
    const account = typeof req.query.account === 'string' ? req.query.account : undefined;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;

    // Get date range preset if provided
    const datePreset = typeof req.query.dateRange === 'string' ? req.query.dateRange : undefined;
    const presetDates = datePreset ? getDateRangePreset(datePreset) : undefined;
    const fromDate =
      typeof req.query.fromDate === 'string' ? req.query.fromDate : presetDates?.fromDate;
    const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : presetDates?.toDate;

    // Get counts for each status
    const [successResult, errorResult, totalResult] = await Promise.all([
      listActionLogs({ limit: 1, account, platform, status: 'success', fromDate, toDate }),
      listActionLogs({ limit: 1, account, platform, status: 'error', fromDate, toDate }),
      listActionLogs({ limit: 1, account, platform, fromDate, toDate }),
    ]);

    // Get breakdown by action type
    const summary = await getActionSummary({ limit: 500, account, platform });

    return res.json({
      total: totalResult.pagination.total,
      success: successResult.pagination.total,
      error: errorResult.pagination.total,
      successRate:
        totalResult.pagination.total > 0
          ? `${((successResult.pagination.total / totalResult.pagination.total) * 100).toFixed(1)}%`
          : '0%',
      byAction: summary.byAction,
      byPlatform: summary.byPlatform,
      dateRange: presetDates ? { preset: datePreset, ...presetDates } : { fromDate, toDate },
    });
  } catch (error) {
    logger.error('Actions stats error:', error);
    return res.status(500).json({ error: 'Failed to load action stats' });
  }
});

// Export action logs as CSV or JSON file
router.get('/actions/export', async (req: Request, res: Response) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 1000) : 500;

    // Parse filter params (same as /actions)
    const account = typeof req.query.account === 'string' ? req.query.account : undefined;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const status =
      req.query.status === 'success' || req.query.status === 'error' ? req.query.status : undefined;
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;

    // Support date range presets
    const datePreset = typeof req.query.dateRange === 'string' ? req.query.dateRange : undefined;
    const presetDates = datePreset ? getDateRangePreset(datePreset) : undefined;
    const fromDate =
      typeof req.query.fromDate === 'string' ? req.query.fromDate : presetDates?.fromDate;
    const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : presetDates?.toDate;

    const result = await listActionLogs({
      limit,
      offset: 0,
      account,
      platform,
      status,
      action,
      fromDate,
      toDate,
      sort: 'desc',
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `action-logs-${timestamp}.${format}`;

    if (format === 'csv') {
      // Generate CSV with all fields
      const headers = [
        'id',
        'createdAt',
        'platform',
        'action',
        'account',
        'username',
        'status',
        'error',
        'details',
      ];
      const csvRows = [headers.join(',')];

      for (const log of result.actions) {
        const row = [
          log.id,
          log.createdAt,
          log.platform,
          log.action,
          log.account,
          log.username || '',
          log.status,
          log.error ? `"${log.error.replace(/"/g, '""')}"` : '',
          log.details ? `"${JSON.stringify(log.details).replace(/"/g, '""')}"` : '',
        ];
        csvRows.push(row.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvRows.join('\n'));
    }

    // JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.json({
      exportedAt: new Date().toISOString(),
      totalRecords: result.actions.length,
      filters: { account, platform, status, action, fromDate, toDate, dateRange: datePreset },
      actions: result.actions,
    });
  } catch (error) {
    logger.error('Actions export error:', error);
    return res.status(500).json({ error: 'Failed to export action logs' });
  }
});

// Bulk delete old action logs (admin cleanup)
router.delete('/actions/cleanup', async (req: Request, res: Response) => {
  try {
    const daysOld = Number(req.query.daysOld);
    if (!Number.isFinite(daysOld) || daysOld < 7) {
      return res.status(400).json({
        error: 'daysOld must be a number >= 7 to prevent accidental data loss',
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Get count of logs to be deleted
    const oldLogs = await listActionLogs({
      limit: 1,
      toDate: cutoffDate.toISOString(),
    });

    const countToDelete = oldLogs.pagination.total;

    // For safety, this endpoint only reports what would be deleted
    // Actual deletion would require database access which varies by backend
    return res.json({
      dryRun: true,
      message: `Found ${countToDelete} action logs older than ${daysOld} days`,
      cutoffDate: cutoffDate.toISOString(),
      recordsToDelete: countToDelete,
      note: 'Actual deletion requires direct database access. Use this for planning cleanup operations.',
    });
  } catch (error) {
    logger.error('Actions cleanup error:', error);
    return res.status(500).json({ error: 'Failed to analyze cleanup' });
  }
});

// Exit endpoint
router.post('/exit-interactions', async (_req: Request, res: Response) => {
  const { setShouldExitInteractions } = await import('../api/agent');
  setShouldExitInteractions(true);
  return res.json({ success: true, message: 'Exiting interactions requested.' });
});

// Exit endpoint
router.post('/exit', async (req: Request, res: Response) => {
  try {
    const account = (req as any).user?.account || 'default';
    await closeIgClient(account);
    await logAction({
      platform: 'instagram',
      action: 'exit',
      status: 'success',
      account,
      username: (req as any).user?.username,
    });
    return res.json({ message: 'Exiting successfully' });
  } catch (error) {
    logger.error('Exit error:', error);
    await logAction({
      platform: 'instagram',
      action: 'exit',
      status: 'error',
      account: (req as any).user?.account || 'default',
      username: (req as any).user?.username,
      error: getErrorMessage(error),
    });
    return res.status(500).json({ error: 'Failed to exit gracefully' });
  }
});

// Trigger cooldown manually
router.post('/cooldown', async (req: Request, res: Response) => {
  try {
    const minutes = Number(req.body?.minutes ?? 60);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return res.status(400).json({ error: 'minutes must be a positive number' });
    }
    const { setIgCooldown } = await import('../utils');
    await setIgCooldown(minutes);
    await logAction({
      platform: 'instagram',
      action: 'cooldown',
      status: 'success',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      details: { minutes },
    });
    return res.json({ success: true, untilMinutes: minutes });
  } catch (error) {
    logger.error('Cooldown error:', error);
    await logAction({
      platform: 'instagram',
      action: 'cooldown',
      status: 'error',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      error: getErrorMessage(error),
    });
    return res.status(500).json({ error: 'Failed to set cooldown' });
  }
});

// Logout endpoint
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  void logAction({
    platform: 'system',
    action: 'logout',
    status: 'success',
    account: (req as any).user?.account || 'default',
    username: (req as any).user?.username,
  });
  return res.json({ message: 'Logged out successfully' });
});

export default router;
