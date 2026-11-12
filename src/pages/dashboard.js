// ── Nexora CRM — Dashboard Page ────────────────────────────
import { Icons } from '../icons.js';
import { api } from '../api.js';

// ── Sparkline SVG generator ──
function sparkline(values, color = '#7c3aed') {
  if (!values || values.length < 2) return '';
  const w = 120, h = 36, pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + ((1 - (v - min) / range) * (h - pad * 2));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `${pts[0].split(',')[0]},${h} ${pts.join(' ')} ${pts[pts.length-1].split(',')[0]},${h}`;
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sg-${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <polygon points="${area}" fill="url(#sg-${color.replace('#','')})"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ── Revenue Bar Chart SVG ──
function revenueChart(monthlyData) {
  if (!monthlyData?.length) return '<p style="color:var(--text-muted);text-align:center;padding:40px 0">Loading chart…</p>';
  const w = 700, h = 200, pad = { top: 10, right: 10, bottom: 40, left: 50 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  const maxVal = Math.max(...monthlyData.map(d => d.value));
  const barW = (cw / monthlyData.length) * 0.55;
  const gap  = cw / monthlyData.length;

  const bars = monthlyData.map((d, i) => {
    const bh = (d.value / maxVal) * ch;
    const x = pad.left + i * gap + (gap - barW) / 2;
    const y = pad.top + ch - bh;
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}"
        rx="4" ry="4"
        fill="url(#bar-grad)"
        class="chart-bar"
        style="cursor:pointer;"
        data-label="${d.label}" data-value="${d.value}"
      />
      <text x="${(x + barW/2).toFixed(1)}" y="${(h - pad.bottom/2 + 8).toFixed(1)}"
        text-anchor="middle" fill="var(--text-disabled)" font-size="11" font-family="Inter,sans-serif">
        ${d.label}
      </text>
    `;
  }).join('');

  // Y-axis grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const y = pad.top + ch - pct * ch;
    const val = (pct * maxVal / 1000).toFixed(0);
    return `
      <line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${w - pad.right}" y2="${y.toFixed(1)}"
        stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="4,4"/>
      <text x="${pad.left - 8}" y="${(y+4).toFixed(1)}" text-anchor="end"
        fill="var(--text-disabled)" font-size="10" font-family="Inter,sans-serif">$${val}k</text>
    `;
  }).join('');

  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
    <defs>
      <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#2563eb" stop-opacity="0.7"/>
      </linearGradient>
    </defs>
    ${gridLines}
    ${bars}
  </svg>`;
}

// ── Pipeline donut ──
function pipelineList(stages) {
  if (!stages?.length) return '';
  const gradients = [
    'linear-gradient(90deg,#7c3aed,#2563eb)',
    'linear-gradient(90deg,#2563eb,#06b6d4)',
    'linear-gradient(90deg,#06b6d4,#10b981)',
    'linear-gradient(90deg,#f59e0b,#f43f5e)',
    'linear-gradient(90deg,#10b981,#34d399)',
  ];
  const total = stages.reduce((s, st) => s + st.count, 0);
  return stages.map((st, i) => `
    <div class="pipeline-stage">
      <div class="pipeline-stage__header">
        <span class="pipeline-stage__label">${st.name}</span>
        <span class="pipeline-stage__value">${st.count} deals · $${(st.value/1000).toFixed(0)}k</span>
      </div>
      <div class="pipeline-bar">
        <div class="pipeline-bar__fill" style="background:${gradients[i % gradients.length]};width:${((st.count/total)*100).toFixed(1)}%"></div>
      </div>
    </div>
  `).join('');
}

// ── Stat Cards ──
function statCards(stats) {
  if (!stats) return '<div class="skeleton" style="height:120px;"></div>'.repeat(4);
  return stats.map(s => `
    <div class="stat-card card--glow">
      <div class="stat-card__shine"></div>
      <div class="stat-card__header">
        <div class="stat-card__icon icon-${s.color}">${Icons[s.icon] || Icons.activity}</div>
        <div class="stat-card__trend stat-card__trend--${s.trend >= 0 ? 'up' : 'down'}">
          ${s.trend >= 0 ? Icons.trending : Icons.trendingDown}
          ${Math.abs(s.trend)}%
        </div>
      </div>
      <div class="stat-card__value">${s.value}</div>
      <div class="stat-card__label">${s.label}</div>
      <div class="stat-card__sparkline">${sparkline(s.sparkline, s.trend >= 0 ? '#10b981' : '#f43f5e')}</div>
    </div>
  `).join('');
}

// ── Activity Feed ──
function activityList(activities) {
  if (!activities?.length) return '<p style="color:var(--text-muted);padding:20px 0">No recent activity</p>';
  const typeMap = {
    deal:    { icon: 'deals',    bg: 'icon-purple' },
    contact: { icon: 'contacts', bg: 'icon-blue'   },
    task:    { icon: 'tasks',    bg: 'icon-teal'   },
    note:    { icon: 'mail',     bg: 'icon-amber'  },
    call:    { icon: 'phone',    bg: 'icon-emerald' },
  };
  return activities.map(a => {
    const t = typeMap[a.type] || typeMap.contact;
    return `
      <div class="activity-item">
        <div class="activity-dot ${t.bg}">${Icons[t.icon] || Icons.activity}</div>
        <div class="activity-body">
          <div class="activity-text">${a.text}</div>
          <div class="activity-time">${a.time}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Tasks ──
function tasksList(tasks) {
  if (!tasks?.length) return '<p style="color:var(--text-muted);padding:20px 0">No upcoming tasks</p>';
  return tasks.map(t => `
    <div class="task-item">
      <div class="task-checkbox" role="checkbox" aria-checked="false" tabindex="0"></div>
      <div class="task-content">
        <div class="task-title">${t.title}</div>
        <div class="task-due">Due: ${t.due}</div>
      </div>
      <span class="task-priority priority-${t.priority}">${t.priority}</span>
    </div>
  `).join('');
}

// ── Team Leaderboard ──
function leaderboardList(team) {
  if (!team?.length) return '';
  return team.map((m, i) => `
    <div class="leaderboard-item">
      <span class="leaderboard-rank${i < 3 ? ' top' : ''}">${i < 3 ? '★' : i+1}</span>
      <div class="user-avatar" style="width:32px;height:32px;font-size:0.75rem;flex-shrink:0">${m.name[0]}</div>
      <div class="leaderboard-info">
        <div class="leaderboard-name">${m.name}</div>
        <div class="leaderboard-meta">${m.deals} deals closed</div>
      </div>
      <div class="leaderboard-value">$${(m.revenue/1000).toFixed(0)}k</div>
    </div>
  `).join('');
}

// ── Main render ──
export async function renderDashboard(container, user) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header__eyebrow">Overview</div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
          <div>
            <h1 class="page-header__title">Good morning, ${(user?.name || 'there').split(' ')[0]} 👋</h1>
            <p class="page-header__subtitle">Here's what's happening in your business today</p>
          </div>
          <div style="display:flex;gap:0.75rem;">
            <button class="btn btn--secondary btn--sm" id="dash-cal-btn" title="View Activity Calendar">
              ${Icons.calendar}
              ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </button>
            <button class="btn btn--primary btn--sm" id="add-deal-btn">
              ${Icons.plus}
              New Deal
            </button>
          </div>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="stats-grid" id="stats-grid">
        <div class="skeleton" style="height:160px;border-radius:var(--radius-xl);"></div>
        <div class="skeleton" style="height:160px;border-radius:var(--radius-xl);"></div>
        <div class="skeleton" style="height:160px;border-radius:var(--radius-xl);"></div>
        <div class="skeleton" style="height:160px;border-radius:var(--radius-xl);"></div>
      </div>

      <!-- Main grid -->
      <div class="dashboard-grid">
        <!-- Main column -->
        <div class="dashboard-col-main">

          <!-- Revenue Chart -->
          <div class="chart-card">
            <div class="chart-card__header">
              <div>
                <div class="chart-card__title">Revenue Overview</div>
                <div class="chart-card__subtitle">Monthly revenue performance</div>
              </div>
              <div class="chart-tabs" role="tablist">
                <button class="chart-tab active" role="tab" data-range="6m" aria-selected="true">6M</button>
                <button class="chart-tab" role="tab" data-range="1y" aria-selected="false">1Y</button>
                <button class="chart-tab" role="tab" data-range="ytd" aria-selected="false">YTD</button>
              </div>
            </div>
            <div class="chart-wrapper" id="revenue-chart">
              <div class="skeleton" style="height:100%;border-radius:var(--radius-md);"></div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="card">
            <div class="section-header">
              <div>
                <div class="section-title">Recent Activity</div>
                <div class="section-subtitle" style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">Live updates from your team</div>
              </div>
              <button class="btn btn--ghost btn--sm" id="dash-view-activity-btn">View all ${Icons.arrowRight}</button>
            </div>
            <div class="activity-list" id="activity-list">
              ${[1,2,3,4].map(() => `<div class="skeleton" style="height:52px;margin-bottom:8px;border-radius:var(--radius-md);"></div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Side column -->
        <div class="dashboard-col-side">

          <!-- Sales Pipeline -->
          <div class="card">
            <div class="section-header">
              <div>
                <div class="section-title">Sales Pipeline</div>
                <div class="section-subtitle" style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">Deal stages overview</div>
              </div>
              <button class="btn btn--ghost btn--sm" id="dash-pipeline-details-btn">Details ${Icons.arrowRight}</button>
            </div>
            <div class="pipeline-list" id="pipeline-list">
              ${[1,2,3,4,5].map(() => `<div class="skeleton" style="height:44px;margin-bottom:8px;border-radius:var(--radius-md);"></div>`).join('')}
            </div>
          </div>

          <!-- Top Performers -->
          <div class="card">
            <div class="section-header">
              <div>
                <div class="section-title">Top Performers</div>
                <div class="section-subtitle" style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">This month's leaders</div>
              </div>
            </div>
            <div class="leaderboard-list" id="leaderboard-list">
              ${[1,2,3].map(() => `<div class="skeleton" style="height:52px;margin-bottom:8px;border-radius:var(--radius-lg);"></div>`).join('')}
            </div>
          </div>

          <!-- Upcoming Tasks -->
          <div class="card">
            <div class="section-header">
              <div>
                <div class="section-title">Upcoming Tasks</div>
                <div class="section-subtitle" style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px;">Your action items</div>
              </div>
              <button class="btn btn--primary btn--sm" id="dash-new-task-btn" title="Create Task">${Icons.plus}</button>
            </div>
            <div class="tasks-list" id="tasks-list">
              ${[1,2,3].map(() => `<div class="skeleton" style="height:60px;margin-bottom:8px;border-radius:var(--radius-lg);"></div>`).join('')}
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  // Load all dashboard data in parallel
  try {
    const [stats, revenue, activity, pipeline, tasks, team] = await Promise.all([
      api.dashboard.stats(),
      api.dashboard.revenue(),
      api.dashboard.activity(),
      api.dashboard.pipeline(),
      api.dashboard.tasks(),
      api.dashboard.team(),
    ]);

    // Render stats
    document.getElementById('stats-grid').innerHTML = statCards(stats);

    // Render revenue chart
    document.getElementById('revenue-chart').innerHTML = revenueChart(revenue?.monthly);

    // Chart tab switching
    const tabs = document.querySelectorAll('.chart-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        const range = tab.dataset.range;
        if (range === '6m') {
          document.getElementById('revenue-chart').innerHTML = revenueChart(revenue?.monthly);
        } else {
          document.getElementById('revenue-chart').innerHTML = revenueChart(revenue?.yearly || revenue?.monthly);
        }
      });
    });

    // Wire action and navigation buttons
    document.getElementById('add-deal-btn')?.addEventListener('click', () => { window.location.hash = '#deals'; });
    document.getElementById('dash-cal-btn')?.addEventListener('click', () => { window.location.hash = '#calendar'; });
    document.getElementById('dash-view-activity-btn')?.addEventListener('click', () => { window.location.hash = '#tasks'; });
    document.getElementById('dash-pipeline-details-btn')?.addEventListener('click', () => { window.location.hash = '#pipeline'; });
    document.getElementById('dash-new-task-btn')?.addEventListener('click', () => { window.location.hash = '#tasks'; });

    // Render activity
    document.getElementById('activity-list').innerHTML = activityList(activity);

    // Render pipeline
    document.getElementById('pipeline-list').innerHTML = pipelineList(pipeline);

    // Render team leaderboard
    document.getElementById('leaderboard-list').innerHTML = leaderboardList(team);

    // Render tasks
    document.getElementById('tasks-list').innerHTML = tasksList(tasks);

    // Task checkbox interaction
    document.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('click', function() {
        const checked = this.getAttribute('aria-checked') === 'true';
        this.setAttribute('aria-checked', (!checked).toString());
        this.style.background = !checked ? 'var(--accent-primary)' : '';
        this.style.borderColor = !checked ? 'var(--accent-primary)' : '';
        if (!checked) {
          this.innerHTML = Icons.check;
          this.querySelector('svg').style.cssText = 'width:10px;height:10px;stroke:white;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;';
        } else {
          this.innerHTML = '';
        }
      });
    });

  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}
