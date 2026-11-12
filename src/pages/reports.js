// ── Nexora CRM — Reports & Analytics Page ────────────────────
import { api } from '../api.js';
import { showToast } from '../toast.js';

function _esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtCurrency(val) {
  if (!val) return '$0';
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${Number(val).toLocaleString()}`;
}

const TABS = [
  { id: 'revenue',      label: 'Revenue Analytics' },
  { id: 'pipeline',     label: 'Pipeline Funnel' },
  { id: 'team',         label: 'Team Performance' },
  { id: 'activity',     label: 'Activity Summary' },
  { id: 'sales-targets',label: '🎯 Sales Targets' },
  { id: 'yoy',          label: '📊 Year-over-Year' },
  { id: 'lead-sources', label: '🔍 Lead Sources' },
  { id: 'lost-deals',   label: '❌ Lost Deals' },
  { id: 'rep-activities',label: '👤 Rep Activities' },
  { id: 'exports',      label: 'Data Exports' },
];

export function renderReports(container, currentUser) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Reports &amp; Analytics</h1>
        <p class="page-subtitle">Real-time revenue metrics, funnel velocity, and downloadable org data.</p>
      </div>
    </div>

    <div class="tab-bar">
      ${TABS.map((t, i) => `
        <button class="tab-btn${i === 0 ? ' active' : ''}" data-tab="${t.id}">${_esc(t.label)}</button>
      `).join('')}
    </div>

    <div id="report-content" class="report-content" style="margin-top:1.5rem"></div>
  `;

  const content = container.querySelector('#report-content');

  function switchTab(tabId) {
    container.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
    renderTab(tabId, content, currentUser);
  }

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  switchTab('revenue');
}

function renderTab(tabId, content, currentUser) {
  content.innerHTML = '<div class="card-empty">Loading report data...</div>';
  if (tabId === 'revenue')       renderRevenue(content);
  else if (tabId === 'pipeline')      renderPipeline(content);
  else if (tabId === 'team')          renderTeamPerf(content);
  else if (tabId === 'activity')      renderActivityReport(content);
  else if (tabId === 'sales-targets') renderSalesTargets(content);
  else if (tabId === 'yoy')           renderYoY(content);
  else if (tabId === 'lead-sources')  renderLeadSources(content);
  else if (tabId === 'lost-deals')    renderLostDeals(content);
  else if (tabId === 'rep-activities')renderRepActivities(content);
  else if (tabId === 'exports')       renderExports(content, currentUser);
}

