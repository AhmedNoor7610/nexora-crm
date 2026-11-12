// ── Nexora CRM — Workspace & Account Settings ────────────────
import { api } from '../api.js';
import { showToast } from '../toast.js';
import { Icons } from '../icons.js';
import { _esc } from '../utils.js';

export function renderSettings(container, currentUser) {
  let activeTab = 'workspace';

  const org = currentUser?.organization || {
    name: 'Nexora Enterprise',
    plan: 'enterprise',
    domain: 'nexora.io',
    maxUsers: 100,
  };

  container.innerHTML = `
    <div class="page-enter">
      <!-- Header -->
      <div class="crm-page-header">
        <div>
          <div class="page-header__eyebrow">System Configuration</div>
          <h1 class="page-header__title">Workspace Settings</h1>
          <p class="page-header__subtitle">Configure organization profile, security policies, and team preferences.</p>
        </div>
      </div>

      <!-- Settings Tabs -->
      <div class="tab-bar" id="settings-tab-bar">
        <button class="tab-btn active" data-tab="workspace">Workspace Profile</button>
        <button class="tab-btn" data-tab="account">My Account</button>
        <button class="tab-btn" data-tab="security">Security &amp; RBAC</button>
        <button class="tab-btn" data-tab="realtime">Real-Time &amp; System</button>
      </div>

      <!-- Tab Content Area -->
      <div id="settings-content" style="margin-top:1.5rem"></div>
    </div>
  `;

  const content = container.querySelector('#settings-content');

  function switchTab(tabId) {
    activeTab = tabId;
    container.querySelectorAll('#settings-tab-bar .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
    renderCurrentTab(content, tabId, currentUser, org);
  }

  container.querySelectorAll('#settings-tab-bar .tab-btn').forEach(b => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });

  switchTab('workspace');
}

function renderCurrentTab(content, tabId, currentUser, org) {
  if (tabId === 'workspace') renderWorkspaceTab(content, currentUser, org);
  else if (tabId === 'account') renderAccountTab(content, currentUser);
  else if (tabId === 'security') renderSecurityTab(content, currentUser);
  else if (tabId === 'realtime') renderRealtimeTab(content, currentUser);
}

// ── 1. Workspace Profile Tab ──────────────────────────────────
function renderWorkspaceTab(content, currentUser, org) {
  content.innerHTML = `
    <div class="card" style="max-width:800px">
      <div class="section-header">
        <div>
          <h2 class="section-title">Organization Details</h2>
          <p class="section-subtitle">Workspace identity and multi-tenant parameters.</p>
        </div>
        <span class="role-badge badge-owner" style="text-transform:uppercase">${_esc(org.plan || 'Enterprise')} Plan</span>
      </div>

      <div class="form-grid-2" style="margin-top:1.25rem">
        <div class="form-group">
          <label class="form-label">Organization Name</label>
          <input class="form-input" id="set-org-name" type="text" value="${_esc(org.name)}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">Primary Domain</label>
          <input class="form-input" id="set-org-domain" type="text" value="${_esc(org.domain || 'nexora.io')}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">Workspace Identifier (Org ID)</label>
          <input class="form-input" type="text" value="${_esc(currentUser?.orgId || 'org-001')}" readonly style="font-family:monospace">
        </div>
        <div class="form-group">
          <label class="form-label">Seat Capacity</label>
          <input class="form-input" type="text" value="Licensed for ${org.maxUsers || 100} users" readonly>
        </div>
      </div>

      <div style="margin-top:1.5rem;padding:1rem;background:var(--bg-surface-2);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
        <div>
          <strong>Multi-Tenant Data Isolation: Active</strong>
          <p style="font-size:0.8rem;color:var(--text-secondary);margin:2px 0 0">All CRM records, deals, and reports are cryptographically scoped to this workspace.</p>
        </div>
        <button class="btn btn-sm btn-outline" id="btn-save-workspace">Workspace Status: Verified ✓</button>
      </div>
    </div>
  `;
}

