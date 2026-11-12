// ── Nexora CRM — Real-Time Notifications Panel ──────────────
// Persistent dropdown panel with live Badge counter,
// org- and user-scoped notifications, and Socket.IO real-time delivery.
import { Icons } from './icons.js';
import { api } from './api.js';
import { showToast } from './toast.js';
import { onSocketEvent } from './socket-client.js';

// ── State ────────────────────────────────────────────────────
let panelOpen = false;
let notifications = [];
let unreadCount = 0;
let socketCleanup = null;
let bellBtnRef = null;
let badgeRef = null;
let panelRef = null;

// ── Bootstrap Notifications in Topbar ───────────────────────
export function initNotificationsWidget(topbarEl, user) {
  bellBtnRef = topbarEl.querySelector('#topbar-notif-btn');
  badgeRef = topbarEl.querySelector('.topbar__notif-dot');

  if (!bellBtnRef) return;

  // Load initial count
  _refreshCount();

  // Wire bell click
  bellBtnRef.addEventListener('click', (e) => {
    e.stopPropagation();
    _togglePanel();
  });

  // Real-time subscription
  if (socketCleanup) socketCleanup();
  socketCleanup = onSocketEvent('notification:new', (notif) => {
    // Prepend to list if panel open, else just update badge
    notifications.unshift(notif);
    unreadCount++;
    _updateBadge();
    _showNotifToast(notif);
    if (panelOpen && panelRef) {
      _renderPanelList();
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (panelOpen && panelRef && !panelRef.contains(e.target) && !bellBtnRef.contains(e.target)) {
      _closePanel();
    }
  });
}

// ── Show incoming notification as toast ─────────────────────
function _showNotifToast(notif) {
  const typeEmoji = {
    task_reminder: '🔔',
    task_assigned: '📌',
    deal_won:      '🏆',
    deal_stage:    '📊',
    lead_assigned: '👤',
    activity_due:  '⏰',
    system:        'ℹ️',
  };
  const emoji = typeEmoji[notif.type] || '🔔';
  showToast('info', `${emoji} ${notif.title}`, notif.message);
}

// ── Badge Update ─────────────────────────────────────────────
function _updateBadge() {
  if (!badgeRef) return;
  if (unreadCount > 0) {
    badgeRef.classList.add('topbar__notif-dot--active');
    badgeRef.setAttribute('data-count', unreadCount > 99 ? '99+' : String(unreadCount));
    badgeRef.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
  } else {
    badgeRef.classList.remove('topbar__notif-dot--active');
    badgeRef.textContent = '';
  }
}

async function _refreshCount() {
  try {
    const res = await api.notifications.count();
    unreadCount = res.unreadCount || 0;
    _updateBadge();
  } catch { /* silent */ }
}

// ── Panel Toggle ─────────────────────────────────────────────
async function _togglePanel() {
  if (panelOpen) {
    _closePanel();
  } else {
    await _openPanel();
  }
}

async function _openPanel() {
  panelOpen = true;
  _createPanel();
  _renderPanelLoading();
  await _loadNotifications();
  _renderPanelList();
}

function _closePanel() {
  panelOpen = false;
  panelRef?.remove();
  panelRef = null;
}

function _createPanel() {
  panelRef?.remove();

  panelRef = document.createElement('div');
  panelRef.className = 'notif-panel';
  panelRef.id = 'notif-panel';

  // Position below the bell button
  const rect = bellBtnRef.getBoundingClientRect();
  panelRef.style.top = `${rect.bottom + 8}px`;
  panelRef.style.right = `${window.innerWidth - rect.right}px`;

  document.body.appendChild(panelRef);
}

function _renderPanelLoading() {
  if (!panelRef) return;
  panelRef.innerHTML = `
    <div class="notif-panel__header">
      <span class="notif-panel__title">${Icons.bell} Notifications</span>
    </div>
    <div class="notif-panel__body">
      <div class="notif-loading"><div class="spinner spinner--sm"></div> Loading…</div>
    </div>`;
}

async function _loadNotifications() {
  try {
    const res = await api.notifications.list({ limit: 30 });
    notifications = res.notifications || [];
    unreadCount = res.unreadCount ?? 0;
    _updateBadge();
  } catch (err) {
    console.error('[Notifications] Load error:', err);
  }
}

function _renderPanelList() {
  if (!panelRef) return;

  const unread = notifications.filter(n => !n.read);

  panelRef.innerHTML = `
    <div class="notif-panel__header">
      <span class="notif-panel__title">${Icons.bell} Notifications</span>
      <div class="notif-panel__actions">
        ${unread.length > 0
          ? `<button class="notif-panel__action-btn" id="notif-mark-all">Mark all read</button>`
          : ''}
      </div>
    </div>
    <div class="notif-panel__body" id="notif-panel-body">
      ${notifications.length === 0
        ? `<div class="notif-empty">
            <div class="notif-empty__icon">${Icons.bell}</div>
            <p>You're all caught up!</p>
           </div>`
        : notifications.map(n => _renderNotifItem(n)).join('')}
    </div>
    <div class="notif-panel__footer">
      <span class="notif-panel__count">${notifications.length} notification${notifications.length !== 1 ? 's' : ''}</span>
    </div>
  `;

  // Wire mark-all-read
  panelRef.querySelector('#notif-mark-all')?.addEventListener('click', async () => {
    try {
      await api.notifications.markAllRead();
      notifications.forEach(n => { n.read = true; });
      unreadCount = 0;
      _updateBadge();
      _renderPanelList();
      showToast('success', 'All Read', 'All notifications marked as read.');
    } catch (err) {
      showToast('error', 'Failed', err.message);
    }
  });

  // Wire individual actions
  panelRef.querySelector('#notif-panel-body')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-notif-action]');
    if (!btn) return;
    const { notifAction: action, notifId: id } = btn.dataset;

    if (action === 'mark-read') {
      await _markRead(id);
    } else if (action === 'delete') {
      await _deleteNotif(id);
    }
  });
}

