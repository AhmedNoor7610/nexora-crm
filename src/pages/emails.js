// ── Nexora CRM — Email Integration Page ──────────────────────
import { api } from '../api.js';
import { showToast } from '../toast.js';
import { _esc } from '../utils.js';

const ICONS = {
  mail:     `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>`,
  send:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
  template: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  inbox:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  check:    `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  x:        `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  refresh:  `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
};

function statusBadge(status) {
  const cfg = {
    sent:    { cls: 'badge-success', label: 'Sent' },
    failed:  { cls: 'badge-danger',  label: 'Failed' },
    pending: { cls: 'badge-warning', label: 'Pending' },
    draft:   { cls: 'badge-neutral', label: 'Draft' },
  };
  const { cls, label } = cfg[status] || { cls: 'badge-neutral', label: status };
  return `<span class="badge ${cls}">${label}</span>`;
}

function relativeTime(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(isoStr).toLocaleDateString();
}

export async function renderEmails(container, user) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">${ICONS.mail} Email Center</h1>
        <p class="page-subtitle">Send, track, and manage CRM email communications</p>
      </div>
      <button class="btn btn-primary" id="compose-btn">${ICONS.send} Compose Email</button>
    </div>

    <div class="email-layout">
      <!-- Compose Drawer (hidden by default) -->
      <div class="email-compose-panel" id="compose-panel" style="display:none;">
        <div class="panel-header">
          <h3>${ICONS.send} New Email</h3>
          <button class="btn-icon" id="close-compose">×</button>
        </div>
        <form id="compose-form" class="compose-form">
          <div class="form-group">
            <label>Template</label>
            <select id="template-select" class="form-control">
              <option value="">— No template —</option>
            </select>
          </div>
          <div class="form-group">
            <label>To <span class="required">*</span></label>
            <input id="email-to" type="email" class="form-control" placeholder="recipient@example.com" required />
          </div>
          <div class="form-group">
            <label>Subject <span class="required">*</span></label>
            <input id="email-subject" type="text" class="form-control" placeholder="Email subject…" required />
          </div>
          <div class="form-group">
            <label>Body <span class="required">*</span></label>
            <textarea id="email-body" class="form-control" rows="8" placeholder="Write your message here…" required></textarea>
          </div>
          <div class="form-group">
            <label>Link to Entity (optional)</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <select id="entity-type" class="form-control">
                <option value="">— Type —</option>
                <option value="lead">Lead</option>
                <option value="contact">Contact</option>
                <option value="company">Company</option>
                <option value="deal">Deal</option>
              </select>
              <input id="entity-id" type="text" class="form-control" placeholder="Entity ID" />
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button type="submit" class="btn btn-primary" style="flex:1;">${ICONS.send} Send Email</button>
            <button type="button" class="btn btn-ghost" id="cancel-compose">Cancel</button>
          </div>
        </form>
      </div>

      <!-- Email History -->
      <div class="email-main">
        <div class="card">
          <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
            <h3>${ICONS.inbox} Email History</h3>
            <div style="display:flex;gap:8px;align-items:center;">
              <select id="filter-status" class="form-control" style="width:140px;">
                <option value="">All Status</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
              <button class="btn btn-ghost btn-sm" id="refresh-btn">${ICONS.refresh} Refresh</button>
            </div>
          </div>
          <div id="email-list-container">
            <div class="loading-state">Loading emails…</div>
          </div>
        </div>
      </div>
    </div>`;

  // Load templates
  try {
    const tplRes = await api.emails.templates();
    const sel = container.querySelector('#template-select');
    (tplRes.templates || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      opt.dataset.subject = t.subject;
      opt.dataset.body = t.body;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
      const opt = sel.selectedOptions[0];
      if (opt.dataset.subject) container.querySelector('#email-subject').value = opt.dataset.subject;
      if (opt.dataset.body)    container.querySelector('#email-body').value = opt.dataset.body;
    });
  } catch { /* templates optional */ }

  // Load & render email list
  async function loadEmails() {
    const listEl = container.querySelector('#email-list-container');
    const statusFilter = container.querySelector('#filter-status').value;
    listEl.innerHTML = '<div class="loading-state">Loading…</div>';
    try {
      const res = await api.emails.list(statusFilter ? { status: statusFilter } : {});
      const emails = res.emails || [];
      if (!emails.length) {
        listEl.innerHTML = '<div class="empty-state"><p>No emails yet. Compose your first email!</p></div>';
        return;
      }
      listEl.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>To</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Sent By</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${emails.map(e => `
                <tr class="email-row" data-id="${_esc(e.id || e._id)}">
                  <td>${_esc(e.to)}</td>
                  <td><strong>${_esc(e.subject)}</strong></td>
                  <td>${statusBadge(e.status)}</td>
                  <td>${_esc(e.senderName || '—')}</td>
                  <td class="text-muted">${relativeTime(e.sentAt || e.createdAt)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      listEl.innerHTML = `<div class="empty-state error-state"><p>Failed to load emails: ${_esc(err.message)}</p></div>`;
    }
  }

  await loadEmails();

  // Compose toggle
  container.querySelector('#compose-btn').addEventListener('click', () => {
    container.querySelector('#compose-panel').style.display = 'block';
  });
  container.querySelector('#close-compose').addEventListener('click', () => {
    container.querySelector('#compose-panel').style.display = 'none';
  });
  container.querySelector('#cancel-compose').addEventListener('click', () => {
    container.querySelector('#compose-panel').style.display = 'none';
  });

  // Filter change
  container.querySelector('#filter-status').addEventListener('change', loadEmails);
  container.querySelector('#refresh-btn').addEventListener('click', loadEmails);

  // Compose submit
  container.querySelector('#compose-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const payload = {
        to:         container.querySelector('#email-to').value.trim(),
        subject:    container.querySelector('#email-subject').value.trim(),
        body:       container.querySelector('#email-body').value.trim(),
        entityType: container.querySelector('#entity-type').value || undefined,
        entityId:   container.querySelector('#entity-id').value.trim() || undefined,
      };
      const res = await api.emails.send(payload);
      showToast(res.status === 'failed' ? `Email delivery failed: ${res.failureReason}` : 'Email sent successfully!', res.status === 'failed' ? 'error' : 'success');
      e.target.reset();
      container.querySelector('#compose-panel').style.display = 'none';
      await loadEmails();
    } catch (err) {
      showToast(`Send failed: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${ICONS.send} Send Email`;
    }
  });
}

