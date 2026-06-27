export const metricsHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Riona — Metrics</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0b080a;
      --surface: #130e12;
      --surface-2: #1a1318;
      --border: #3a2434;
      --text: #f8eef3;
      --text-muted: #b894a8;
      --text-dim: #7d6473;
      --accent: #ff5fa2;
      --accent-hover: #ff85b8;
      --accent-deep: #c93a7a;
      --accent-glow: rgba(255, 95, 162, 0.16);
      --success: #3fb950;
      --danger: #ff6b7a;
      --radius-lg: 14px;
      --shadow: 0 1px 3px rgba(0,0,0,.4), 0 8px 24px rgba(255, 95, 162, 0.06);
    }

    *, *::before, *::after { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: 'Inter', system-ui, sans-serif;
      background:
        radial-gradient(ellipse 70% 45% at 8% -5%, rgba(255, 95, 162, 0.14), transparent),
        radial-gradient(ellipse 50% 35% at 95% 0%, rgba(201, 58, 122, 0.1), transparent),
        var(--bg);
      color: var(--text);
      min-height: 100vh;
    }

    .app {
      display: grid;
      grid-template-columns: 220px 1fr;
      min-height: 100vh;
    }

    .sidebar {
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
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
      background: linear-gradient(135deg, var(--accent), var(--accent-deep));
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      color: white;
    }

    .brand-name { font-size: 15px; font-weight: 700; }
    .brand-sub { font-size: 11px; color: var(--text-muted); }

    .nav-item {
      display: block;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      text-decoration: none;
      transition: background 0.15s, color 0.15s;
    }

    .nav-item:hover { background: var(--surface-2); color: var(--text); }
    .nav-item.active { background: var(--accent-glow); color: var(--accent-hover); }

    .main { padding: 28px 32px; overflow-y: auto; }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 16px;
    }

    .page-title {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 4px;
      letter-spacing: -0.03em;
    }

    .page-sub { font-size: 13px; color: var(--text-muted); margin: 0; }

    .btn {
      padding: 9px 16px;
      border-radius: 8px;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      background: var(--accent);
      color: white;
      transition: background 0.15s;
    }

    .btn:hover { background: var(--accent-hover); }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
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
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.03em;
    }

    .stat-value.bad { color: var(--danger); }

    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 22px 24px;
      box-shadow: var(--shadow);
      margin-bottom: 20px;
    }

    .panel-title {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 16px;
    }

    .codes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
    }

    .code-card {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px;
      text-align: center;
    }

    .code-card .stat-value { font-size: 22px; }

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
    }

    tbody td {
      padding: 11px 12px;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
    }

    tbody tr:hover td { background: var(--surface-2); }
    tbody tr:last-child td { border-bottom: none; }

    .bad { color: var(--danger); }

    @media (max-width: 768px) {
      .app { grid-template-columns: 1fr; }
      .sidebar { display: none; }
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
      <a class="nav-item" href="/dashboard">Overview</a>
      <a class="nav-item active" href="/metrics">Metrics</a>
    </aside>

    <main class="main">
      <div class="page-header">
        <div>
          <h1 class="page-title">Metrics</h1>
          <p class="page-sub">Real-time server performance</p>
        </div>
        <button class="btn" id="refresh" type="button">↻ Refresh</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Uptime</div>
          <div class="stat-value" id="uptime" style="font-size:18px">—</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Requests</div>
          <div class="stat-value" id="total">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Errors</div>
          <div class="stat-value bad" id="errors">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Error Rate</div>
          <div class="stat-value" id="errorRate">0%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Rate Limit Hits</div>
          <div class="stat-value" id="rateLimits">0</div>
        </div>
      </div>

      <div class="panel">
        <p class="panel-title">Status Codes</p>
        <div class="codes-grid" id="statusCodes">
          <div class="code-card"><div class="stat-label">—</div><div class="stat-value" style="font-size:14px;color:var(--text-dim)">Loading…</div></div>
        </div>
      </div>

      <div class="panel">
        <p class="panel-title">Endpoints</p>
        <table>
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Requests</th>
              <th>Errors</th>
              <th>Avg Response</th>
            </tr>
          </thead>
          <tbody id="endpoints">
            <tr><td colspan="4" style="color:var(--text-dim)">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>

  <script>
    const load = async () => {
      try {
        const res = await fetch('/api/metrics');
        const data = await res.json();
        document.getElementById('uptime').textContent = data.uptimeFormatted || '—';
        document.getElementById('total').textContent = data.totalRequests ?? 0;
        document.getElementById('errors').textContent = data.totalErrors ?? 0;
        document.getElementById('errorRate').textContent = data.errorRate ?? '0%';
        document.getElementById('rateLimits').textContent = data.rateLimitHits ?? 0;

        const codes = Object.entries(data.statusCodes || {});
        document.getElementById('statusCodes').innerHTML = codes.length
          ? codes.map(([code, count]) =>
              '<div class="code-card"><div class="stat-label">HTTP ' + code + '</div><div class="stat-value">' + count + '</div></div>'
            ).join('')
          : '<div class="code-card"><div class="stat-label">—</div><div class="stat-value" style="font-size:14px;color:var(--text-dim)">No data yet</div></div>';

        const endpoints = Object.entries(data.endpoints || {}).sort((a, b) => b[1].count - a[1].count);
        document.getElementById('endpoints').innerHTML = endpoints.length
          ? endpoints.map(([ep, d]) =>
              '<tr><td>' + ep + '</td><td>' + d.count + '</td><td class="bad">' + d.errors + '</td><td>' + d.avgMs + 'ms</td></tr>'
            ).join('')
          : '<tr><td colspan="4" style="color:var(--text-dim)">No requests yet</td></tr>';
      } catch (e) {
        console.error(e);
      }
    };

    document.getElementById('refresh').onclick = load;
    load();
    setInterval(load, 10000);
  </script>
</body>
</html>`;