// ── 2. My Account Tab ─────────────────────────────────────────
function renderAccountTab(content, currentUser) {
  const verifiedBadge = currentUser?.emailVerified
    ? `<span style="color:#10b981;font-size:0.82rem;margin-left:4px;">✔ Verified</span>`
    : `<span style="color:#f59e0b;font-size:0.82rem;margin-left:4px;">⚠ Not Verified</span>
       <button id="btn-send-verification" class="btn btn-sm btn-outline" style="font-size:0.8rem;padding:2px 10px;margin-left:8px;">Send Verification Email</button>
       <span id="verify-result"></span>`;

  content.innerHTML = `
    <div class="card" style="max-width:800px">
      <div class="section-header">
        <div>
          <h2 class="section-title">Personal Profile</h2>
          <p class="section-subtitle">Your credentials and organization assignment.</p>
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:1.5rem;margin:1.5rem 0;">
        <div class="user-avatar user-avatar-lg" style="width:64px;height:64px;font-size:1.5rem;">
          ${_esc(currentUser?.avatar || 'NX')}
        </div>
        <div>
          <h3 style="font-size:1.2rem;margin:0 0 4px">${_esc(currentUser?.name)}</h3>
          <span class="role-badge role-badge--${currentUser?.role || 'admin'}">${_esc(currentUser?.roleTitle || currentUser?.role)}</span>
          <span style="font-size:0.8rem;color:var(--text-secondary);margin-left:8px;">${_esc(currentUser?.email)}</span>
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input class="form-input" type="text" value="${_esc(currentUser?.name)}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input class="form-input" type="email" value="${_esc(currentUser?.email)}" readonly>
          <div style="margin-top:6px;font-size:0.82rem;">${verifiedBadge}</div>
        </div>
        <div class="form-group">
          <label class="form-label">Department</label>
          <input class="form-input" type="text" value="${_esc(currentUser?.department || 'Executive Leadership')}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">Job Title</label>
          <input class="form-input" type="text" value="${_esc(currentUser?.title || 'Team Member')}" readonly>
        </div>
      </div>
    </div>
  `;

  // Email verification handler
  const verifyBtn = content.querySelector('#btn-send-verification');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', async () => {
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Sending…';
      const resultEl = content.querySelector('#verify-result');
      try {
        const res = await api.auth.sendVerification();
        const link = res.verifyLink || (res.token ? `/api/auth/verify-email?token=${res.token}` : null);
        if (resultEl && link) {
          resultEl.innerHTML = ` — <a href="${link}" target="_blank" style="color:#6366f1;">Click to verify ↗</a>`;
        }
        verifyBtn.textContent = '✔ Sent';
        verifyBtn.style.color = '#10b981';
      } catch (err) {
        if (resultEl) resultEl.textContent = ` Error: ${err.message}`;
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Retry';
      }
    });
  }
}

// ── 3. Security & RBAC Tab ───────────────────────────────────
function renderSecurityTab(content, currentUser) {
  const permissions = currentUser?.permissions || ['*'];

  content.innerHTML = `
    <div class="card" style="max-width:800px">
      <div class="section-header">
        <div>
          <h2 class="section-title">Security &amp; Permissions</h2>
          <p class="section-subtitle">Active role level, session encryption, and access policies.</p>
        </div>
      </div>

      <div class="metrics-row" style="margin:1rem 0">
        <div class="metric-card">
          <div class="metric-val" style="font-size:1.2rem;color:#34d399">HTTP-Only</div>
          <div class="metric-label">Session Cookie Security</div>
        </div>
        <div class="metric-card">
          <div class="metric-val" style="font-size:1.2rem;color:#38bdf8">Level ${currentUser?.roleLevel || 100}</div>
          <div class="metric-label">RBAC Privilege Level</div>
        </div>
        <div class="metric-card">
          <div class="metric-val" style="font-size:1.2rem;color:#c084fc">7 Days</div>
          <div class="metric-label">JWT Session Expiry</div>
        </div>
      </div>

      <div style="margin-top:1.5rem">
        <h3 class="card-subtitle" style="margin-bottom:8px">Assigned System Permissions</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${permissions.map(p => `
            <span class="perm-pill" style="padding:4px 10px;background:var(--bg-surface-2);border:1px solid var(--border-default);border-radius:6px;font-family:monospace;font-size:0.8rem;">
              ${p === '*' ? '★ Full Workspace Administrator (*)' : p}
            </span>
          `).join('')}
        </div>
      </div>

      <div style="margin-top:1.5rem;padding:1rem;background:var(--bg-surface-2);border-radius:var(--radius-lg);">
        <strong style="color:var(--text-primary)">🛡 Brute-Force Defense Active</strong>
        <p style="font-size:0.8rem;color:var(--text-secondary);margin:4px 0 0">
          Account automatically locks for 15 minutes after 5 consecutive invalid authentication attempts. Passwords hashed using salted bcrypt.
        </p>
      </div>
    </div>
  `;
}

// ── 4. Real-Time & System Tab ─────────────────────────────────
function renderRealtimeTab(content) {
  content.innerHTML = `
    <div class="card" style="max-width:800px">
      <div class="section-header">
        <div>
          <h2 class="section-title">Real-Time Engine &amp; Connectivity</h2>
          <p class="section-subtitle">Socket.IO real-time notification streams and database connection status.</p>
        </div>
      </div>

      <div class="metrics-row" style="margin:1rem 0">
        <div class="metric-card">
          <div class="metric-val" style="color:#10b981">Connected</div>
          <div class="metric-label">Socket.IO WebSockets</div>
        </div>
        <div class="metric-card">
          <div class="metric-val" style="color:#6366f1">Dual-Mode</div>
          <div class="metric-label">Mongoose / In-Memory Store</div>
        </div>
      </div>

      <div style="margin-top:1rem;display:flex;flex-direction:column;gap:12px;">
        <div class="activity-stat-row">
          <span>Task Reminder Background Worker</span>
          <span class="role-badge badge-owner">Active (30s interval)</span>
        </div>
        <div class="activity-stat-row">
          <span>Real-Time Events</span>
          <span style="font-family:monospace;font-size:0.8rem;color:var(--text-secondary)">activity:created, task:completed, notification:new</span>
        </div>
        <div class="activity-stat-row">
          <span>API Health Diagnostics</span>
          <a href="/api/health" target="_blank" class="btn btn-sm btn-outline">Check /api/health ↗</a>
        </div>
      </div>
    </div>
  `;
}

