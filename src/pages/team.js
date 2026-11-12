// ── Nexora CRM — Team Management Page ────────────────────────
import { api } from '../api.js';
import { showToast } from '../toast.js';
import { Icons } from '../icons.js';

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
  return `$${val.toLocaleString()}`;
}

function roleBadgeClass(role) {
  const map = {
    owner: 'badge-owner',
    admin: 'badge-admin',
    manager: 'badge-manager',
    rep: 'badge-rep',
    viewer: 'badge-viewer',
  };
  return map[role] || 'badge-rep';
}

function canManageUsers(user) {
  return ['owner', 'admin'].includes(user?.role);
}

export function renderTeam(container, currentUser) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Team Management</h1>
        <p class="page-subtitle">Manage workspace members, role permissions, and track individual performance.</p>
      </div>
      ${canManageUsers(currentUser) ? `
        <button class="btn btn-primary" id="invite-btn">
          ${Icons.plus || '+'} Invite Member
        </button>
      ` : ''}
    </div>

    <div id="team-stats-bar" class="team-stats-bar">
      <div class="team-stat-card"><span class="team-stat-val" id="stat-total">—</span><span class="team-stat-label">Total Members</span></div>
      <div class="team-stat-card"><span class="team-stat-val" id="stat-active">—</span><span class="team-stat-label">Active Members</span></div>
      <div class="team-stat-card"><span class="team-stat-val" id="stat-owners">—</span><span class="team-stat-label">Owners &amp; Admins</span></div>
      <div class="team-stat-card"><span class="team-stat-val" id="stat-reps">—</span><span class="team-stat-label">Sales Reps</span></div>
    </div>

    <div class="section-header" style="margin-top:1.5rem">
      <h2 class="section-title">Performance Leaderboard</h2>
    </div>
    <div class="card" style="margin-bottom:2rem">
      <div class="table-wrap">
        <table class="data-table" id="perf-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Member</th>
              <th>Role</th>
              <th>Deals Won</th>
              <th>Revenue Won</th>
              <th>Pipeline</th>
              <th>Tasks Done</th>
              <th>Win Rate</th>
            </tr>
          </thead>
          <tbody id="perf-tbody">
            <tr><td colspan="8" class="table-empty">Loading performance data...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="section-header">
      <h2 class="section-title">Team Directory</h2>
    </div>
    <div id="member-grid" class="member-grid">
      <div class="card-empty">Loading team directory...</div>
    </div>
  `;

  loadTeam(container, currentUser);

  const inviteBtn = container.querySelector('#invite-btn');
  if (inviteBtn) {
    inviteBtn.addEventListener('click', () => openInviteModal(container, currentUser));
  }
}

async function loadTeam(container, currentUser) {
  try {
    const data = await api.team.list();
    const members = data.users || [];

    // Stats Bar
    const totalEl  = container.querySelector('#stat-total');
    const activeEl = container.querySelector('#stat-active');
    const ownersEl = container.querySelector('#stat-owners');
    const repsEl   = container.querySelector('#stat-reps');

    if (totalEl)  totalEl.textContent  = members.length;
    if (activeEl) activeEl.textContent = members.filter(u => u.isActive).length;
    if (ownersEl) ownersEl.textContent = members.filter(u => ['owner', 'admin'].includes(u.role)).length;
    if (repsEl)   repsEl.textContent   = members.filter(u => u.role === 'rep').length;

    // Leaderboard table
    const tbody = container.querySelector('#perf-tbody');
    if (tbody) {
      const sorted = [...members].sort((a, b) => (b.metrics?.revenueWon || 0) - (a.metrics?.revenueWon || 0));
      tbody.innerHTML = sorted.length === 0
        ? '<tr><td colspan="8" class="table-empty">No team metrics available</td></tr>'
        : sorted.map((u, i) => {
          const m = u.metrics || {};
          return `
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
              <td><span class="role-badge ${roleBadgeClass(u.role)}">${_esc(u.roleTitle || u.role)}</span></td>
              <td><strong>${m.dealsWon || 0}</strong></td>
              <td><strong>${fmtCurrency(m.revenueWon)}</strong></td>
              <td>${fmtCurrency(m.pipelineValue)}</td>
              <td>${m.activitiesDone || 0} / ${m.activitiesTotal || 0}</td>
              <td>
                <div class="win-rate-bar">
                  <div class="win-rate-fill" style="width:${m.winRate || 0}%"></div>
                  <span>${m.winRate || 0}%</span>
                </div>
              </td>
            </tr>`;
        }).join('');
    }

    // Members Grid
    const grid = container.querySelector('#member-grid');
    if (grid) {
      grid.innerHTML = members.length === 0
        ? '<div class="card-empty">No team members found.</div>'
        : members.map(u => renderMemberCard(u, currentUser)).join('');

      // Wire action buttons
      grid.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          const userId = btn.dataset.userId;
          if (action === 'role')   openRoleModal(container, userId, members, currentUser);
          if (action === 'status') toggleStatus(container, userId, members, currentUser);
        });
      });
    }
  } catch (err) {
    showToast('error', 'Team Load Failed', err.message);
    const grid = container.querySelector('#member-grid');
    if (grid) grid.innerHTML = `<div class="card-empty text-danger">${_esc(err.message)}</div>`;
  }
}

function renderMemberCard(u, currentUser) {
  const m = u.metrics || {};
  const statusClass = u.isActive ? 'status-active' : 'status-inactive';
  const statusLabel = u.isActive ? 'Active' : 'Inactive';
  const canManage = canManageUsers(currentUser);
  const isSelf = u.id === currentUser?.id;
  const isOwner = u.role === 'owner';
  const callerIsAdmin = currentUser?.role === 'admin';
  const canEdit = canManage && !isSelf && !(callerIsAdmin && isOwner);

  return `
    <div class="member-card ${u.isActive ? '' : 'member-card-inactive'}">
      <div class="member-card-header">
        <div class="user-avatar user-avatar-lg">${_esc(u.avatar)}</div>
        <div class="member-card-info">
          <div class="member-name">
            ${_esc(u.name)}
            ${isSelf ? '<span class="self-badge">You</span>' : ''}
          </div>
          <div class="member-title">${_esc(u.title || 'Team Member')}</div>
          <div class="member-dept">${_esc(u.department || 'General')}</div>
        </div>
        <span class="member-status ${statusClass}">${statusLabel}</span>
      </div>

      <div class="member-role-row">
        <span class="role-badge ${roleBadgeClass(u.role)}">${_esc(u.roleTitle || u.role)}</span>
        <span class="member-email" title="${_esc(u.email)}">${_esc(u.email)}</span>
      </div>

      <div class="member-metrics">
        <div class="member-metric">
          <span class="metric-num">${m.dealsWon || 0}</span>
          <label>Won Deals</label>
        </div>
        <div class="member-metric">
          <span class="metric-num">${fmtCurrency(m.revenueWon)}</span>
          <label>Revenue</label>
        </div>
        <div class="member-metric">
          <span class="metric-num">${m.winRate || 0}%</span>
          <label>Win Rate</label>
        </div>
      </div>

      ${canEdit ? `
        <div class="member-card-actions">
          <button class="btn btn-sm btn-outline" data-action="role" data-user-id="${_esc(u.id)}">
            Change Role
          </button>
          <button class="btn btn-sm ${u.isActive ? 'btn-danger-outline' : 'btn-outline'}" data-action="status" data-user-id="${_esc(u.id)}">
            ${u.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ` : ''}
    </div>`;
}

function openRoleModal(container, userId, members, currentUser) {
  const targetUser = members.find(u => u.id === userId);
  if (!targetUser) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const callerIsAdmin = currentUser?.role === 'admin';
  const availableRoles = [
    { key: 'viewer', label: 'Viewer (Read-Only)' },
    { key: 'rep', label: 'Sales Representative' },
    { key: 'manager', label: 'Sales Manager' },
    { key: 'admin', label: 'Administrator' },
    ...(callerIsAdmin ? [] : [{ key: 'owner', label: 'Owner (Full Access)' }]),
  ];

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Change Role — ${_esc(targetUser.name)}</h3>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Select Workspace Role</label>
          <select class="form-select" id="role-select">
            ${availableRoles.map(r => `
              <option value="${r.key}" ${r.key === targetUser.role ? 'selected' : ''}>
                ${r.label}
              </option>
            `).join('')}
          </select>
        </div>
        <p class="form-hint">Role permissions will update immediately upon saving.</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-save">Save Role</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.querySelector('#modal-cancel').addEventListener('click', close);

  overlay.querySelector('#modal-save').addEventListener('click', async () => {
    const newRole = overlay.querySelector('#role-select').value;
    try {
      await api.team.updateRole(userId, newRole);
      showToast('success', 'Role Updated', `${targetUser.name}'s role updated to ${newRole}.`);
      close();
      await loadTeam(container, currentUser);
    } catch (err) {
      showToast('error', 'Update Failed', err.message);
    }
  });

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

