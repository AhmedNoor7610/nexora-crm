// ── Nexora CRM — Audit Log Page ──────────────────────────────
import { api } from '../api.js';
import { _esc } from '../utils.js';

const ICONS = {
  shield: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  filter: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  refresh:`<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
};

const ACTION_BADGES = {
  CREATE:        'badge-success',
  UPDATE:        'badge-info',
  DELETE:        'badge-danger',
  STAGE_CHANGE:  'badge-warning',
  ROLE_CHANGE:   'badge-warning',
  STATUS_CHANGE: 'badge-neutral',
  LOGIN:         'badge-info',
  LOGOUT:        'badge-neutral',
  EXPORT:        'badge-info',
  EMAIL_SENT:    'badge-info',
  FILE_UPLOAD:   'badge-info',
  FILE_DELETE:   'badge-danger',
  PASSWORD_RESET:'badge-warning',
};

function actionBadge(action) {
  const cls = ACTION_BADGES[action] || 'badge-neutral';
  return `<span class="badge ${cls}">${_esc(action.replace(/_/g, ' '))}</span>`;
}

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(isoStr).toLocaleString();
}

const ALLOWED_ROLES = new Set(['owner', 'admin', 'manager']);

export async function renderAuditLog(container, user) {
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">${ICONS.shield} Audit Log</h1>
      </div>
      <div class="card" style="text-align:center;padding:60px 24px;">
        <div style="font-size:48px;margin-bottom:16px;">🔒</div>
        <h2>Access Restricted</h2>
        <p class="text-muted">The Audit Log is only accessible to Owners, Admins, and Managers.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">${ICONS.shield} Audit Log</h1>
        <p class="page-subtitle">Complete trail of all system actions and changes</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <span style="font-weight:600;margin-right:auto;">${ICONS.filter} Filters</span>
        <select id="filter-action" class="form-control" style="width:160px;">
          <option value="">All Actions</option>
          ${Object.keys(ACTION_BADGES).map(a => `<option value="${a}">${a.replace(/_/g,' ')}</option>`).join('')}
        </select>
        <select id="filter-entity" class="form-control" style="width:140px;">
          <option value="">All Entities</option>
          <option value="lead">Lead</option>
          <option value="contact">Contact</option>
          <option value="company">Company</option>
          <option value="deal">Deal</option>
          <option value="activity">Activity</option>
          <option value="user">User</option>
          <option value="email">Email</option>
          <option value="attachment">Attachment</option>
        </select>
        <input id="filter-date" type="date" class="form-control" style="width:150px;" />
        <button class="btn btn-ghost btn-sm" id="refresh-btn">${ICONS.refresh} Refresh</button>
      </div>
      <div id="audit-list-container">
        <div class="loading-state">Loading audit log…</div>
      </div>
    </div>`;

  async function loadLogs() {
    const listEl = container.querySelector('#audit-list-container');
    listEl.innerHTML = '<div class="loading-state">Loading…</div>';
    const params = {};
    const action = container.querySelector('#filter-action').value;
    const entity = container.querySelector('#filter-entity').value;
    const date   = container.querySelector('#filter-date').value;
    if (action) params.action = action;
    if (entity) params.entityType = entity;
    if (date)   params.date = date;

    try {
      const res = await api.auditLogs.list(params);
      const logs = res.logs || [];
      if (!logs.length) {
        listEl.innerHTML = '<div class="empty-state"><p>No audit events match your filters.</p></div>';
        return;
      }
      listEl.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(log => `
                <tr>
                  <td class="text-muted" style="white-space:nowrap;">${relativeTime(log.createdAt)}</td>
                  <td>${_esc(log.userName || log.userId || '—')}</td>
                  <td>${actionBadge(log.action)}</td>
                  <td>
                    ${log.entityType ? `<span class="badge badge-neutral">${_esc(log.entityType)}</span>` : '—'}
                    ${log.entityName ? `<small class="text-muted"> ${_esc(log.entityName)}</small>` : ''}
                  </td>
                  <td class="text-muted" style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${_esc(JSON.stringify(log.details || {}))}">
                    ${_esc(log.details ? Object.entries(log.details).map(([k,v]) => `${k}: ${v}`).join(', ') : '—')}
                  </td>
                  <td class="text-muted"><code style="font-size:11px;">${_esc(log.ipAddress || '—')}</code></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      listEl.innerHTML = `<div class="empty-state error-state"><p>Failed to load audit logs: ${_esc(err.message)}</p></div>`;
    }
  }

  await loadLogs();

  ['#filter-action', '#filter-entity', '#filter-date'].forEach(sel => {
    container.querySelector(sel).addEventListener('change', loadLogs);
  });
  container.querySelector('#refresh-btn').addEventListener('click', loadLogs);
}

