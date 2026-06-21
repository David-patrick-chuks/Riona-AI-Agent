export const metricsHtml = `<!doctype html>
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
</html>`;
