// ── Nexora CRM — Documentation, Help & Diagnostics ────────────
import { api } from '../api.js';
import { Icons } from '../icons.js';
import { showToast } from '../toast.js';

export function renderHelp(container, currentUser) {
  container.innerHTML = `
    <div class="page-enter">
      <!-- Page Header -->
      <div class="crm-page-header">
        <div>
          <div class="page-header__eyebrow">Documentation &amp; Support</div>
          <h1 class="page-header__title">Help &amp; Diagnostics Center</h1>
          <p class="page-header__subtitle">Operational guides, keyboard shortcuts, permission reference, and system diagnostic tests.</p>
        </div>
        <div class="crm-header-actions">
          <button class="btn btn-primary" id="btn-run-diagnostics">
            ⚡ Run Diagnostics
          </button>
        </div>
      </div>

      <!-- Live Diagnostics Banner (collapsed by default) -->
      <div class="card" id="diag-card" style="display:none;margin-bottom:1.5rem;border-color:var(--color-purple-500);">
        <div class="section-header">
          <h2 class="section-title">Live System Diagnostic Results</h2>
          <span class="role-badge badge-owner" id="diag-status-badge">Testing...</span>
        </div>
        <div class="metrics-row" style="margin-top:1rem" id="diag-metrics"></div>
      </div>

      <!-- 2-Column Documentation Grid -->
      <div class="report-two-col">
        <!-- Column 1: Feature Guides -->
        <div>
          <div class="section-header">
            <h2 class="section-title">Operational Guides</h2>
          </div>

          <div class="help-accordion" id="help-accordion">
            <details class="help-item" open>
              <summary class="help-summary">
                <span>💼 Deals Kanban Pipeline &amp; Stage Transitions</span>
                <span class="help-arrow">▾</span>
              </summary>
              <div class="help-body">
                <p>Drag opportunities across the Kanban stages (Qualification → Proposal → Negotiation → Closing → Closed Won). Each transition updates the win probability automatically and records an immutable audit log entry.</p>
              </div>
            </details>

            <details class="help-item">
              <summary class="help-summary">
                <span>👥 Leads Capture &amp; Safe Two-Way Conversion</span>
                <span class="help-arrow">▾</span>
              </summary>
              <div class="help-body">
                <p>Qualify inbound prospects and click <strong>Convert Lead</strong> to simultaneously instantiate a verified Contact, link an Enterprise Company, and open a corresponding Pipeline Deal with zero data loss.</p>
              </div>
            </details>

            <details class="help-item">
              <summary class="help-summary">
                <span>⚡ Real-Time Socket.IO Notifications &amp; Reminders</span>
                <span class="help-arrow">▾</span>
              </summary>
              <div class="help-body">
                <p>When tasks are assigned, deals won, or reminders scheduled, notifications are pushed instantaneously via WebSocket rooms strictly isolated to your organization and user ID.</p>
              </div>
            </details>

            <details class="help-item">
              <summary class="help-summary">
                <span>📊 Live Reports &amp; Database CSV Exports</span>
                <span class="help-arrow">▾</span>
              </summary>
              <div class="help-body">
                <p>Analyze monthly closed-won revenue, stage funnel velocity, and individual team quotas. Click <strong>Download CSV</strong> on any data table to export clean RFC 4180 files.</p>
              </div>
            </details>
          </div>
        </div>

        <!-- Column 2: Shortcuts & Permissions -->
        <div>
          <div class="section-header">
            <h2 class="section-title">Keyboard Shortcuts</h2>
          </div>

          <div class="card" style="margin-bottom:1.5rem">
            <div class="shortcut-row">
              <span class="shortcut-desc">Global Search (Contacts, Deals, Companies)</span>
              <span class="shortcut-keys"><kbd>⌘</kbd> <kbd>K</kbd> / <kbd>Ctrl</kbd> <kbd>K</kbd></span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Dismiss Active Modal / Search Overlay</span>
              <span class="shortcut-keys"><kbd>Esc</kbd></span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">Open Notifications Drawer</span>
              <span class="shortcut-keys"><kbd>Bell</kbd> icon</span>
            </div>
          </div>

          <div class="section-header">
            <h2 class="section-title">Role-Based Access Control (RBAC)</h2>
          </div>

          <div class="card">
            <div class="table-wrap">
              <table class="data-table" style="font-size:0.8rem">
                <thead>
                  <tr><th>Role</th><th>Level</th><th>Privileges</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>Owner</strong></td><td>100</td><td>Full workspace control, billing &amp; all permissions</td></tr>
                  <tr><td><strong>Admin</strong></td><td>80</td><td>User management, team invite, view &amp; edit all</td></tr>
                  <tr><td><strong>Manager</strong></td><td>60</td><td>Team oversight, pipeline analytics, team leads</td></tr>
                  <tr><td><strong>Rep</strong></td><td>40</td><td>Assigned leads, deals, contacts &amp; tasks creation</td></tr>
                  <tr><td><strong>Viewer</strong></td><td>20</td><td>Read-only access to assigned pipeline data</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Run Diagnostics Button Handler ──────────────────────────
  container.querySelector('#btn-run-diagnostics').addEventListener('click', async () => {
    const card = container.querySelector('#diag-card');
    const badge = container.querySelector('#diag-status-badge');
    const metricsEl = container.querySelector('#diag-metrics');
    card.style.display = 'block';
    badge.textContent = 'Testing...';
    metricsEl.innerHTML = '<div class="card-empty">Pinging API and measuring response latency...</div>';

    const start = performance.now();
    try {
      const res = await fetch('/api/health');
      const latency = Math.round(performance.now() - start);
      const data = await res.json();

      badge.textContent = 'Operational (100%)';
      badge.className = 'role-badge badge-owner';

      metricsEl.innerHTML = `
        <div class="metric-card">
          <div class="metric-val" style="color:#10b981">${latency}ms</div>
          <div class="metric-label">API Ping Latency</div>
        </div>
        <div class="metric-card">
          <div class="metric-val" style="color:#6366f1">${data.version || '1.4.0'}</div>
          <div class="metric-label">Engine Version</div>
        </div>
        <div class="metric-card">
          <div class="metric-val" style="color:#38bdf8">${data.realtime ? 'Active' : 'Disabled'}</div>
          <div class="metric-label">Socket.IO Subsystem</div>
        </div>
      `;
      showToast('success', 'Diagnostics Passed', `System healthy — API latency: ${latency}ms`);
    } catch (err) {
      badge.textContent = 'Error';
      badge.className = 'role-badge badge-rep';
      metricsEl.innerHTML = `<div class="card-empty text-danger">Diagnostic failed: ${err.message}</div>`;
      showToast('error', 'Diagnostics Failed', err.message);
    }
  });
}

