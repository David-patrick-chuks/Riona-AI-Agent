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
import { getIgProfile } from './config/igProfile';
import { setIgCooldown, getIgCooldown } from './utils';
import { dashboardHtml } from './views/dashboard';

// Set up process-level error handlers
setupErrorHandlers();

// Initialize environment variables
dotenv.config();

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

// Simple status dashboard
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

  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Riona Metrics</title>
  <style>
    :root { --pink: #ff5fa2; --rose: #fff0f6; --ink: #1b0b14; }
    body {
      font-family: system-ui, sans-serif;
      margin: 0; padding: 20px;
      background: linear-gradient(180deg, #fff8fb 0%, #ffffff 100%);
      color: var(--ink);
    }
    .wrap { max-width: 1000px; margin: 0 auto; }
    h1 { color: var(--pink); margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin: 20px 0; }
    .card {
      background: white; border-radius: 12px; padding: 16px;
      border: 1px solid #ffe0ef; box-shadow: 0 4px 12px rgba(255,95,162,.1);
    }
    .label { font-size: 12px; text-transform: uppercase; color: #9a456a; }
    .value { font-size: 28px; font-weight: 700; margin-top: 4px; }
    .ok { color: #0f7b47; } .bad { color: #b42318; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #ffe0ef; }
    th { background: var(--rose); font-size: 12px; text-transform: uppercase; }
    .bar { background: #ffe0ef; border-radius: 4px; height: 8px; margin-top: 4px; }
    .bar-fill { background: var(--pink); height: 100%; border-radius: 4px; }
    #refresh { margin-top: 16px; padding: 10px 20px; background: var(--pink); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>📊 Metrics Dashboard</h1>
    <p>Real-time server performance metrics</p>
    <button id="refresh">Refresh</button>

    <div class="grid">
      <div class="card"><div class="label">Uptime</div><div class="value" id="uptime">-</div></div>
      <div class="card"><div class="label">Total Requests</div><div class="value" id="total">0</div></div>
      <div class="card"><div class="label">Total Errors</div><div class="value bad" id="errors">0</div></div>
      <div class="card"><div class="label">Error Rate</div><div class="value" id="errorRate">0%</div></div>
      <div class="card"><div class="label">Rate Limit Hits</div><div class="value" id="rateLimits">0</div></div>
    </div>

    <h2>Status Codes</h2>
    <div class="grid" id="statusCodes"></div>

    <h2>Endpoints</h2>
    <table>
      <thead><tr><th>Endpoint</th><th>Requests</th><th>Errors</th><th>Avg Response</th></tr></thead>
      <tbody id="endpoints"><tr><td colspan="4">Loading...</td></tr></tbody>
    </table>
  </div>
  <script>
    const load = async () => {
      try {
        const res = await fetch('/api/metrics');
        const data = await res.json();
        document.getElementById('uptime').textContent = data.uptimeFormatted;
        document.getElementById('total').textContent = data.totalRequests;
        document.getElementById('errors').textContent = data.totalErrors;
        document.getElementById('errorRate').textContent = data.errorRate;
        document.getElementById('rateLimits').textContent = data.rateLimitHits;

        const statusHtml = Object.entries(data.statusCodes || {})
          .map(([code, count]) => '<div class="card"><div class="label">HTTP ' + code + '</div><div class="value">' + count + '</div></div>')
          .join('');
        document.getElementById('statusCodes').innerHTML = statusHtml || '<div class="card">No data yet</div>';

        const endpointsHtml = Object.entries(data.endpoints || {})
          .sort((a, b) => b[1].count - a[1].count)
          .map(([ep, d]) => '<tr><td>' + ep + '</td><td>' + d.count + '</td><td class="bad">' + d.errors + '</td><td>' + d.avgMs + 'ms</td></tr>')
          .join('');
        document.getElementById('endpoints').innerHTML = endpointsHtml || '<tr><td colspan="4">No requests yet</td></tr>';
      } catch (e) { console.error(e); }
    };
    document.getElementById('refresh').onclick = load;
    load();
    setInterval(load, 10000);
  </script>
</body>
</html>`);
});

app.get(/.*/, (_req, res) => {
  res.sendFile('index.html', { root: 'frontend/dist' });
});

const runInstagramOnce = async () => {
  const igClient = await getIgClient(process.env.IGusername, process.env.IGpassword);
  await igClient.interactWithPosts();
};

const runAgents = async () => {
  const profile = getIgProfile();
  const intervalMs = profile.intervalMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const cooldown = await getIgCooldown();
    if (cooldown.until > Date.now()) {
      const waitMs = cooldown.until - Date.now();
      logger.info(`IG cooldown active, waiting ${Math.ceil(waitMs / 60000)} minute(s)...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    logger.info('Starting Instagram agent iteration...');
    let didRelogin = false;
    try {
      await runInstagramOnce();
      logger.info('Instagram agent iteration finished.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Instagram agent iteration failed:', error);
      if (message.toLowerCase().includes('login') || message.toLowerCase().includes('challenge')) {
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
          await setIgCooldown(getNumberEnv('IG_COOLDOWN_MINUTES', 60));
          logger.error('Stopping agent loop due to login/challenge requirement.');
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
