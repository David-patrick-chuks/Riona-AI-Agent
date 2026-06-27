import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet'; // For securing HTTP headers
import cors from 'cors';
import session from 'express-session';

import logger, { setupErrorHandlers } from './config/logger';
import { setup_HandleError } from './utils';
import apiRoutes from './routes/api';
import { metricsMiddleware } from './services/metrics';
import { verifyToken, getTokenFromRequest } from './secret';
import { getIgClient, closeIgClient } from './client/Instagram';
import { getBoolEnv, getNumberEnv } from './utils/env';
import { getEffectiveIgProfile } from './config/igProfile';
import { setIgCooldown, getIgCooldown } from './utils';
import { dashboardHtml } from './views/dashboard';

import { metricsHtml } from './views/metrics';

// Set up process-level error handlers
setupErrorHandlers();

// Initialize environment variables
dotenv.config({ quiet: true });

// Initialize Express app
const app: Application = express();

// Middleware setup
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", "'unsafe-inline'"],
      },
    },
  }),
);
app.use(cors());
app.use(express.json()); // JSON body parsing
app.use(express.urlencoded({ extended: true, limit: '1kb' })); // URL-encoded data
app.use(cookieParser()); // Cookie parsing
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 60 * 60 * 1000, sameSite: 'lax' },
  }),
);
app.use(metricsMiddleware);

// Serve static files from the 'public' directory
app.use(express.static('frontend/dist'));

// API Routes
app.use('/api', apiRoutes);

// Admin dashboard
app.get('/dashboard', (_req, res) => {
  res.type('html').send(dashboardHtml);
});

// Metrics dashboard (requires authentication)
app.get('/metrics', (req, res) => {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyToken(token) : null;
  const isAuthenticated = !!payload && typeof payload === 'object' && 'username' in payload;

  if (!isAuthenticated) {
    return res.redirect('/dashboard');
  }

  res.type('html').send(metricsHtml);
});

app.get(/.*/, (_req, res) => {
  res.sendFile('index.html', { root: 'frontend/dist' });
});

const runInstagramOnce = async () => {
  const igClient = await getIgClient(process.env.IGusername, process.env.IGpassword);
  await igClient.interactWithPosts();
};

const isLoginError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return lower.includes('login') || lower.includes('challenge');
};

const runAgents = async () => {
  // Declared outside the loop so the re-login guard persists across iterations.
  let didRelogin = false;

  while (true) {
    const profile = await getEffectiveIgProfile();
    const intervalMs = profile.intervalMs;

    const cooldown = await getIgCooldown();
    if (cooldown.until > Date.now()) {
      const waitMs = cooldown.until - Date.now();
      logger.info(`IG cooldown active, waiting ${Math.ceil(waitMs / 60000)} minute(s)...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    logger.info('Starting Instagram agent iteration...');
    try {
      await runInstagramOnce();
      logger.info('Instagram agent iteration finished.');
    } catch (error) {
      logger.error('Instagram agent iteration failed:', error);

      if (isLoginError(error)) {
        if (!didRelogin) {
          didRelogin = true;
          logger.warn('Attempting one re-login before stopping the loop...');
          try {
            await closeIgClient();
            await runInstagramOnce();
            logger.info('Re-login attempt succeeded.');
          } catch (retryError) {
            logger.error('Re-login attempt failed:', retryError);
            await setIgCooldown(getNumberEnv('IG_COOLDOWN_MINUTES', 60));
            logger.error('Stopping agent loop due to login/challenge requirement.');
            return;
          }
        } else {
          // Re-login already attempted in a prior iteration — give up.
          await setIgCooldown(getNumberEnv('IG_COOLDOWN_MINUTES', 60));
          logger.error('Stopping agent loop due to repeated login/challenge failures.');
          return;
        }
      }
    }

    // Wait before next iteration
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

if (getBoolEnv('IG_AGENT_ENABLED', false)) {
  runAgents().catch((error) => {
    setup_HandleError(error, 'Error running agents:');
  });
} else {
  logger.warn(
    'Instagram automation is disabled. Set IG_AGENT_ENABLED=true to start the agent loop.',
  );
}

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