function _renderNotifItem(n) {
  const typeIcons = {
    task_reminder: Icons.bell,
    task_assigned: Icons.tasks,
    deal_won:      Icons.star,
    deal_stage:    Icons.trending,
    lead_assigned: Icons.leads,
    activity_due:  Icons.calendar,
    system:        Icons.activity,
  };
  const typeColors = {
    task_reminder: 'var(--color-amber-400)',
    task_assigned: 'var(--color-blue-400)',
    deal_won:      'var(--color-emerald-400)',
    deal_stage:    'var(--color-purple-400)',
    lead_assigned: 'var(--color-cyan-400)',
    activity_due:  'var(--color-rose-400)',
    system:        'var(--color-gray-300)',
  };

  const icon = typeIcons[n.type] || Icons.bell;
  const color = typeColors[n.type] || 'var(--color-gray-300)';
  const timeAgo = _timeAgo(n.createdAt);

  return `
    <div class="notif-item ${n.read ? 'notif-item--read' : 'notif-item--unread'}" data-id="${n.id}">
      <div class="notif-item__icon" style="color:${color};background:${color}18;border-color:${color}30">
        ${icon}
      </div>
      <div class="notif-item__content">
        <div class="notif-item__title">${_esc(n.title)}</div>
        <div class="notif-item__message">${_esc(n.message)}</div>
        <div class="notif-item__time">${timeAgo}</div>
      </div>
      <div class="notif-item__btns">
        ${!n.read ? `
          <button class="notif-btn" data-notif-action="mark-read" data-notif-id="${n.id}" title="Mark as read">
            ${Icons.check}
          </button>` : ''}
        <button class="notif-btn notif-btn--danger" data-notif-action="delete" data-notif-id="${n.id}" title="Dismiss">
          ${Icons.x}
        </button>
      </div>
    </div>
  `;
}

async function _markRead(id) {
  try {
    await api.notifications.markRead(id);
    const n = notifications.find(n => n.id === id);
    if (n && !n.read) {
      n.read = true;
      unreadCount = Math.max(0, unreadCount - 1);
      _updateBadge();
    }
    _renderPanelList();
  } catch (err) {
    showToast('error', 'Failed', err.message);
  }
}

async function _deleteNotif(id) {
  try {
    await api.notifications.delete(id);
    const n = notifications.find(n => n.id === id);
    if (n && !n.read) {
      unreadCount = Math.max(0, unreadCount - 1);
      _updateBadge();
    }
    notifications = notifications.filter(n => n.id !== id);
    _renderPanelList();
  } catch (err) {
    showToast('error', 'Failed', err.message);
  }
}

// ── Helpers ──────────────────────────────────────────────────
function _timeAgo(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function _esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Destroy / Cleanup on Logout ──────────────────────────────
export function destroyNotificationsWidget() {
  if (socketCleanup) {
    socketCleanup();
    socketCleanup = null;
  }
  _closePanel();
  notifications = [];
  unreadCount = 0;
}

