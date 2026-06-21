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
import { postTweet, likeTweet, retweet, replyToTweet, scheduleTweet } from '../client/X-bot';
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

// Request ID middleware for tracing/debugging
router.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  (req as any).requestId = requestId;
  next();
});

// Apply general rate limiter to all API routes
router.use(generalLimiter);

// API Documentation endpoint - lists all available endpoints
const apiEndpoints = [
  // Public endpoints
  {
    method: 'GET',
    path: '/api/ping',
    auth: false,
    description: 'Simple health check (returns "pong")',
  },
  {
    method: 'GET',
    path: '/api/version',
    auth: false,
    description: 'Server version and uptime info',
  },
  {
    method: 'GET',
    path: '/api/config',
    auth: false,
    description: 'Runtime config (detailed when authenticated)',
  },
  { method: 'GET', path: '/api/status', auth: false, description: 'Get system status' },
  {
    method: 'GET',
    path: '/api/health',
    auth: false,
    description: 'Health check (detailed when authenticated)',
  },
  {
    method: 'GET',
    path: '/api/metrics',
    auth: false,
    description: 'Server metrics (detailed when authenticated)',
  },
  { method: 'GET', path: '/api/docs', auth: false, description: 'API documentation' },
  {
    method: 'POST',
    path: '/api/login',
    auth: false,
    description: 'Login with Instagram credentials',
    rateLimit: '5/15min',
  },

  // Auth check
  { method: 'GET', path: '/api/me', auth: true, description: 'Get current user info' },

  // Instagram actions
  {
    method: 'POST',
    path: '/api/interact',
    auth: true,
    description: 'Interact with Instagram posts',
    rateLimit: '10/min',
  },
  {
    method: 'POST',
    path: '/api/dm',
    auth: true,
    description: 'Send direct message',
    rateLimit: '3/min',
  },
  {
    method: 'POST',
    path: '/api/dm-file',
    auth: true,
    description: 'Send DMs from file',
    rateLimit: '3/min',
  },
  {
    method: 'POST',
    path: '/api/post-photo',
    auth: true,
    description: 'Post photo from URL',
    rateLimit: '10/min',
  },
  {
    method: 'POST',
    path: '/api/post-photo-file',
    auth: true,
    description: 'Post photo from file upload',
    rateLimit: '10/min',
  },

  // Scheduling
  { method: 'POST', path: '/api/schedule-post', auth: true, description: 'Schedule a photo post' },
  { method: 'GET', path: '/api/scheduled-posts', auth: true, description: 'List scheduled posts' },
  {
    method: 'DELETE',
    path: '/api/scheduled-posts/:jobId',
    auth: true,
    description: 'Cancel scheduled post',
  },

  // Scraping
  {
    method: 'GET',
    path: '/api/scrape-followers',
    auth: true,
    description: 'Scrape followers (download)',
    rateLimit: '2/5min',
  },
  {
    method: 'POST',
    path: '/api/scrape-followers',
    auth: true,
    description: 'Scrape followers',
    rateLimit: '2/5min',
  },

  // Action logs
  {
    method: 'GET',
    path: '/api/actions',
    auth: true,
    description: 'List action logs with filtering',
  },
  { method: 'GET', path: '/api/actions/summary', auth: true, description: 'Get action summary' },
  {
    method: 'GET',
    path: '/api/actions/export',
    auth: true,
    description: 'Export logs as CSV/JSON',
  },
  { method: 'GET', path: '/api/actions/stats', auth: true, description: 'Get action statistics' },
  {
    method: 'DELETE',
    path: '/api/actions/cleanup',
    auth: true,
    description: 'Analyze old logs for cleanup',
  },

  // Session management
  {
    method: 'DELETE',
    path: '/api/clear-cookies',
    auth: true,
    description: 'Clear Instagram cookies',
  },
  { method: 'POST', path: '/api/cooldown', auth: true, description: 'Trigger manual cooldown' },
  { method: 'POST', path: '/api/exit', auth: true, description: 'Close Instagram client' },
  {
    method: 'POST',
    path: '/api/exit-interactions',
    auth: true,
    description: 'Stop interaction loop',
  },
  { method: 'POST', path: '/api/logout', auth: true, description: 'Logout and clear session' },
];

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// Simple ping endpoint for load balancers and uptime monitors
router.get('/ping', (_req: Request, res: Response) => {
  return res.send('pong');
});

