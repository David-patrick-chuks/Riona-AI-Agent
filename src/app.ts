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
import { setIgCooldown } from "./utils";
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
    :root {
      --pink: #ff5fa2;
      --pink-dark: #c93a7a;
      --rose: #fff0f6;
      --ink: #1b0b14;
    }
    body {
      font-family: "Plus Jakarta Sans", "Poppins", "Avenir Next", system-ui, sans-serif;
      margin: 0;
      color: var(--ink);
      background:
        radial-gradient(1200px 600px at 10% -10%, #ffd1e8 0%, transparent 60%),
        radial-gradient(1000px 600px at 90% -20%, #ffe6f2 0%, transparent 55%),
        linear-gradient(180deg, #fff8fb 0%, #ffffff 100%);
    }
    .wrap { max-width: 960px; margin: 32px auto; padding: 0 20px 40px; }
    header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 22px 24px; border-radius: 16px;
      background: linear-gradient(135deg, #ff79b7 0%, #ff4f97 100%);
      color: white; box-shadow: 0 10px 30px rgba(255, 95, 162, .35);
    }
    header h1 { margin: 0; font-size: 28px; letter-spacing: 0.2px; }
    header .tag { background: rgba(255,255,255,.2); padding: 6px 12px; border-radius: 999px; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; margin-top: 18px; }
    .grid.two { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .card {
      background: white; border-radius: 14px; padding: 16px;
      border: 1px solid #ffe0ef;
      box-shadow: 0 6px 16px rgba(255, 95, 162, .08);
    }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #9a456a; }
    .value { font-size: 20px; margin-top: 6px; font-weight: 700; }
    .muted { color: #7a4860; }
    pre {
      background: var(--rose);
      padding: 14px; border-radius: 12px;
      border: 1px dashed #ffc4dd;
      overflow: auto;
    }
    .pill {
      display: inline-block; padding: 4px 10px; border-radius: 999px;
      background: #ffe0ef; color: #b23a72; font-size: 12px;
    }
    form { display: grid; gap: 10px; }
    input, button, select {
      font: inherit;
      border-radius: 10px;
      border: 1px solid #ffc4dd;
      padding: 10px 12px;
    }
    button {
      cursor: pointer;
      background: linear-gradient(135deg, #ff79b7 0%, #ff4f97 100%);
      color: white;
      border: none;
      font-weight: 700;
    }
    button.secondary {
      background: white;
      color: #b23a72;
      border: 1px solid #ffc4dd;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      text-align: left;
      padding: 10px 8px;
      border-bottom: 1px solid #ffe0ef;
      vertical-align: top;
    }
    .toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .ok { color: #0f7b47; }
    .bad { color: #b42318; }
    @media (max-width: 720px) {
      .grid { grid-template-columns: 1fr; }
      header { flex-direction: column; align-items: flex-start; gap: 8px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div>
        <h1>Riona Dashboard</h1>
        <div class="muted">Live status + last run summary</div>
      </div>
      <div class="tag">Riona 🌸</div>
    </header>

    <div class="grid">
      <div class="card">
        <div class="label">Database</div>
        <div class="value" id="db">loading...</div>
      </div>
      <div class="card">
        <div class="label">IG Client</div>
        <div class="value" id="ig">loading...</div>
      </div>
      <div class="card">
        <div class="label">Gemini Keys</div>
        <div class="value" id="keys">loading...</div>
      </div>
    </div>

    <div class="grid two">
      <div class="card">
        <div class="label">Admin Session</div>
        <div class="value" id="session-state">checking...</div>
        <div class="muted" id="session-meta">Use the form below to sign into the local admin session.</div>
        <form id="login-form" style="margin-top: 12px;">
          <input id="username" name="username" placeholder="Instagram username" />
          <input id="password" name="password" type="password" placeholder="Instagram password" />
          <input id="account" name="account" placeholder="Account key (optional)" />
          <button type="submit">Log In</button>
        </form>
        <div class="toolbar">
          <button class="secondary" id="refresh-btn" type="button">Refresh</button>
          <button class="secondary" id="logout-btn" type="button">Log Out</button>
        </div>
        <pre id="auth-result">No action yet.</pre>
      </div>

      <div class="card">
        <div class="label">Recent Actions</div>
        <div class="grid" style="grid-template-columns: repeat(3, minmax(0,1fr)); margin-top: 12px;">
          <div>
            <div class="label">Total</div>
            <div class="value" id="actions-total">0</div>
          </div>
          <div>
            <div class="label">Success</div>
            <div class="value ok" id="actions-success">0</div>
          </div>
          <div>
            <div class="label">Errors</div>
            <div class="value bad" id="actions-error">0</div>
          </div>
        </div>
        <pre id="actions-summary">loading...</pre>
      </div>
    </div>

    <div class="card" style="margin-top: 16px;">
      <div class="label">Last IG Run</div>
      <div class="pill" id="status-pill">loading...</div>
      <pre id="run">loading...</pre>
    </div>

    <div class="card" style="margin-top: 16px;">
      <div class="label">Action Feed</div>
      <div class="muted">Latest admin and automation activity</div>
      <div style="overflow:auto; margin-top: 12px;">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Platform</th>
              <th>Action</th>
              <th>Status</th>
              <th>Account</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody id="actions-table">
            <tr><td colspan="6">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <script>
    const authResult = document.getElementById('auth-result');
    const sessionState = document.getElementById('session-state');
    const sessionMeta = document.getElementById('session-meta');
    const actionsTable = document.getElementById('actions-table');

    const renderHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        document.getElementById('db').textContent = data.dbConnected ? 'connected' : 'disconnected';
        document.getElementById('ig').textContent = data.igClient?.initialized ? 'initialized' : 'not initialized';
        document.getElementById('keys').textContent = String(data.geminiKeys ?? 0);
        document.getElementById('run').textContent = JSON.stringify(data.lastIgRun ?? {}, null, 2);
        document.getElementById('status-pill').textContent = data.lastIgRun ? 'ok' : 'no runs yet';
      } catch (err) {
        document.getElementById('run').textContent = 'Failed to load /api/health';
      }
    };

    const renderSession = async () => {
      try {
        const response = await fetch('/api/me');
        if (!response.ok) throw new Error('not authenticated');
        const data = await response.json();
        sessionState.textContent = 'authenticated';
        sessionMeta.textContent = 'User: ' + data.username + ' | Account: ' + data.account;
      } catch (_err) {
        sessionState.textContent = 'not authenticated';
        sessionMeta.textContent = 'Log in to use protected admin actions and view the full action feed.';
      }
    };

    const renderActions = async () => {
      try {
        const [actionsRes, summaryRes] = await Promise.all([
          fetch('/api/actions?limit=8'),
          fetch('/api/actions/summary?limit=25'),
        ]);

        if (!actionsRes.ok || !summaryRes.ok) {
          throw new Error('auth required');
        }

        const actionsPayload = await actionsRes.json();
        const summary = await summaryRes.json();
        document.getElementById('actions-total').textContent = String(summary.total || 0);
        document.getElementById('actions-success').textContent = String(summary.success || 0);
        document.getElementById('actions-error').textContent = String(summary.error || 0);
        document.getElementById('actions-summary').textContent = JSON.stringify(summary, null, 2);

        const rows = (actionsPayload.actions || []).map((entry) => {
          const details = entry.error || JSON.stringify(entry.details || {});
          return '<tr>' +
            '<td>' + new Date(entry.createdAt).toLocaleString() + '</td>' +
            '<td>' + entry.platform + '</td>' +
            '<td>' + entry.action + '</td>' +
            '<td class="' + (entry.status === 'success' ? 'ok' : 'bad') + '">' + entry.status + '</td>' +
            '<td>' + (entry.account || 'default') + '</td>' +
            '<td>' + (details || '-') + '</td>' +
          '</tr>';
        }).join('');

        actionsTable.innerHTML = rows || '<tr><td colspan="6">No actions logged yet.</td></tr>';
      } catch (_err) {
        document.getElementById('actions-summary').textContent = 'Log in to view recent actions.';
        actionsTable.innerHTML = '<tr><td colspan="6">Log in to view recent actions.</td></tr>';
      }
    };

    const refreshAll = async () => {
      await Promise.all([renderHealth(), renderSession(), renderActions()]);
    };

    document.getElementById('login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        account: document.getElementById('account').value,
      };

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        authResult.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        authResult.textContent = 'Login request failed.';
      }

      await refreshAll();
    });

    document.getElementById('refresh-btn').addEventListener('click', refreshAll);
    document.getElementById('logout-btn').addEventListener('click', async () => {
      try {
        const response = await fetch('/api/logout', { method: 'POST' });
        const data = await response.json();
        authResult.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        authResult.textContent = 'Logout request failed.';
      }
      await refreshAll();
    });

    refreshAll();
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
            await setIgCooldown(getNumberEnv("IG_COOLDOWN_MINUTES", 60));
            logger.error("Stopping agent loop due to login/challenge requirement.");
            return;
          }
        } else {
          await setIgCooldown(getNumberEnv("IG_COOLDOWN_MINUTES", 60));
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
