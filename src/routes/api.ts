import express, { Request, Response } from 'express';
import { getIgClient, closeIgClient, scrapeFollowersHandler, getIgClientStatus } from '../client/Instagram';
import { getPosterClient } from '../client/InstagramPoster';
import logger from '../config/logger';
import mongoose from 'mongoose';
import { signToken, verifyToken, getTokenFromRequest } from '../secret';
import { geminiApiKeys } from '../secret';
import { getLastRunSummary } from '../utils/igRunSummary';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { getAccount } from '../config/accounts';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// JWT Auth middleware
function requireAuth(req: Request, res: Response, next: Function) {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const payload = verifyToken(token);
  if (!payload || typeof payload !== 'object' || !('username' in payload)) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  (req as any).user = { username: payload.username, account: (payload as any).account || 'default' };
  next();
}

// Status endpoint
router.get('/status', (_req: Request, res: Response) => {
    const status = {
        dbConnected: mongoose.connection.readyState === 1
    };
    return res.json(status);
});

// Health endpoint
router.get('/health', (req: Request, res: Response) => {
  const account = (req as any).user?.account || 'default';
  return res.json({
    dbConnected: mongoose.connection.readyState === 1,
    igClient: getIgClientStatus(account),
    geminiKeys: geminiApiKeys.length,
    lastIgRun: getLastRunSummary(),
  });
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
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
    return res.json({ message: 'Login successful' });
  } catch (error) {
    logger.error('Login error:', error);
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

// Endpoint to clear Instagram cookies
router.delete('/clear-cookies', async (req, res) => {
  const cookiesPath = path.join(__dirname, '../../cookies/Instagramcookies.json');
  try {
    await fs.unlink(cookiesPath);
    res.json({ success: true, message: 'Instagram cookies cleared.' });
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      res.json({ success: true, message: 'No cookies to clear.' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to clear cookies.', error: err.message });
    }
  }
});

// All routes below require authentication
router.use(requireAuth);

// Interact with posts endpoint
router.post('/interact', async (req: Request, res: Response) => {
  try {
    const account = (req as any).user.account || 'default';
    const igClient = await getIgClient((req as any).user.username, undefined, account);
    await igClient.interactWithPosts();
    return res.json({ message: 'Interaction successful' });
  } catch (error) {
    logger.error('Interaction error:', error);
    return res.status(500).json({ error: 'Failed to interact with posts' });
  }
});

// Send direct message endpoint
router.post('/dm', async (req: Request, res: Response) => {
  try {
    const { username, message } = req.body;
    if (!username || !message) {
      return res.status(400).json({ error: 'Username and message are required' });
    }
    const account = (req as any).user.account || 'default';
    const igClient = await getIgClient((req as any).user.username, undefined, account);
    await igClient.sendDirectMessage(username, message);
    return res.json({ message: 'Message sent successfully' });
  } catch (error) {
    logger.error('DM error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// Send messages from file endpoint
router.post('/dm-file', async (req: Request, res: Response) => {
  try {
    const { file, message, mediaPath } = req.body;
    if (!file || !message) {
      return res.status(400).json({ error: 'File and message are required' });
    }
    const account = (req as any).user.account || 'default';
    const igClient = await getIgClient((req as any).user.username, undefined, account);
    await igClient.sendDirectMessagesFromFile(file, message, mediaPath);
    return res.json({ message: 'Messages sent successfully' });
  } catch (error) {
    logger.error('File DM error:', error);
    return res.status(500).json({ error: 'Failed to send messages from file' });
  }
});

// Post photo endpoint (Instagram API client)
router.post('/post-photo', async (req: Request, res: Response) => {
  try {
    const { imageUrl, caption } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }
    const account = (req as any).user.account || 'default';
    const client = await getPosterClient(undefined, undefined, account);
    const result = await client.postPhoto(imageUrl, caption || '');
    return res.json({ success: true, result });
  } catch (error) {
    logger.error('Post photo error:', error);
    return res.status(500).json({ error: 'Failed to post photo' });
  }
});

// Post photo from file (multipart)
router.post('/post-photo-file', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const caption = req.body?.caption || '';
    if (!file || !file.buffer) {
      return res.status(400).json({ error: 'image file is required' });
    }
    const account = (req as any).user.account || 'default';
    const client = await getPosterClient(undefined, undefined, account);
    const result = await client.postPhotoBuffer(file.buffer, caption);
    return res.json({ success: true, result });
  } catch (error) {
    logger.error('Post photo file error:', error);
    return res.status(500).json({ error: 'Failed to post photo file' });
  }
});

// Schedule photo post endpoint (cron syntax)
router.post('/schedule-post', async (req: Request, res: Response) => {
  try {
    const { imageUrl, caption, cronTime } = req.body;
    if (!imageUrl || !cronTime) {
      return res.status(400).json({ error: 'imageUrl and cronTime are required' });
    }
    const account = (req as any).user.account || 'default';
    const client = await getPosterClient(undefined, undefined, account);
    await client.schedulePost(imageUrl, caption || '', cronTime);
    return res.json({ success: true, message: 'Post scheduled' });
  } catch (error) {
    logger.error('Schedule post error:', error);
    return res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// Scrape followers endpoint
router.post('/scrape-followers', async (req: Request, res: Response) => {
  const { targetAccount, maxFollowers } = req.body;
  try {
    const result = await scrapeFollowersHandler(targetAccount, maxFollowers);
    if (Array.isArray(result)) {
      if (req.query.download === '1') {
        const filename = `${targetAccount}_followers.txt`;
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
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET handler for scrape-followers to support file download
router.get('/scrape-followers', async (req: Request, res: Response) => {
  const { targetAccount, maxFollowers } = req.query;
  try {
    const result = await scrapeFollowersHandler(
      String(targetAccount),
      Number(maxFollowers)
    );
    if (Array.isArray(result)) {
      const filename = `${targetAccount}_followers.txt`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/plain');
      res.send(result.join('\n'));
    } else {
      res.status(400).send('No followers found.');
    }
  } catch (error) {
    res.status(500).send('Error scraping followers.');
  }
});

// Exit endpoint
router.post('/exit', async (req: Request, res: Response) => {
  try {
    const account = (req as any).user?.account || 'default';
    await closeIgClient(account);
    return res.json({ message: 'Exiting successfully' });
  } catch (error) {
    logger.error('Exit error:', error);
    return res.status(500).json({ error: 'Failed to exit gracefully' });
  }
});

// Logout endpoint
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return res.json({ message: 'Logged out successfully' });
});

export default router; 