// Version and build info endpoint
router.get('/version', (_req: Request, res: Response) => {
  return res.json({
    name: 'Riona AI Agent',
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    platform: process.platform,
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    uptimeFormatted: formatUptime(Date.now() - serverStartTime),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Helper to format uptime
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Runtime configuration endpoint (non-sensitive settings only)
router.get('/config', (req: Request, res: Response) => {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyToken(token) : null;
  const isAuthenticated = !!payload && typeof payload === 'object' && 'username' in payload;

  // Public config
  const publicConfig = {
    rateLimits: {
      general: { windowMs: 60000, max: 60 },
      login: { windowMs: 900000, max: 5 },
      action: { windowMs: 60000, max: 10 },
      dm: { windowMs: 60000, max: 3 },
      scrape: { windowMs: 300000, max: 2 },
    },
    limits: {
      maxJsonPayload: process.env.MAX_JSON_PAYLOAD || '100kb',
      maxFileUpload: '10MB',
      maxCaptionLength: 2200,
      maxMessageLength: 1000,
    },
  };

  if (!isAuthenticated) {
    return res.json(publicConfig);
  }

  // Authenticated: include more config details
  return res.json({
    ...publicConfig,
    features: {
      dbConnected: isDbConnected(),
      igAgentEnabled: process.env.IG_AGENT_ENABLED === 'true',
      corsOrigin: process.env.CORS_ORIGIN || '*',
      logger: process.env.LOGGER || 'winston',
    },
    instagram: {
      maxPostsPerRun: Number(process.env.IG_MAX_POSTS_PER_RUN) || 20,
      actionDelayMin: Number(process.env.IG_ACTION_DELAY_MIN_MS) || 5000,
      actionDelayMax: Number(process.env.IG_ACTION_DELAY_MAX_MS) || 10000,
      cooldownMinutes: Number(process.env.IG_COOLDOWN_MINUTES) || 60,
      dailyMaxActions: Number(process.env.IG_DAILY_MAX_ACTIONS) || 0,
      runProfile: process.env.IG_RUN_PROFILE || 'standard',
    },
  });
});

// API documentation endpoint
router.get('/docs', (_req: Request, res: Response) => {
  const grouped = {
    public: apiEndpoints.filter((e) => !e.auth),
    authenticated: apiEndpoints.filter((e) => e.auth),
  };

  return res.json({
    name: 'Riona AI Agent API',
    version: '1.0.0',
    totalEndpoints: apiEndpoints.length,
    endpoints: grouped,
    authentication: {
      type: 'JWT Cookie',
      header: 'Cookie: token=<jwt>',
      login: 'POST /api/login with { username, password }',
    },
    rateLimits: {
      general: '60 requests/minute',
      login: '5 attempts/15 minutes',
      actions: '10 requests/minute',
      dm: '3 requests/minute',
      scrape: '2 requests/5 minutes',
    },
    requestTracing: {
      header: 'X-Request-ID',
      description: 'Include this header for distributed tracing. Auto-generated if not provided.',
    },
  });
});
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// Helper to create error response with request ID for tracing
const errorResponse = (req: Request, error: string, details?: Record<string, unknown>) => ({
  error,
  requestId: (req as any).requestId,
  ...details,
});

// JWT Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json(errorResponse(req, 'Not authenticated'));
  const payload = verifyToken(token);
  if (!payload || typeof payload !== 'object' || !('username' in payload)) {
    return res.status(401).json(errorResponse(req, 'Invalid token'));
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

// Logout endpoint — public so expired or invalid tokens can still clear the cookie
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

// Post tweet endpoint (X/Twitter API client, rate limited)
router.post('/post-tweet', actionLimiter, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    const result = await postTweet(text);
    const account = (req as any).user.account || 'default';
    await logAction({
      platform: 'twitter',
      action: 'post-tweet',
      status: 'success',
      account,
      username: (req as any).user.username,
      details: { textSnippet: text.substring(0, 50) },
    });
    return res.json({ success: true, result });
  } catch (error) {
    logger.error('Post tweet error:', error);
    await logAction({
      platform: 'twitter',
      action: 'post-tweet',
      status: 'error',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      error: getErrorMessage(error),
    });
    return res.status(500).json({ error: 'Failed to post tweet' });
  }
});

// Twitter like endpoint
router.post('/twitter/like', actionLimiter, async (req: Request, res: Response) => {
  try {
    const { tweetId } = req.body;
    if (!tweetId) return res.status(400).json({ error: 'tweetId is required' });
    const result = await likeTweet(tweetId);
    await logAction({
      platform: 'twitter',
      action: 'like',
      status: 'success',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      details: { tweetId },
    });
    return res.json(result);
  } catch (error) {
    logger.error('Twitter like error:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Twitter retweet endpoint
router.post('/twitter/retweet', actionLimiter, async (req: Request, res: Response) => {
  try {
    const { tweetId } = req.body;
    if (!tweetId) return res.status(400).json({ error: 'tweetId is required' });
    const result = await retweet(tweetId);
    await logAction({
      platform: 'twitter',
      action: 'retweet',
      status: 'success',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      details: { tweetId },
    });
    return res.json(result);
  } catch (error) {
    logger.error('Twitter retweet error:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Twitter reply endpoint
router.post('/twitter/reply', actionLimiter, async (req: Request, res: Response) => {
  try {
    const { tweetId, text } = req.body;
    if (!tweetId || !text) return res.status(400).json({ error: 'tweetId and text are required' });
    const result = await replyToTweet(tweetId, text);
    await logAction({
      platform: 'twitter',
      action: 'reply',
      status: 'success',
      account: (req as any).user.account || 'default',
      username: (req as any).user.username,
      details: { tweetId, textSnippet: text.substring(0, 50) },
    });
    return res.json(result);
  } catch (error) {
    logger.error('Twitter reply error:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Twitter schedule tweet endpoint
router.post('/twitter/schedule-tweet', async (req: Request, res: Response) => {
  try {
    const { text, cronTime } = req.body;
    if (!text || !cronTime) {
      return res.status(400).json({ error: 'text and cronTime are required' });
    }
    const account = (req as any).user.account || 'default';
    const jobId = await scheduleTweet(text, cronTime, account);
    await logAction({
      platform: 'twitter',
      action: 'schedule-tweet',
      status: 'success',
      account,
      username: (req as any).user.username,
      details: { textSnippet: text.substring(0, 50), cronTime, jobId },
    });
    return res.json({ success: true, message: 'Tweet scheduled', jobId });
  } catch (error) {
    logger.error('Twitter schedule error:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
});

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
  if (!targetAccount || typeof targetAccount !== 'string' || !targetAccount.trim()) {
    return res.status(400).json({ error: 'targetAccount is required' });
  }
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
  if (!targetAccount || typeof targetAccount !== 'string' || !targetAccount.trim()) {
    return res.status(400).json({ error: 'targetAccount query param is required' });
  }
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

export default router;