// ── 1. Revenue Analytics Tab ──────────────────────────────────
async function renderRevenue(content) {
  try {
    const [rev3, rev6, rev12] = await Promise.all([
      api.reports.revenue({ period: 3 }),
      api.reports.revenue({ period: 6 }),
      api.reports.revenue({ period: 12 }),
    ]);

    const datasets = { 3: rev3, 6: rev6, 12: rev12 };

    content.innerHTML = `
      <div class="report-header-row">
        <div>
          <h2 class="section-title">Revenue Trajectory</h2>
          <p class="page-subtitle">Closed won deals aggregated by close date.</p>
        </div>
        <div class="btn-group" id="period-switcher">
          <button class="btn btn-sm btn-outline active" data-period="3">3 Months</button>
          <button class="btn btn-sm btn-outline" data-period="6">6 Months</button>
          <button class="btn btn-sm btn-outline" data-period="12">12 Months</button>
        </div>
      </div>

      <div class="metrics-row" id="rev-metrics" style="margin-top:1rem"></div>

      <div class="card" style="margin:1.5rem 0">
        <div class="chart-container" id="rev-chart" style="min-height:220px;display:flex;align-items:center;justify-content:center;"></div>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Period (Month)</th>
                <th>Total Revenue</th>
                <th>Deals Closed</th>
                <th>Avg. Deal Size</th>
              </tr>
            </thead>
            <tbody id="rev-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    function updateView(period) {
      const data = datasets[period] || {};
      const months = data.revenue || [];
      const totalRev = data.totalRevenue || 0;
      const totalDeals = data.totalDeals || 0;
      const avgDeal = totalDeals > 0 ? Math.round(totalRev / totalDeals) : 0;

      // Metric cards
      const metricsEl = content.querySelector('#rev-metrics');
      if (metricsEl) {
        metricsEl.innerHTML = `
          <div class="metric-card">
            <div class="metric-val">${fmtCurrency(totalRev)}</div>
            <div class="metric-label">Total Won Revenue</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">${totalDeals}</div>
            <div class="metric-label">Deals Closed Won</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">${fmtCurrency(avgDeal)}</div>
            <div class="metric-label">Average Won Deal Size</div>
          </div>
        `;
      }

      // SVG Chart
      const chartEl = content.querySelector('#rev-chart');
      if (chartEl) {
        if (months.length === 0) {
          chartEl.innerHTML = '<div class="chart-empty" style="color:var(--text-muted);padding:40px 0;">No won deals recorded in this period.</div>';
        } else {
          const maxVal = Math.max(...months.map(m => m.revenue), 1000);
          const chartH = 220, chartW = 600, padL = 60, padB = 40, padT = 20;
          const cw = chartW - padL - 20;
          const ch = chartH - padB - padT;
          const barW = Math.max(16, Math.floor(cw / (months.length * 2)));
          const gap = cw / months.length;

          const bars = months.map((m, i) => {
            const bh = Math.round((m.revenue / maxVal) * ch);
            const x = padL + i * gap + (gap - barW) / 2;
            const y = padT + ch - bh;
            return `
              <rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="4" fill="url(#rev-grad)">
                <title>${m.month}: ${fmtCurrency(m.revenue)} (${m.count} deals)</title>
              </rect>
              <text x="${x + barW / 2}" y="${chartH - 12}" text-anchor="middle" font-size="11" fill="var(--text-muted,#94a3b8)">
                ${m.month}
              </text>
              ${bh > 16 ? `
                <text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--text-primary,#0f172a)">
                  ${fmtCurrency(m.revenue)}
                </text>` : ''}
            `;
          }).join('');

          const ySteps = [0, 0.5, 1].map(pct => {
            const y = padT + ch - pct * ch;
            const val = fmtCurrency(Math.round(pct * maxVal));
            return `
              <line x1="${padL}" y1="${y}" x2="${chartW - 20}" y2="${y}" stroke="var(--border-subtle,#e2e8f0)" stroke-width="1" stroke-dasharray="4,4"/>
              <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--text-muted,#94a3b8)">${val}</text>
            `;
          }).join('');

          chartEl.innerHTML = `
            <svg viewBox="0 0 ${chartW} ${chartH}" style="width:100%;height:100%;max-height:220px;" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.9"/>
                  <stop offset="100%" stop-color="#2563eb" stop-opacity="0.8"/>
                </linearGradient>
              </defs>
              ${ySteps}
              ${bars}
            </svg>`;
        }
      }

      // Breakdown table
      const tbody = content.querySelector('#rev-tbody');
      if (tbody) {
        tbody.innerHTML = months.length === 0
          ? '<tr><td colspan="4" class="table-empty">No revenue history available</td></tr>'
          : months.map(m => `
            <tr>
              <td><strong>${_esc(m.month)}</strong></td>
              <td>${fmtCurrency(m.revenue)}</td>
              <td>${m.count}</td>
              <td>${fmtCurrency(m.count > 0 ? Math.round(m.revenue / m.count) : 0)}</td>
            </tr>
          `).join('');
      }
    }

    updateView(3);

    content.querySelector('#period-switcher').addEventListener('click', e => {
      const btn = e.target.closest('[data-period]');
      if (!btn) return;
      content.querySelectorAll('#period-switcher .btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateView(parseInt(btn.dataset.period, 10));
    });
  } catch (err) {
    content.innerHTML = `<div class="card-empty text-danger">${_esc(err.message)}</div>`;
    showToast('error', 'Report Load Failed', err.message);
  }
}

// ── 2. Pipeline Report Tab ────────────────────────────────────
async function renderPipeline(content) {
  try {
    const data = await api.reports.pipelineSummary();
    const stages = data.stages || [];
    const maxVal = Math.max(...stages.map(s => s.value), 1);

    const stageColors = {
      qualification: '#6366f1',
      proposal: '#8b5cf6',
      negotiation: '#f59e0b',
      closing: '#10b981',
      won: '#059669',
      lost: '#ef4444',
    };

    content.innerHTML = `
      <div class="report-header-row">
        <div>
          <h2 class="section-title">Sales Pipeline Distribution</h2>
          <p class="page-subtitle">Value and volume across all sales pipeline stages.</p>
        </div>
      </div>

      <div class="metrics-row" style="margin-top:1rem">
        <div class="metric-card">
          <div class="metric-val">${data.totalDeals || 0}</div>
          <div class="metric-label">Total Deals Tracked</div>
        </div>
        <div class="metric-card">
          <div class="metric-val">${fmtCurrency(data.totalPipelineValue)}</div>
          <div class="metric-label">Active Pipeline Value</div>
        </div>
      </div>

      <div class="card" style="margin-top:1.5rem">
        <div class="funnel-container">
          ${stages.map(s => {
            const pct = Math.max(4, Math.round((s.value / maxVal) * 100));
            const color = stageColors[s.stage] || '#6366f1';
            return `
              <div class="pipeline-funnel-row">
                <div class="funnel-label">
                  <strong>${_esc(s.label)}</strong>
                  <span class="funnel-meta">${s.count} deals · ${s.avgProbability}% prob</span>
                </div>
                <div class="funnel-bar-wrap">
                  <div class="funnel-bar" style="width:${pct}%;background:${color};"></div>
                </div>
                <div class="funnel-value">${fmtCurrency(s.value)}</div>
              </div>`;
          }).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="card-empty text-danger">${_esc(err.message)}</div>`;
  }
}

// ── 3. Team Performance Tab ──────────────────────────────────
async function renderTeamPerf(content) {
  try {
    const data = await api.reports.teamPerformance();
    const perf = data.performance || [];

    content.innerHTML = `
      <div class="report-header-row">
        <div>
          <h2 class="section-title">Team Performance Matrix</h2>
          <p class="page-subtitle">Ranked individual sales conversion and revenue contribution.</p>
        </div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team Member</th>
                <th>Role</th>
                <th>Won</th>
                <th>Lost</th>
                <th>Revenue Won</th>
                <th>Active Pipeline</th>
                <th>Tasks Completed</th>
                <th>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              ${perf.length === 0 ? '<tr><td colspan="9" class="table-empty">No performance data found</td></tr>' :
                perf.map((u, i) => `
                  <tr class="${u.isActive ? '' : 'row-inactive'}">
                    <td><span class="rank-badge rank-${i < 3 ? i + 1 : 'other'}">${i + 1}</span></td>
                    <td>
                      <div class="user-cell">
                        <div class="user-avatar user-avatar-sm">${_esc(u.avatar)}</div>
                        <div>
                          <div class="user-cell-name">${_esc(u.name)}</div>
                          <div class="user-cell-dept">${_esc(u.department || 'General')}</div>
                        </div>
                      </div>
                    </td>
                    <td>${_esc(u.roleTitle || u.role)}</td>
                    <td><strong>${u.dealsWon}</strong></td>
                    <td>${u.dealsLost}</td>
                    <td><strong>${fmtCurrency(u.revenueWon)}</strong></td>
                    <td>${fmtCurrency(u.pipelineValue)}</td>
                    <td>${u.activitiesDone} / ${u.activitiesTotal}</td>
                    <td>
                      <div class="win-rate-bar">
                        <div class="win-rate-fill" style="width:${u.winRate}%"></div>
                        <span>${u.winRate}%</span>
                      </div>
                    </td>
                  </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="card-empty text-danger">${_esc(err.message)}</div>`;
  }
}

// ── 4. Activity Report Tab ───────────────────────────────────
async function renderActivityReport(content) {
  try {
    const data = await api.reports.activitySummary();
    const byType   = data.byType   || [];
    const byStatus = data.byStatus || [];

    content.innerHTML = `
      <div class="report-header-row">
        <div>
          <h2 class="section-title">Activity &amp; Task Metrics</h2>
          <p class="page-subtitle">Breakdown of calls, meetings, notes, and tasks.</p>
        </div>
      </div>

      <div class="metrics-row" style="margin:1rem 0">
        <div class="metric-card">
          <div class="metric-val">${data.total || 0}</div>
          <div class="metric-label">Total Logged Activities</div>
        </div>
      </div>

      <div class="report-two-col">
        <div class="card">
          <div class="section-header">
            <h3 class="section-title" style="font-size:1rem">Activities by Type</h3>
          </div>
          <div class="stat-list">
            ${byType.map(t => `
              <div class="activity-stat-row">
                <span class="act-type-label" style="text-transform:capitalize">${_esc(t.type)}</span>
                <span class="act-type-count">${t.count}</span>
              </div>`).join('') || '<div class="card-empty">No activity type data</div>'}
          </div>
        </div>

        <div class="card">
          <div class="section-header">
            <h3 class="section-title" style="font-size:1rem">Activities by Status</h3>
          </div>
          <div class="stat-list">
            ${byStatus.map(s => `
              <div class="activity-stat-row">
                <span class="act-type-label" style="text-transform:capitalize">${_esc(s.status)}</span>
                <span class="act-type-count">${s.count}</span>
              </div>`).join('') || '<div class="card-empty">No status data</div>'}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="card-empty text-danger">${_esc(err.message)}</div>`;
  }
}

// ── 5. Data Exports Tab ───────────────────────────────────────
function renderExports(content, currentUser) {
  const exportCards = [
    {
      key: 'leads',
      label: 'Leads Directory',
      desc: 'All organization leads with qualification status, score, company, and owner.',
      icon: '👥',
      url: '/api/reports/export/leads',
      filename: 'nexora-leads.csv',
    },
    {
      key: 'contacts',
      label: 'Contacts Directory',
      desc: 'Complete contacts database with email, phone, company, and lifecycle stages.',
      icon: '📋',
      url: '/api/reports/export/contacts',
      filename: 'nexora-contacts.csv',
    },
    {
      key: 'deals',
      label: 'Pipeline Deals',
      desc: 'Full opportunity data: amounts, stages, probability, close dates, and company.',
      icon: '💼',
      url: '/api/reports/export/deals',
      filename: 'nexora-deals.csv',
    },
    {
      key: 'activities',
      label: 'Activities & Tasks',
      desc: 'All scheduled and completed tasks, calls, meetings, and outcomes.',
      icon: '📅',
      url: '/api/reports/export/activities',
      filename: 'nexora-activities.csv',
    },
  ];

  content.innerHTML = `
    <div class="report-header-row">
      <div>
        <h2 class="section-title">Database CSV Exports</h2>
        <p class="page-subtitle">Download clean CSV files containing your organization's live data.</p>
      </div>
    </div>

    <div class="export-grid" style="margin-top:1.5rem">
      ${exportCards.map(e => `
        <div class="export-card">
          <div class="export-icon">${e.icon}</div>
          <div class="export-info">
            <div class="export-label">${_esc(e.label)}</div>
            <div class="export-desc">${_esc(e.desc)}</div>
          </div>
          <button class="btn btn-primary export-btn" data-url="${e.url}" data-filename="${e.filename}">
            ↓ Download CSV
          </button>
        </div>`).join('')}
    </div>

    <div class="card" style="margin-top:2rem;background:var(--bg-subtle,#f8fafc)">
      <div style="font-size:0.875rem;color:var(--text-muted,#64748b);">
        <strong>🔒 Multi-Tenant Data Protection:</strong> All exports are strictly scoped to your organization. Data from other organizations is completely isolated and cannot be accessed.
      </div>
    </div>
  `;

  // Attach authenticated download handler
  content.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = btn.dataset.url;
      const filename = btn.dataset.filename;
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Exporting...';

      const token = sessionStorage.getItem('nexora_token') || localStorage.getItem('nexora_token');
      try {
        const res = await fetch(url, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
          throw new Error(err.message || `Download failed: HTTP ${res.status}`);
        }

        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);

        showToast('success', 'Export Complete', `${filename} downloaded successfully.`);
      } catch (err) {
        showToast('error', 'Export Failed', err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });

  // PDF Export button
  const pdfBtn = document.createElement('button');
  pdfBtn.className = 'btn btn-outline';
  pdfBtn.style.marginTop = '1rem';
  pdfBtn.innerHTML = '📄 Export Full Report as PDF';
  pdfBtn.addEventListener('click', () => window.open('/api/reports/export/pdf', '_blank'));
  content.appendChild(pdfBtn);
}

// ── 6. Sales Targets Tab ─────────────────────────────────────
async function renderSalesTargets(content) {
  try {
    const res = await api.reports.salesTargets({});
    const rows = res.monthlyTargets || [];
    const reps = res.repAttainment || [];
    content.innerHTML = `
      <div class="report-header-row">
        <div>
          <h2 class="section-title">🎯 Sales Targets vs Actual</h2>
          <p class="page-subtitle">Monthly revenue targets vs achieved, with rep-level attainment.</p>
        </div>
      </div>
      <div class="stats-grid" style="margin-top:1rem;">
        <div class="stat-card">
          <div class="stat-label">Total Target</div>
          <div class="stat-value">${fmtCurrency(res.totalTarget || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Achieved</div>
          <div class="stat-value">${fmtCurrency(res.totalAchieved || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Attainment</div>
          <div class="stat-value">${res.attainmentPct || 0}%</div>
        </div>
      </div>
      <div class="card" style="margin-top:1.5rem;">
        <div class="card-header"><h3>Monthly Breakdown</h3></div>
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Month</th><th>Target</th><th>Actual</th><th>Attainment</th><th>Progress</th></tr></thead>
            <tbody>
              ${rows.map(r => {
                const pct = r.target > 0 ? Math.min(100, Math.round((r.actual / r.target) * 100)) : 0;
                const cls = pct >= 100 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#ef4444';
                return `<tr>
                  <td>${_esc(r.month)}</td>
                  <td>${fmtCurrency(r.target)}</td>
                  <td>${fmtCurrency(r.actual)}</td>
                  <td>${pct}%</td>
                  <td><div style="background:#e5e7eb;border-radius:4px;height:8px;width:120px;"><div style="background:${cls};width:${pct}%;height:8px;border-radius:4px;"></div></div></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ${reps.length ? `
      <div class="card" style="margin-top:1.5rem;">
        <div class="card-header"><h3>Rep Attainment</h3></div>
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Rep</th><th>Target</th><th>Achieved</th><th>Attainment</th></tr></thead>
            <tbody>
              ${reps.map(r => `<tr>
                <td>${_esc(r.name)}</td>
                <td>${fmtCurrency(r.target)}</td>
                <td>${fmtCurrency(r.actual)}</td>
                <td><span class="badge ${r.attainmentPct >= 100 ? 'badge-success' : r.attainmentPct >= 80 ? 'badge-warning' : 'badge-danger'}">${r.attainmentPct}%</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}`;
  } catch (err) {
    content.innerHTML = `<div class="card-empty">Failed to load sales targets: ${_esc(err.message)}</div>`;
  }
}

// ── 7. Year-over-Year Comparison Tab ─────────────────────────
async function renderYoY(content) {
  try {
    const res = await api.reports.yoyComparison();
    const months = res.months || [];
    const maxVal = Math.max(...months.map(m => Math.max(m.currentYear || 0, m.previousYear || 0)), 1);
    content.innerHTML = `
      <div class="report-header-row">
        <div>
          <h2 class="section-title">📊 Year-over-Year Revenue</h2>
          <p class="page-subtitle">Compare revenue performance vs same period last year.</p>
        </div>
      </div>
      <div class="stats-grid" style="margin-top:1rem;">
        <div class="stat-card">
          <div class="stat-label">This Year (Total)</div>
          <div class="stat-value">${fmtCurrency(res.currentYearTotal || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Last Year (Total)</div>
          <div class="stat-value">${fmtCurrency(res.previousYearTotal || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">YoY Growth</div>
          <div class="stat-value" style="color:${res.growthPct >= 0 ? '#10b981' : '#ef4444'}">
            ${res.growthPct >= 0 ? '▲' : '▼'} ${Math.abs(res.growthPct || 0)}%
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:1.5rem;overflow-x:auto;">
        <div class="card-header"><h3>Monthly Comparison</h3></div>
        <div style="padding:1.5rem;">
          <div style="display:flex;align-items:flex-end;gap:8px;height:160px;">
            ${months.map(m => {
              const cy = Math.round(((m.currentYear || 0) / maxVal) * 140);
              const py = Math.round(((m.previousYear || 0) / maxVal) * 140);
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
                <div style="display:flex;gap:2px;align-items:flex-end;height:140px;">
                  <div style="width:12px;height:${py}px;background:#94a3b8;border-radius:2px 2px 0 0;" title="Prev: ${fmtCurrency(m.previousYear)}"></div>
                  <div style="width:12px;height:${cy}px;background:#6366f1;border-radius:2px 2px 0 0;" title="Curr: ${fmtCurrency(m.currentYear)}"></div>
                </div>
                <div style="font-size:10px;color:#64748b;">${_esc(m.month)}</div>
              </div>`;
            }).join('')}
          </div>
          <div style="display:flex;gap:16px;margin-top:8px;font-size:12px;">
            <span><span style="display:inline-block;width:12px;height:8px;background:#94a3b8;border-radius:2px;"></span> Previous Year</span>
            <span><span style="display:inline-block;width:12px;height:8px;background:#6366f1;border-radius:2px;"></span> Current Year</span>
          </div>
        </div>
      </div>`;
  } catch (err) {
    content.innerHTML = `<div class="card-empty">Failed to load YoY comparison: ${_esc(err.message)}</div>`;
  }
}

// ── 8. Lead Sources Tab ───────────────────────────────────────
async function renderLeadSources(content) {
  try {
    const res = await api.reports.leadSources();
    const sources = res.sources || [];
    content.innerHTML = `
      <div class="report-header-row">
        <div>
          <h2 class="section-title">🔍 Lead Source Performance</h2>
          <p class="page-subtitle">Attribution breakdown by lead source with conversion rates.</p>
        </div>
      </div>
      <div class="card" style="margin-top:1.5rem;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Total Leads</th>
                <th>Converted</th>
                <th>Conversion Rate</th>
                <th>Won Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${sources.map(s => `<tr>
                <td><strong>${_esc(s.source)}</strong></td>
                <td>${s.totalLeads}</td>
                <td>${s.converted}</td>
                <td><span class="badge ${s.conversionRate >= 50 ? 'badge-success' : s.conversionRate >= 25 ? 'badge-warning' : 'badge-neutral'}">${s.conversionRate}%</span></td>
                <td>${fmtCurrency(s.wonRevenue)}</td>
              </tr>`).join('')}
              ${!sources.length ? '<tr><td colspan="5" class="text-center text-muted">No lead source data available</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (err) {
    content.innerHTML = `<div class="card-empty">Failed to load lead sources: ${_esc(err.message)}</div>`;
  }
}

// ── 9. Lost Deals Analysis Tab ────────────────────────────────
async function renderLostDeals(content) {
  try {
    const res = await api.reports.lostDeals();
    const reasons = res.byReason || [];
    const deals = res.recentLostDeals || [];
    content.innerHTML = `
      <div class="report-header-row">
        <div>
          <h2 class="section-title">❌ Lost Deal Analysis</h2>
          <p class="page-subtitle">Understand why deals are lost to improve win rates.</p>
        </div>
      </div>
      <div class="stats-grid" style="margin-top:1rem;">
        <div class="stat-card">
          <div class="stat-label">Total Lost</div>
          <div class="stat-value">${res.totalLost || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Lost Revenue</div>
          <div class="stat-value" style="color:#ef4444;">${fmtCurrency(res.lostRevenue || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg Deal Size</div>
          <div class="stat-value">${fmtCurrency(res.avgLostDealSize || 0)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:1.5rem;flex-wrap:wrap;">
        <div class="card">
          <div class="card-header"><h3>Loss Reasons</h3></div>
          <div class="table-responsive">
            <table class="data-table">
              <thead><tr><th>Reason</th><th>Count</th><th>Revenue Lost</th></tr></thead>
              <tbody>
                ${reasons.map(r => `<tr>
                  <td>${_esc(r.reason)}</td>
                  <td>${r.count}</td>
                  <td>${fmtCurrency(r.revenue)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Recent Lost Deals</h3></div>
          <div class="table-responsive">
            <table class="data-table">
              <thead><tr><th>Deal</th><th>Value</th><th>Reason</th></tr></thead>
              <tbody>
                ${deals.slice(0, 10).map(d => `<tr>
                  <td>${_esc(d.name)}</td>
                  <td>${fmtCurrency(d.value)}</td>
                  <td><small class="text-muted">${_esc(d.lostReason || 'No reason given')}</small></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  } catch (err) {
    content.innerHTML = `<div class="card-empty">Failed to load lost deals: ${_esc(err.message)}</div>`;
  }
}

// ── 10. Rep Activities Tab ────────────────────────────────────
async function renderRepActivities(content) {
  try {
    const res = await api.reports.repActivities();
    const reps = res.reps || [];
    content.innerHTML = `
      <div class="report-header-row">
        <div>
          <h2 class="section-title">👤 Rep Activity Reports</h2>
          <p class="page-subtitle">Breakdown of activities per sales representative.</p>
        </div>
      </div>
      <div class="card" style="margin-top:1.5rem;">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Rep</th>
                <th>Calls</th>
                <th>Meetings</th>
                <th>Emails</th>
                <th>Demos</th>
                <th>Notes</th>
                <th>Total</th>
                <th>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              ${reps.map(r => `<tr>
                <td><strong>${_esc(r.name)}</strong><br><small class="text-muted">${_esc(r.role)}</small></td>
                <td>${r.calls || 0}</td>
                <td>${r.meetings || 0}</td>
                <td>${r.emails || 0}</td>
                <td>${r.demos || 0}</td>
                <td>${r.notes || 0}</td>
                <td><strong>${r.total || 0}</strong></td>
                <td><span class="badge ${r.completionRate >= 80 ? 'badge-success' : r.completionRate >= 50 ? 'badge-warning' : 'badge-neutral'}">${r.completionRate || 0}%</span></td>
              </tr>`).join('')}
              ${!reps.length ? '<tr><td colspan="8" class="text-center text-muted">No rep activity data available</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (err) {
    content.innerHTML = `<div class="card-empty">Failed to load rep activities: ${_esc(err.message)}</div>`;
  }
}

