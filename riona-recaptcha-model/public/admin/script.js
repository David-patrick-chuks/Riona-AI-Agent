const API_URL = '/api/admin';
let currentRange = '24h';

async function fetchStats() {
    try {
        const res = await fetch(`${API_URL}/stats?range=${currentRange}`);
        const data = await res.json();

        // Update Stats
        document.getElementById('stat-total').innerText = data.stats.total;
        document.getElementById('stat-accuracy').innerText = data.stats.accuracy + '%';
        document.getElementById('stat-confidence').innerText = data.stats.avgConfidence;

        // Update System
        document.getElementById('sys-mem').innerText = `MEM: ${data.system.memory}`;
        document.getElementById('sys-uptime').innerText = `UPTIME: ${data.system.uptime}`;

        // Update Top IPs
        const ipList = document.getElementById('top-ips-list');
        ipList.innerHTML = data.topIPs.length > 0
            ? data.topIPs.map(ip => `<div>${ip._id} (${ip.count})</div>`).join('')
            : '-';

        // Update Gallery
        const gallery = document.getElementById('image-gallery');
        const imagesWithUrl = data.recent.filter(log => log.imageUrl);
        gallery.innerHTML = imagesWithUrl.length > 0
            ? imagesWithUrl.map(log => `
                <div class="gallery-item" title="${log.filename} | Score: ${log.score}">
                    <img src="${log.imageUrl}" alt="prediction">
                    <div class="gallery-badge ${log.classification === 'CORRECT' ? 'status-valid' : 'status-invalid'}">
                        ${log.classification}
                    </div>
                </div>
            `).join('')
            : '<p style="color:#444; font-size: 0.8rem;">No images stored yet.</p>';

        // Update Logs
        const tbody = document.getElementById('logs-table');
        tbody.innerHTML = data.recent.map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleTimeString()}</td>
                <td>${log.filename}</td>
                <td>${log.score.toFixed(4)}</td>
                <td class="${log.classification === 'CORRECT' ? 'status-valid' : 'status-invalid'}">
                    ${log.classification}
                </td>
                <td>${log.ip || '-'}</td>
            </tr>
        `).join('');

        // Update Chart
        updateChart(data.graph);

    } catch (err) {
        console.error('Failed to fetch stats', err);
    }
}

function changeRange() {
    currentRange = document.getElementById('range-selector').value;
    fetchStats();
}

let chart;
function updateChart(graphData) {
    const ctx = document.getElementById('accuracyChart').getContext('2d');

    const labels = graphData.map(d => {
        const dt = new Date(d._id);
        return currentRange === '1h'
            ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : dt.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
    });
    const counts = graphData.map(d => d.count);
    const accuracy = graphData.map(d => d.count > 0 ? (d.correct / d.count) * 100 : 0);

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = accuracy;
        chart.data.datasets[1].data = counts;
        chart.update();
        return;
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Accuracy (%)',
                data: accuracy,
                borderColor: '#fff',
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: 'Traffic (req)',
                data: counts,
                backgroundColor: 'rgba(255,255,255,0.1)',
                type: 'bar',
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { labels: { color: '#ccc' } } },
            scales: {
                x: { ticks: { color: '#666' }, grid: { color: '#333' } },
                y: {
                    type: 'linear', display: true, position: 'left',
                    ticks: { color: '#666' }, grid: { color: '#333' },
                    max: 100
                },
                y1: {
                    type: 'linear', display: true, position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#666' }
                }
            }
        }
    });
}

async function clearLogs() {
    if (confirm('Are you sure you want to clear all data and images?')) {
        await fetch(`${API_URL}/logs`, { method: 'DELETE' });
        fetchStats();
    }
}

setInterval(fetchStats, 5000);
fetchStats();
