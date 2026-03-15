import express, { Application } from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import helmet from "helmet"; // For securing HTTP headers
import cors from "cors";
import session from 'express-session';

import logger, { setupErrorHandlers } from "./config/logger";
import { setup_HandleError } from "./utils";
import { connectDB } from "./config/db";
import apiRoutes from "./routes/api";
import { getIgClient, closeIgClient } from "./client/Instagram";
import { getBoolEnv, getNumberEnv } from "./utils/env";
import { getIgProfile } from "./config/igProfile";
// import { main as twitterMain } from './client/Twitter'; //
// import { main as githubMain } from './client/GitHub'; //

// Set up process-level error handlers
setupErrorHandlers();

// Initialize environment variables
dotenv.config();

// Initialize Express app
const app: Application = express();

// Connect to the database
connectDB();

// Middleware setup
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'"],
        },
    },
}));
app.use(cors());
app.use(express.json()); // JSON body parsing
app.use(express.urlencoded({ extended: true, limit: "1kb" })); // URL-encoded data
app.use(cookieParser()); // Cookie parsing
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 2 * 60 * 60 * 1000, sameSite: 'lax' },
}));

// Serve static files from the 'public' directory
app.use(express.static('frontend/dist'));

// API Routes
app.use('/api', apiRoutes);

// Simple status dashboard
app.get('/dashboard', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Riona Dashboard</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 24px; color: #111; }
    h1 { margin: 0 0 8px; }
    .muted { color: #666; }
    .card { border: 1px solid #ddd; border-radius: 10px; padding: 16px; margin: 16px 0; }
    pre { background: #f7f7f7; padding: 12px; border-radius: 8px; overflow: auto; }
  </style>
</head>
<body>
  <h1>Riona Status</h1>
  <div class="muted">Live status and last run summary</div>
  <div class="card">
    <div><strong>Database:</strong> <span id="db">loading...</span></div>
    <div><strong>IG Client:</strong> <span id="ig">loading...</span></div>
    <div><strong>Gemini Keys:</strong> <span id="keys">loading...</span></div>
  </div>
  <div class="card">
    <div><strong>Last IG Run</strong></div>
    <pre id="run">loading...</pre>
  </div>
  <script>
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        document.getElementById('db').textContent = data.dbConnected ? 'connected' : 'disconnected';
        document.getElementById('ig').textContent = data.igClient?.initialized ? 'initialized' : 'not initialized';
        document.getElementById('keys').textContent = String(data.geminiKeys ?? 0);
        document.getElementById('run').textContent = JSON.stringify(data.lastIgRun ?? {}, null, 2);
      })
      .catch(err => {
        document.getElementById('run').textContent = 'Failed to load /api/health';
      });
  </script>
</body>
</html>`);
});

app.get('*', (_req, res) => {
    res.sendFile('index.html', { root: 'frontend/dist' });
});

const runInstagramOnce = async () => {
  const igClient = await getIgClient(process.env.IGusername, process.env.IGpassword);
  await igClient.interactWithPosts();
};

const runAgents = async () => {
  const profile = getIgProfile();
  const intervalMs = profile.intervalMs;
  while (true) {
    logger.info("Starting Instagram agent iteration...");
    let didRelogin = false;
    try {
      await runInstagramOnce();
      logger.info("Instagram agent iteration finished.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Instagram agent iteration failed:", error);
      if (message.toLowerCase().includes("login") || message.toLowerCase().includes("challenge")) {
        if (!didRelogin) {
          didRelogin = true;
          logger.warn("Attempting one re-login before stopping the loop...");
          try {
            await closeIgClient();
            await runInstagramOnce();
            logger.info("Re-login attempt succeeded.");
          } catch (retryError) {
            logger.error("Re-login attempt failed:", retryError);
            logger.error("Stopping agent loop due to login/challenge requirement.");
            return;
          }
        } else {
          logger.error("Stopping agent loop due to login/challenge requirement.");
          return;
        }
      }
    }

    // Wait before next iteration
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

if (getBoolEnv("IG_AGENT_ENABLED", false)) {
  runAgents().catch((error) => {
    setup_HandleError(error, "Error running agents:");
  });
} else {
  logger.warn("Instagram automation is disabled. Set IG_AGENT_ENABLED=true to start the agent loop.");
}

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