async function toggleStatus(container, userId, members, currentUser) {
  const targetUser = members.find(u => u.id === userId);
  if (!targetUser) return;

  const newStatus = !targetUser.isActive;
  const actionName = newStatus ? 'activate' : 'deactivate';

  if (!confirm(`Are you sure you want to ${actionName} ${targetUser.name}?`)) return;

  try {
    await api.team.updateStatus(userId, newStatus);
    showToast('success', 'Status Updated', `${targetUser.name} has been ${actionName}d.`);
    await loadTeam(container, currentUser);
  } catch (err) {
    showToast('error', 'Update Failed', err.message);
  }
}

function openInviteModal(container, currentUser) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const callerIsAdmin = currentUser?.role === 'admin';
  const availableRoles = [
    { key: 'rep', label: 'Sales Representative' },
    { key: 'manager', label: 'Sales Manager' },
    { key: 'viewer', label: 'Viewer' },
    { key: 'admin', label: 'Administrator' },
    ...(callerIsAdmin ? [] : [{ key: 'owner', label: 'Owner' }]),
  ];

  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header">
        <h3 class="modal-title">Invite Team Member</h3>
        <button class="modal-close" id="modal-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input class="form-input" id="inv-name" type="text" placeholder="e.g. Rachel Adams" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input class="form-input" id="inv-email" type="email" placeholder="rachel@nexora.io" required>
          </div>
          <div class="form-group">
            <label class="form-label">Role</label>
            <select class="form-select" id="inv-role">
              ${availableRoles.map(r => `<option value="${r.key}">${r.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Department</label>
            <input class="form-input" id="inv-dept" type="text" placeholder="Enterprise Sales">
          </div>
          <div class="form-group">
            <label class="form-label">Job Title</label>
            <input class="form-input" id="inv-title" type="text" placeholder="Senior Account Executive">
          </div>
          <div class="form-group">
            <label class="form-label">Temporary Password *</label>
            <input class="form-input" id="inv-pass" type="password" placeholder="At least 8 characters" required>
          </div>
        </div>
        <p class="form-hint" style="margin-top:0.75rem">
          The invited employee will be created immediately with active status and can log in with these credentials.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-save">Send Invitation</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').addEventListener('click', close);
  overlay.querySelector('#modal-cancel').addEventListener('click', close);

  overlay.querySelector('#modal-save').addEventListener('click', async () => {
    const name       = overlay.querySelector('#inv-name').value.trim();
    const email      = overlay.querySelector('#inv-email').value.trim();
    const role       = overlay.querySelector('#inv-role').value;
    const department = overlay.querySelector('#inv-dept').value.trim() || 'General';
    const title      = overlay.querySelector('#inv-title').value.trim();
    const password   = overlay.querySelector('#inv-pass').value;

    if (!name || !email || !password) {
      showToast('warning', 'Validation', 'Full name, email, and password are required.');
      return;
    }
    if (password.length < 8) {
      showToast('warning', 'Validation', 'Password must be at least 8 characters long.');
      return;
    }

    try {
      const saveBtn = overlay.querySelector('#modal-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Inviting...';

      await api.team.invite({ name, email, role, department, title, password });
      showToast('success', 'Invitation Sent', `${name} added to your team.`);
      close();
      await loadTeam(container, currentUser);
    } catch (err) {
      showToast('error', 'Invite Failed', err.message);
      const saveBtn = overlay.querySelector('#modal-save');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Send Invitation';
      }
    }
  });

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

