export const dashboardHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Riona Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0b080a;
      --surface: #130e12;
      --surface-2: #1a1318;
      --border: #3a2434;
      --border-light: #4f3250;
      --text: #f8eef3;
      --text-muted: #b894a8;
      --text-dim: #7d6473;
      --accent: #ff5fa2;
      --accent-hover: #ff85b8;
      --accent-deep: #c93a7a;
      --accent-glow: rgba(255, 95, 162, 0.16);
      --success: #3fb950;
      --success-bg: rgba(63, 185, 80, 0.12);
      --warning: #e8a838;
      --warning-bg: rgba(232, 168, 56, 0.12);
      --danger: #ff6b7a;
      --danger-bg: rgba(255, 107, 122, 0.14);
      --radius: 10px;
      --radius-lg: 14px;
      --shadow: 0 1px 3px rgba(0,0,0,.4), 0 8px 24px rgba(255, 95, 162, 0.06);
    }

    *, *::before, *::after { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background:
        radial-gradient(ellipse 70% 45% at 8% -5%, rgba(255, 95, 162, 0.14), transparent),
        radial-gradient(ellipse 50% 35% at 95% 0%, rgba(201, 58, 122, 0.1), transparent),
        var(--bg);
      color: var(--text);
      line-height: 1.5;
      min-height: 100vh;
    }

    /* ── Layout ── */
    .app {
      display: grid;
      grid-template-columns: 240px 1fr;
      min-height: 100vh;
    }

    .sidebar {
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: sticky;
      top: 0;
      height: 100vh;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 8px 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 8px;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%);
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .brand-name {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .brand-sub {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 400;
    }

    .nav-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-dim);
      padding: 8px 8px 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      transition: background 0.15s, color 0.15s;
    }

    .nav-item:hover { background: var(--surface-2); color: var(--text); }
    .nav-item.active { background: var(--accent-glow); color: var(--accent-hover); }

    .sidebar-footer {
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }

    .main {
      padding: 28px 32px;
      overflow-y: auto;
    }

    /* ── Page header ── */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 28px;
      gap: 16px;
    }

    .page-title {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.03em;
      margin: 0 0 4px;
    }

    .page-sub {
      font-size: 13px;
      color: var(--text-muted);
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .live-dot {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .live-dot::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 6px var(--success);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* ── Stat cards ── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 18px 20px;
      box-shadow: var(--shadow);
    }

    .stat-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-dim);
      margin-bottom: 10px;
    }

    .stat-value {
      font-size: 15px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-value.lg { font-size: 28px; font-weight: 700; letter-spacing: -0.03em; }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .badge.ok { background: var(--success-bg); color: var(--success); }
    .badge.ok::before { background: var(--success); }
    .badge.bad { background: var(--danger-bg); color: var(--danger); }
    .badge.bad::before { background: var(--danger); }
    .badge.neutral { background: var(--surface-2); color: var(--text-muted); }
    .badge.neutral::before { background: var(--text-dim); }
    .badge.warn { background: var(--warning-bg); color: var(--warning); }
    .badge.warn::before { background: var(--warning); }

    /* ── Panels ── */
    .panels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 22px 24px;
      box-shadow: var(--shadow);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
    }

    .panel-title {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
    }

    .panel-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin: 2px 0 0;
    }

    /* ── Forms ── */
    .form-grid { display: grid; gap: 10px; }

    .field label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 5px;
    }

    input, select {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 12px;
      font: inherit;
      font-size: 13px;
      color: var(--text);
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    input:focus, select:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }

    input::placeholder { color: var(--text-dim); }

    /* ── Buttons ── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px 16px;
      border-radius: 8px;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: background 0.15s, opacity 0.15s, transform 0.1s;
    }

    .btn:active { transform: scale(0.98); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-primary {
      background: var(--accent);
      color: white;
    }

    .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }

    .btn-secondary {
      background: var(--surface-2);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover:not(:disabled) { background: var(--border); }

    .btn-danger {
      background: var(--danger-bg);
      color: var(--danger);
      border: 1px solid rgba(248,81,73,0.3);
    }

    .btn-danger:hover:not(:disabled) { background: rgba(248,81,73,0.2); }

    .btn-sm { padding: 6px 12px; font-size: 12px; }

    .btn-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 14px;
    }

    /* ── Session banner ── */
    .session-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 8px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      margin-bottom: 16px;
    }

    .session-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), var(--accent-deep));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .session-info { flex: 1; min-width: 0; }
    .session-name { font-size: 13px; font-weight: 600; }
    .session-meta { font-size: 12px; color: var(--text-muted); }

    /* ── Alert / toast ── */
    .alert {
      display: none;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-top: 12px;
      border: 1px solid;
    }

    .alert.show { display: block; }
    .alert.ok { background: var(--success-bg); border-color: rgba(63,185,80,0.3); color: var(--success); }
    .alert.err { background: var(--danger-bg); border-color: rgba(248,81,73,0.3); color: var(--danger); }
    .alert.info { background: var(--accent-glow); border-color: rgba(255,95,162,0.35); color: var(--accent-hover); }

    /* ── Action stats mini ── */
    .mini-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }

    .mini-stat {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 14px;
      text-align: center;
    }

    .mini-stat-val {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.03em;
    }

    .mini-stat-val.ok { color: var(--success); }
    .mini-stat-val.bad { color: var(--danger); }

    .mini-stat-label {
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ── Run summary ── */
    .run-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .run-item {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 14px;
    }

    .run-item-label { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; }
    .run-item-val { font-size: 18px; font-weight: 700; margin-top: 4px; letter-spacing: -0.02em; }

    .empty-state {
      text-align: center;
      padding: 28px 16px;
      color: var(--text-dim);
      font-size: 13px;
    }

    /* ── Table ── */
    .table-wrap { overflow-x: auto; margin-top: 4px; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    thead th {
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-dim);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }

    tbody td {
      padding: 11px 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
      color: var(--text-muted);
    }

    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: var(--surface-2); }

    .action-name { color: var(--text); font-weight: 500; }
    .status-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-pill.ok { background: var(--success-bg); color: var(--success); }
    .status-pill.bad { background: var(--danger-bg); color: var(--danger); }

    .cooldown-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 10px;
    }

    .cooldown-row input { width: 80px; flex-shrink: 0; }

    /* hidden pre for JS compat */
    #auth-result, #control-result, #actions-summary, #run, #status-pill { display: none; }

    @media (max-width: 900px) {
      .app { grid-template-columns: 1fr; }
      .sidebar { display: none; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .panels { grid-template-columns: 1fr; }
      .main { padding: 20px 16px; }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-icon">R</div>
        <div>
          <div class="brand-name">Riona</div>
          <div class="brand-sub">Admin Panel</div>
        </div>
      </div>

      <div class="nav-label">Monitor</div>
      <button class="nav-item active" type="button">Overview</button>
      <a class="nav-item" href="/metrics" style="text-decoration:none">Metrics</a>

      <div class="nav-label">Actions</div>
      <button class="nav-item" type="button" onclick="document.getElementById('interact-btn').click()">Run Interact</button>
      <button class="nav-item" type="button" onclick="document.getElementById('refresh-btn').click()">Refresh Status</button>

      <div class="sidebar-footer">
        <div class="live-dot" id="refresh-indicator">Live · 15s refresh</div>
      </div>
    </aside>

    <main class="main">
      <div class="page-header">
        <div>
          <h1 class="page-title">Overview</h1>
          <p class="page-sub">Instagram automation status and controls</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary btn-sm" id="refresh-btn" type="button">↻ Refresh</button>
        </div>
      </div>

      <!-- Stat cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Database</div>
          <div class="stat-value" id="db-wrap"><span id="db">loading…</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">IG Client</div>
          <div class="stat-value" id="ig-wrap"><span id="ig">loading…</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Gemini Keys</div>
          <div class="stat-value lg" id="keys">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Session</div>
          <div class="stat-value" id="session-state">checking…</div>
        </div>
      </div>

      <!-- Runtime config + Twitter -->
      <div class="panels" style="margin-bottom:16px">
        <div class="panel">
          <div class="panel-header">
            <div>
              <p class="panel-title">Runtime Config</p>
              <p class="panel-desc">Accounts, IG profile, and risk state</p>
            </div>
          </div>
          <div class="run-grid" id="config-grid">
            <div class="empty-state">Sign in to view configuration</div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <div>
              <p class="panel-title">Twitter / X</p>
              <p class="panel-desc">Post tweets via API (requires TWITTER_* env keys)</p>
            </div>
          </div>
          <form id="tweet-form" class="form-grid">
            <div class="field">
              <label for="tweet-text">Tweet text</label>
              <input id="tweet-text" name="text" placeholder="What's happening?" maxlength="280" />
            </div>
            <div class="btn-row" style="margin-top:0">
              <button class="btn btn-primary" type="submit">Post Tweet</button>
            </div>
          </form>
          <form id="tweet-media-form" class="form-grid" style="margin-top:12px">
            <div class="field">
              <label for="tweet-media-text">Tweet with image</label>
              <input id="tweet-media-text" name="text" placeholder="Caption for image tweet" maxlength="280" />
            </div>
            <div class="field">
              <label for="tweet-media-file">Image file</label>
              <input id="tweet-media-file" name="media" type="file" accept="image/*" />
            </div>
            <button class="btn btn-secondary" type="submit">Post with Media</button>
          </form>
          <div class="alert" id="twitter-alert"></div>
        </div>
      </div>

      <div class="panels">
        <!-- Login panel -->
        <div class="panel">
          <div class="panel-header">
            <div>
              <p class="panel-title">Authentication</p>
              <p class="panel-desc">Sign in to launch the Instagram browser session</p>
            </div>
          </div>

          <div class="session-banner" id="session-banner">
            <div class="session-avatar" id="session-avatar">?</div>
            <div class="session-info">
              <div class="session-name" id="session-display">Not signed in</div>
              <div class="session-meta" id="session-meta">Enter credentials below to connect</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="logout-btn" type="button">Sign out</button>
          </div>

          <form id="login-form" class="form-grid">
            <div class="field">
              <label for="username">Instagram username</label>
              <input id="username" name="username" placeholder="your_username" autocomplete="username" />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" placeholder="••••••••" autocomplete="current-password" />
            </div>
            <div class="field">
              <label for="account">Account key <span style="color:var(--text-dim)">(optional)</span></label>
              <input id="account" name="account" placeholder="default" />
            </div>
            <button class="btn btn-primary" type="submit">Launch Browser &amp; Sign In</button>
          </form>

          <div class="alert" id="auth-alert"></div>
          <pre id="auth-result"></pre>
        </div>

        <!-- Control panel -->
        <div class="panel">
          <div class="panel-header">
            <div>
              <p class="panel-title">Automation Controls</p>
              <p class="panel-desc">Manage the active Instagram session</p>
            </div>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" id="interact-btn" type="button">▶ Run Interact</button>
            <button class="btn btn-secondary" id="clear-cookies-btn" type="button">Clear Cookies</button>
            <button class="btn btn-danger" id="exit-btn" type="button">Exit Client</button>
          </div>

          <div class="cooldown-row">
            <input id="cooldown-minutes" type="number" min="1" step="1" value="60" aria-label="Cooldown minutes" />
            <button class="btn btn-secondary btn-sm" id="cooldown-btn" type="button">Start Cooldown</button>
          </div>

          <div class="alert" id="control-alert"></div>
          <pre id="control-result"></pre>
        </div>
      </div>

      <!-- Last run -->
      <div class="panel" style="margin-bottom:16px">
        <div class="panel-header">
          <div>
            <p class="panel-title">Last Instagram Run</p>
            <p class="panel-desc">Summary from the most recent interaction cycle</p>
          </div>
          <span class="badge neutral" id="status-pill">loading…</span>
          <span class="badge neutral" id="run-status-badge">—</span>
        </div>
        <div class="run-grid" id="run-grid">
          <div class="empty-state">Log in and run interact to see results here</div>
        </div>
        <pre id="run"></pre>
      </div>

      <!-- Activity feed -->
      <div class="panel">
        <div class="panel-header">
          <div>
            <p class="panel-title">Activity Feed</p>
            <p class="panel-desc">Recent automation and admin actions</p>
          </div>
        </div>

        <div class="mini-stats">
          <div class="mini-stat">
            <div class="mini-stat-val" id="actions-total">0</div>
            <div class="mini-stat-label">Total</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-val ok" id="actions-success">0</div>
            <div class="mini-stat-label">Success</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-val bad" id="actions-error">0</div>
            <div class="mini-stat-label">Errors</div>
          </div>
        </div>
        <pre id="actions-summary"></pre>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Platform</th>
                <th>Action</th>
                <th>Status</th>
                <th>Account</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody id="actions-table">
              <tr><td colspan="6" class="empty-state">Loading…</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Admin logs -->
      <div class="panels">
        <div class="panel">
          <div class="panel-header">
            <div>
              <p class="panel-title">Application Logs</p>
              <p class="panel-desc">Latest lines from server log files</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Level</th>
                  <th>File</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody id="logs-table">
                <tr><td colspan="4" class="empty-state">Loading…</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <div>
              <p class="panel-title">Error Feed</p>
              <p class="panel-desc">Failed actions and server errors</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Source</th>
                  <th>Context</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody id="errors-table">
                <tr><td colspan="4" class="empty-state">Loading…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    const authAlert = document.getElementById('auth-alert');
    const controlAlert = document.getElementById('control-alert');
    const sessionDisplay = document.getElementById('session-display');
    const sessionAvatar = document.getElementById('session-avatar');
    const runGrid = document.getElementById('run-grid');
    const runStatusBadge = document.getElementById('run-status-badge');
    const actionsTable = document.getElementById('actions-table');
    const logsTable = document.getElementById('logs-table');
    const errorsTable = document.getElementById('errors-table');
    const configGrid = document.getElementById('config-grid');
    const twitterAlert = document.getElementById('twitter-alert');
    let refreshTimer = null;

    const escapeHtml = (value) => String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

    const showAlert = (el, message, type) => {
      el.textContent = message;
      el.className = 'alert show ' + type;
      setTimeout(() => el.classList.remove('show'), 5000);
    };

    const setBadge = (el, text, type) => {
      el.textContent = text;
      el.className = 'badge ' + type;
    };

    const setStatBadge = (wrapId, text, type) => {
      const wrap = document.getElementById(wrapId);
      if (!wrap) return;
      wrap.innerHTML = '<span class="badge ' + type + '">' + escapeHtml(text) + '</span>';
    };

    const requestJson = async (url, options = {}) => {
      const response = await fetch(url, options);
      let payload = null;
      try { payload = await response.json(); } catch (_err) { payload = null; }
      if (!response.ok) {
        const message = payload?.error || payload?.message || 'Request failed';
        throw new Error(message);
      }
      return payload;
    };

    const renderRunSummary = (run) => {
      if (!run || !Object.keys(run).length) {
        runGrid.innerHTML = '<div class="empty-state">No runs yet — click <strong>Run Interact</strong> to start</div>';
        runStatusBadge.textContent = 'No runs';
        runStatusBadge.className = 'badge neutral';
        return;
      }

      const fields = [
        ['Posts visited', run.postsVisited ?? '—'],
        ['Likes', run.likes ?? '—'],
        ['Comments', run.comments ?? '—'],
        ['Skipped (sponsored)', run.skippedSponsored ?? '—'],
        ['Errors', run.errors ?? '—'],
        ['Duration', run.durationMs ? Math.round(run.durationMs / 1000) + 's' : '—'],
      ];

      runGrid.innerHTML = fields.map(([label, val]) =>
        '<div class="run-item"><div class="run-item-label">' + escapeHtml(label) +
        '</div><div class="run-item-val">' + escapeHtml(String(val)) + '</div></div>'
      ).join('');

      runStatusBadge.textContent = 'Completed';
      runStatusBadge.className = 'badge ok';
    };

    const renderHealth = async () => {
      try {
        const response = await fetch('/api/health', { credentials: 'same-origin' });
        const data = await response.json();

        const dbOk = data.dbConnected;
        setStatBadge('db-wrap', dbOk ? 'Connected' : 'Disconnected', dbOk ? 'ok' : 'bad');
        document.getElementById('db').textContent = dbOk ? 'connected' : 'disconnected';

        if (data.igClient === undefined) {
          setStatBadge('ig-wrap', 'Sign in required', 'neutral');
          document.getElementById('ig').textContent = 'not signed in';
          document.getElementById('keys').textContent = '—';
          document.getElementById('run').textContent = '';
          document.getElementById('status-pill').textContent = 'locked';
          renderRunSummary(null);
          return;
        }

        const igOk = data.igClient?.initialized;
        setStatBadge('ig-wrap', igOk ? 'Initialized' : 'Not initialized', igOk ? 'ok' : 'warn');
        document.getElementById('ig').textContent = igOk ? 'initialized' : 'not initialized';
        document.getElementById('keys').textContent = String(data.geminiKeys ?? 0);
        document.getElementById('run').textContent = JSON.stringify(data.lastIgRun ?? {}, null, 2);
        document.getElementById('status-pill').textContent = data.lastIgRun ? 'ok' : 'no runs yet';
        renderRunSummary(data.lastIgRun);
      } catch (_err) {
        runGrid.innerHTML = '<div class="empty-state">Failed to load health data</div>';
      }
    };

    const renderSession = async () => {
      const sessionState = document.getElementById('session-state');
      const sessionMeta = document.getElementById('session-meta');
      try {
        const response = await fetch('/api/me');
        if (!response.ok) throw new Error('not authenticated');
        const data = await response.json();
        sessionState.innerHTML = '<span class="badge ok">Authenticated</span>';
        sessionDisplay.textContent = data.username;
        sessionMeta.textContent = 'Account: ' + data.account;
        sessionAvatar.textContent = data.username.charAt(0).toUpperCase();
      } catch (_err) {
        sessionState.innerHTML = '<span class="badge neutral">Guest</span>';
        sessionDisplay.textContent = 'Not signed in';
        sessionMeta.textContent = 'Enter credentials below to connect';
        sessionAvatar.textContent = '?';
      }
    };

    const renderActions = async () => {
      try {
        const [actionsRes, summaryRes] = await Promise.all([
          fetch('/api/actions?limit=10'),
          fetch('/api/actions/summary?limit=25'),
        ]);

        if (!actionsRes.ok || !summaryRes.ok) throw new Error('auth required');

        const actionsPayload = await actionsRes.json();
        const summary = await summaryRes.json();

        document.getElementById('actions-total').textContent = String(summary.total || 0);
        document.getElementById('actions-success').textContent = String(summary.success || 0);
        document.getElementById('actions-error').textContent = String(summary.error || 0);
        document.getElementById('actions-summary').textContent = JSON.stringify(summary, null, 2);

        const rows = (actionsPayload.actions || []).map((entry) => {
          const details = entry.error || (entry.details ? JSON.stringify(entry.details) : '—');
          const statusClass = entry.status === 'success' ? 'ok' : 'bad';
          return '<tr>' +
            '<td>' + escapeHtml(new Date(entry.createdAt).toLocaleString()) + '</td>' +
            '<td>' + escapeHtml(entry.platform) + '</td>' +
            '<td><span class="action-name">' + escapeHtml(entry.action) + '</span></td>' +
            '<td><span class="status-pill ' + statusClass + '">' + entry.status + '</span></td>' +
            '<td>' + escapeHtml(entry.account || 'default') + '</td>' +
            '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(details) + '">' + escapeHtml(details) + '</td>' +
          '</tr>';
        }).join('');

        actionsTable.innerHTML = rows ||
          '<tr><td colspan="6"><div class="empty-state">No actions logged yet</div></td></tr>';
      } catch (_err) {
        actionsTable.innerHTML =
          '<tr><td colspan="6"><div class="empty-state">Sign in to view activity feed</div></td></tr>';
      }
    };

    const formatTime = (value) => {
      if (!value) return '—';
      const time = new Date(value);
      return Number.isNaN(time.getTime()) ? value : time.toLocaleString();
    };

    const renderConfig = async () => {
      try {
        const response = await fetch('/api/accounts');
        if (!response.ok) throw new Error('auth required');
        const data = await response.json();
        const cooldown = data.cooldownActiveUntil
          ? new Date(data.cooldownActiveUntil).toLocaleString()
          : 'inactive';
        const accounts = (data.accounts || [])
          .map((a) => escapeHtml(a.key) + ' → ' + escapeHtml(a.username))
          .join(', ') || 'none (use .env or accounts.json)';
        const fields = [
          ['IG profile', data.igProfile + ' → effective: ' + data.effectiveProfile],
          ['Challenges (24h)', String(data.risk?.challengesLast24h ?? 0)],
          ['Cooldown', cooldown],
          ['Agent interval', (data.agentIntervalMs / 1000) + 's'],
          ['Daily max actions', String(data.dailyMaxActions)],
          ['Accounts', accounts],
        ];
        configGrid.innerHTML = fields.map(([label, val]) =>
          '<div class="run-item"><div class="run-item-label">' + escapeHtml(label) +
          '</div><div class="run-item-val" style="font-size:14px;font-weight:600">' + val + '</div></div>'
        ).join('');
      } catch (_err) {
        configGrid.innerHTML = '<div class="empty-state">Sign in to view runtime config</div>';
      }
    };

    const renderLogs = async () => {
      try {
        const response = await fetch('/api/admin/logs?limit=20');
        if (!response.ok) throw new Error('auth required');
        const payload = await response.json();
        const rows = (payload.logs || []).map((entry) => {
          const levelClass = entry.level === 'error' ? 'bad' : '';
          return '<tr>' +
            '<td>' + escapeHtml(formatTime(entry.timestamp)) + '</td>' +
            '<td><span class="status-pill ' + (entry.level === 'error' ? 'bad' : 'ok') + '">' + escapeHtml(entry.level) + '</span></td>' +
            '<td>' + escapeHtml(entry.file) + '</td>' +
            '<td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(entry.message) + '">' + escapeHtml(entry.message) + '</td>' +
          '</tr>';
        }).join('');
        logsTable.innerHTML = rows || '<tr><td colspan="4"><div class="empty-state">No application logs found</div></td></tr>';
      } catch (_err) {
        logsTable.innerHTML = '<tr><td colspan="4"><div class="empty-state">Sign in to view application logs</div></td></tr>';
      }
    };

    const renderErrors = async () => {
      try {
        const response = await fetch('/api/admin/errors?limit=20');
        if (!response.ok) throw new Error('auth required');
        const payload = await response.json();
        const rows = (payload.errors || []).map((entry) =>
          '<tr>' +
            '<td>' + escapeHtml(formatTime(entry.timestamp)) + '</td>' +
            '<td>' + escapeHtml(entry.source) + '</td>' +
            '<td>' + escapeHtml(entry.context || entry.platform || '—') + '</td>' +
            '<td class="bad" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(entry.message) + '">' + escapeHtml(entry.message) + '</td>' +
          '</tr>'
        ).join('');
        errorsTable.innerHTML = rows || '<tr><td colspan="4"><div class="empty-state">No errors logged yet</div></td></tr>';
      } catch (_err) {
        errorsTable.innerHTML = '<tr><td colspan="4"><div class="empty-state">Sign in to view errors</div></td></tr>';
      }
    };

    const refreshAll = async () => {
      await Promise.all([
        renderHealth(),
        renderSession(),
        renderConfig(),
        renderActions(),
        renderLogs(),
        renderErrors(),
      ]);
    };

    const runControlAction = async (url, options = {}) => {
      try {
        const payload = await requestJson(url, options);
        showAlert(controlAlert, payload.message || payload.success ? 'Action completed' : JSON.stringify(payload), 'ok');
        document.getElementById('control-result').textContent = JSON.stringify(payload, null, 2);
      } catch (err) {
        showAlert(controlAlert, err instanceof Error ? err.message : 'Action failed', 'err');
        document.getElementById('control-result').textContent = err instanceof Error ? err.message : 'Action failed.';
      }
      await refreshAll();
    };

    document.getElementById('login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const btn = event.target.querySelector('[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Connecting…';

      const payload = {
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        account: document.getElementById('account').value,
      };

      try {
        const data = await requestJson('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showAlert(authAlert, data.message || 'Login successful — browser launching', 'ok');
        document.getElementById('auth-result').textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        showAlert(authAlert, err instanceof Error ? err.message : 'Login failed', 'err');
        document.getElementById('auth-result').textContent = err instanceof Error ? err.message : 'Login failed.';
      }

      btn.disabled = false;
      btn.textContent = 'Launch Browser & Sign In';
      await refreshAll();
    });

    document.getElementById('refresh-btn').addEventListener('click', refreshAll);

    document.getElementById('logout-btn').addEventListener('click', async () => {
      try {
        const data = await requestJson('/api/logout', { method: 'POST' });
        showAlert(authAlert, data.message || 'Signed out', 'info');
        document.getElementById('auth-result').textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        showAlert(authAlert, err instanceof Error ? err.message : 'Logout failed', 'err');
      }
      await refreshAll();
    });

    document.getElementById('interact-btn').addEventListener('click', () => {
      void runControlAction('/api/interact', { method: 'POST' });
    });

    document.getElementById('clear-cookies-btn').addEventListener('click', () => {
      void runControlAction('/api/clear-cookies', { method: 'DELETE' });
    });

    document.getElementById('exit-btn').addEventListener('click', () => {
      void runControlAction('/api/exit', { method: 'POST' });
    });

    document.getElementById('cooldown-btn').addEventListener('click', () => {
      const minutes = Number(document.getElementById('cooldown-minutes').value || 60);
      void runControlAction('/api/cooldown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });
    });

    document.getElementById('tweet-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const text = document.getElementById('tweet-text').value;
      try {
        const payload = await requestJson('/api/post-tweet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        showAlert(twitterAlert, 'Tweet posted — ID ' + (payload.result?.id || 'ok'), 'ok');
      } catch (err) {
        showAlert(twitterAlert, err instanceof Error ? err.message : 'Tweet failed', 'err');
      }
      await refreshAll();
    });

    document.getElementById('tweet-media-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const text = document.getElementById('tweet-media-text').value;
      const fileInput = document.getElementById('tweet-media-file');
      const file = fileInput.files?.[0];
      if (!file) {
        showAlert(twitterAlert, 'Choose an image file', 'err');
        return;
      }
      const formData = new FormData();
      formData.append('text', text);
      formData.append('media', file);
      try {
        const response = await fetch('/api/twitter/post-media', { method: 'POST', body: formData });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Upload failed');
        showAlert(twitterAlert, 'Media tweet posted — ID ' + (payload.result?.id || 'ok'), 'ok');
        fileInput.value = '';
      } catch (err) {
        showAlert(twitterAlert, err instanceof Error ? err.message : 'Media tweet failed', 'err');
      }
      await refreshAll();
    });

    refreshAll();
    refreshTimer = setInterval(refreshAll, 15000);
  </script>
</body>
</html>`;
