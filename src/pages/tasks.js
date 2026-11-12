// ── Nexora CRM — Full Tasks & Activities Page ──────────────
import { Icons } from '../icons.js';
import { api } from '../api.js';
import { showToast } from '../toast.js';
import { onSocketEvent, offSocketEvent } from '../socket-client.js';

// ── Type / Priority / Status Metadata ───────────────────────
const TYPE_META = {
  task:     { label: 'Task',     color: 'var(--color-blue-400)',    icon: '☑' },
  call:     { label: 'Call',     color: 'var(--color-emerald-400)', icon: '📞' },
  meeting:  { label: 'Meeting',  color: 'var(--color-purple-400)',  icon: '👥' },
  email:    { label: 'Email',    color: 'var(--color-cyan-400)',     icon: '✉' },
  note:     { label: 'Note',     color: 'var(--color-amber-400)',   icon: '📝' },
  reminder: { label: 'Reminder', color: 'var(--color-rose-400)',    icon: '🔔' },
};

const PRIORITY_META = {
  low:    { label: 'Low',    cls: 'priority--low' },
  medium: { label: 'Medium', cls: 'priority--medium' },
  high:   { label: 'High',   cls: 'priority--high' },
  urgent: { label: 'Urgent', cls: 'priority--urgent' },
};

const STATUS_META = {
  pending:     { label: 'Pending',     cls: 'status--pending' },
  in_progress: { label: 'In Progress', cls: 'status--in-progress' },
  completed:   { label: 'Completed',   cls: 'status--completed' },
  cancelled:   { label: 'Cancelled',   cls: 'status--cancelled' },
};

// ── State ────────────────────────────────────────────────────
let state = {
  items: [],
  timeline: [],
  pagination: null,
  filters: {
    status: '',
    type: '',
    priority: '',
    search: '',
    page: 1,
  },
  activeTab: 'list',   // 'list' | 'timeline'
  loading: false,
  users: [],
  container: null,
  user: null,
  socketCleanups: [],
};

// ── Main Render Entry ────────────────────────────────────────
export async function renderTasks(container, user) {
  state.container = container;
  state.user = user;
  state.filters = { status: '', type: '', priority: '', search: '', page: 1 };
  state.activeTab = 'list';

  // Cleanup previous socket subscriptions
  for (const cleanup of state.socketCleanups) cleanup();
  state.socketCleanups = [];

  container.innerHTML = `
    <div class="page-enter" id="tasks-page">
      <div class="page-header">
        <div>
          <div class="page-header__eyebrow">Activities</div>
          <h1 class="page-header__title">Tasks & Activities</h1>
          <p class="page-header__subtitle">Manage your tasks, calls, meetings, and reminders with real-time updates.</p>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--primary" id="btn-new-task">
            ${Icons.plus} New Activity
          </button>
        </div>
      </div>

      <!-- Tab Bar -->
      <div class="tasks-tabs" role="tablist">
        <button class="tasks-tab tasks-tab--active" data-tab="list" role="tab" aria-selected="true">
          ${Icons.tasks} List View
        </button>
        <button class="tasks-tab" data-tab="timeline" role="tab" aria-selected="false">
          ${Icons.activity} Activity Timeline
        </button>
      </div>

      <!-- Filters Bar -->
      <div class="tasks-filters-bar" id="tasks-filters">
        <div class="tasks-search-wrap">
          <span class="tasks-search-icon">${Icons.search}</span>
          <input type="search" id="tasks-search" class="tasks-search" placeholder="Search activities…" autocomplete="off" />
        </div>
        <select id="filter-type" class="tasks-filter-select">
          <option value="">All Types</option>
          <option value="task">Task</option>
          <option value="call">Call</option>
          <option value="meeting">Meeting</option>
          <option value="email">Email</option>
          <option value="note">Note</option>
          <option value="reminder">Reminder</option>
        </select>
        <select id="filter-status" class="tasks-filter-select">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="overdue">Overdue</option>
        </select>
        <select id="filter-priority" class="tasks-filter-select">
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button class="btn btn--ghost btn--sm" id="btn-clear-filters">${Icons.x} Clear</button>
      </div>

      <!-- Main Content Area -->
      <div id="tasks-content"></div>
    </div>
  `;

  // Load users for assignment dropdown
  try {
    state.users = await api.auth.getUsers() || [];
  } catch { state.users = []; }

  // Wire up controls
  _wireControls();

  // Subscribe to real-time events
  _subscribeRealtime();

  // Initial data load
  await _loadData();
}

// ── Wire UI Controls ─────────────────────────────────────────
function _wireControls() {
  const pg = document.getElementById('tasks-page');
  if (!pg) return;

  // Tab switching
  pg.querySelectorAll('.tasks-tab').forEach(btn => {
    btn.addEventListener('click', async () => {
      state.activeTab = btn.dataset.tab;
      pg.querySelectorAll('.tasks-tab').forEach(t => {
        t.classList.toggle('tasks-tab--active', t.dataset.tab === state.activeTab);
        t.setAttribute('aria-selected', t.dataset.tab === state.activeTab);
      });
      await _loadData();
    });
  });

  // New Activity button
  document.getElementById('btn-new-task')?.addEventListener('click', () => {
    _openActivityModal(null);
  });

  // Search (debounced)
  let searchTimer;
  document.getElementById('tasks-search')?.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.filters.search = e.target.value;
      state.filters.page = 1;
      _loadData();
    }, 350);
  });

  // Filter selects
  ['filter-type', 'filter-status', 'filter-priority'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', e => {
      const key = id.replace('filter-', '');
      state.filters[key] = e.target.value;
      state.filters.page = 1;
      _loadData();
    });
  });

  // Clear filters
  document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
    state.filters = { status: '', type: '', priority: '', search: '', page: 1 };
    document.getElementById('tasks-search').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-priority').value = '';
    _loadData();
  });
}

// ── Real-Time Socket Subscriptions ───────────────────────────
function _subscribeRealtime() {
  const handlers = [
    ['activity:created', (data) => {
      showToast('info', 'New Activity', `"${data.title}" was created.`);
      _loadData();
    }],
    ['activity:updated', (data) => {
      // Update in-place if on list tab
      const idx = state.items.findIndex(i => i.id === data.id);
      if (idx >= 0) {
        state.items[idx] = data;
        _renderContent();
      }
    }],
    ['activity:deleted', (data) => {
      state.items = state.items.filter(i => i.id !== data.id);
      _renderContent();
    }],
    ['task:completed', (data) => {
      const idx = state.items.findIndex(i => i.id === data.id);
      if (idx >= 0) {
        state.items[idx] = data;
        _renderContent();
      }
      showToast('success', 'Task Updated', `"${data.title}" marked ${data.status}.`);
    }],
  ];

  for (const [event, handler] of handlers) {
    const cleanup = onSocketEvent(event, handler);
    state.socketCleanups.push(cleanup);
  }
}

// ── Load Data ────────────────────────────────────────────────
async function _loadData() {
  const content = document.getElementById('tasks-content');
  if (!content) return;

  if (state.activeTab === 'timeline') {
    await _loadTimeline(content);
  } else {
    await _loadList(content);
  }
}

async function _loadList(content) {
  content.innerHTML = `<div class="tasks-loading"><div class="spinner"></div> Loading activities…</div>`;
  try {
    const params = { ...state.filters };
    // Remove empty strings
    Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });

    const res = await api.activities.list(params);
    state.items = res.items || [];
    state.pagination = res.pagination;
    _renderContent();
  } catch (err) {
    content.innerHTML = `<div class="tasks-error">${Icons.x} Failed to load activities: ${err.message}</div>`;
  }
}

async function _loadTimeline(content) {
  content.innerHTML = `<div class="tasks-loading"><div class="spinner"></div> Loading timeline…</div>`;
  try {
    const res = await api.activities.timeline({ limit: 50 });
    state.timeline = res.timeline || [];
    _renderTimeline(content);
  } catch (err) {
    content.innerHTML = `<div class="tasks-error">${Icons.x} Failed to load timeline: ${err.message}</div>`;
  }
}

// ── Render List View ─────────────────────────────────────────
function _renderContent() {
  const content = document.getElementById('tasks-content');
  if (!content) return;

  if (state.items.length === 0) {
    content.innerHTML = `
      <div class="tasks-empty">
        <div class="tasks-empty__icon">${Icons.tasks}</div>
        <h3>No activities found</h3>
        <p>Create your first activity or adjust your filters.</p>
        <button class="btn btn--primary" onclick="document.getElementById('btn-new-task')?.click()">
          ${Icons.plus} New Activity
        </button>
      </div>`;
    return;
  }

  // Stats summary bar
  const total = state.pagination?.total ?? state.items.length;
  const pending = state.items.filter(i => i.status === 'pending').length;
  const urgent = state.items.filter(i => i.priority === 'urgent').length;
  const overdue = state.items.filter(i => {
    return i.status === 'pending' && i.dueDate && new Date(i.dueDate) < new Date();
  }).length;

  content.innerHTML = `
    <div class="tasks-stats-bar">
      <div class="tasks-stat">
        <span class="tasks-stat__num">${total}</span>
        <span class="tasks-stat__label">Total</span>
      </div>
      <div class="tasks-stat">
        <span class="tasks-stat__num" style="color:var(--color-amber-400)">${pending}</span>
        <span class="tasks-stat__label">Pending</span>
      </div>
      <div class="tasks-stat">
        <span class="tasks-stat__num" style="color:var(--color-rose-400)">${overdue}</span>
        <span class="tasks-stat__label">Overdue</span>
      </div>
      <div class="tasks-stat">
        <span class="tasks-stat__num" style="color:var(--color-purple-400)">${urgent}</span>
        <span class="tasks-stat__label">Urgent</span>
      </div>
    </div>

    <div class="tasks-list" id="tasks-list-items">
      ${state.items.map(item => _renderActivityCard(item)).join('')}
    </div>

    ${_renderPagination()}
  `;

  // Wire card actions
  _wireCardActions();
}

function _renderActivityCard(item) {
  const typeMeta = TYPE_META[item.type] || TYPE_META.task;
  const priorityMeta = PRIORITY_META[item.priority] || PRIORITY_META.medium;
  const statusMeta = STATUS_META[item.status] || STATUS_META.pending;
  const isCompleted = item.status === 'completed';
  const isCancelled = item.status === 'cancelled';
  const isOverdue = item.status === 'pending' && item.dueDate && new Date(item.dueDate) < new Date();

  const dueDateStr = item.dueDate
    ? new Date(item.dueDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const reminderStr = item.reminderDate
    ? new Date(item.reminderDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return `
    <div class="task-card ${isCompleted ? 'task-card--completed' : ''} ${isOverdue ? 'task-card--overdue' : ''}"
         data-id="${item.id}">
      <!-- Completion Toggle -->
      <button class="task-check ${isCompleted ? 'task-check--done' : ''}"
              data-action="toggle-complete"
              data-id="${item.id}"
              title="${isCompleted ? 'Mark pending' : 'Mark complete'}"
              ${isCancelled ? 'disabled' : ''}>
        ${isCompleted ? Icons.check : ''}
      </button>

      <!-- Type Badge -->
      <div class="task-type-badge" style="background:${typeMeta.color}22;color:${typeMeta.color};border-color:${typeMeta.color}44">
        <span>${typeMeta.icon}</span>
        <span>${typeMeta.label}</span>
      </div>

      <!-- Main Content -->
      <div class="task-content">
        <div class="task-title ${isCompleted ? 'task-title--done' : ''}">${_esc(item.title)}</div>
        ${item.description ? `<div class="task-description">${_esc(item.description)}</div>` : ''}
        <div class="task-meta">
          ${item.entityName ? `
            <span class="task-meta-item">
              ${Icons.tag} ${_esc(item.entityName)}
            </span>` : ''}
          ${item.assignedToName ? `
            <span class="task-meta-item">
              ${Icons.user} ${_esc(item.assignedToName)}
            </span>` : ''}
          <span class="task-meta-item ${isOverdue ? 'task-meta-item--overdue' : ''}">
            ${Icons.calendar}
            ${isOverdue ? '⚠ Overdue · ' : ''}${dueDateStr}
          </span>
          ${reminderStr ? `
            <span class="task-meta-item">
              ${Icons.bell}
              Reminder: ${reminderStr}
              ${item.reminderSent ? '<span class="reminder-sent-badge">Sent</span>' : ''}
            </span>` : ''}
        </div>
        ${item.outcome ? `<div class="task-outcome">✓ Outcome: ${_esc(item.outcome)}</div>` : ''}
      </div>

      <!-- Badges -->
      <div class="task-badges">
        <span class="priority-badge ${priorityMeta.cls}">${priorityMeta.label}</span>
        <span class="status-badge ${statusMeta.cls}">${statusMeta.label}</span>
      </div>

      <!-- Actions -->
      <div class="task-actions">
        <button class="task-action-btn" data-action="edit" data-id="${item.id}" title="Edit">
          ${Icons.edit}
        </button>
        <button class="task-action-btn task-action-btn--danger" data-action="delete" data-id="${item.id}" title="Delete">
          ${Icons.trash}
        </button>
      </div>
    </div>
  `;
}

function _wireCardActions() {
  document.getElementById('tasks-list-items')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;

    if (action === 'toggle-complete') {
      await _toggleComplete(id, btn);
    } else if (action === 'edit') {
      const item = state.items.find(i => i.id === id);
      if (item) _openActivityModal(item);
    } else if (action === 'delete') {
      await _deleteActivity(id);
    }
  });

  // Pagination
  document.getElementById('tasks-prev-page')?.addEventListener('click', () => {
    if (state.filters.page > 1) {
      state.filters.page--;
      _loadData();
    }
  });
  document.getElementById('tasks-next-page')?.addEventListener('click', () => {
    if (state.pagination && state.filters.page < state.pagination.totalPages) {
      state.filters.page++;
      _loadData();
    }
  });
}

async function _toggleComplete(id, btn) {
  btn.disabled = true;
  try {
    const res = await api.activities.complete(id);
    const updated = res.activity;
    const idx = state.items.findIndex(i => i.id === id);
    if (idx >= 0) state.items[idx] = updated;
    _renderContent();
    showToast('success', 'Activity Updated', `Marked as ${updated.status}`);
  } catch (err) {
    showToast('error', 'Update Failed', err.message);
    btn.disabled = false;
  }
}

async function _deleteActivity(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  if (!confirm(`Delete activity "${item.title}"? This cannot be undone.`)) return;
  try {
    await api.activities.delete(id);
    state.items = state.items.filter(i => i.id !== id);
    _renderContent();
    showToast('success', 'Deleted', 'Activity removed.');
  } catch (err) {
    showToast('error', 'Delete Failed', err.message);
  }
}

function _renderPagination() {
  if (!state.pagination || state.pagination.totalPages <= 1) return '';
  const { page, totalPages, total } = state.pagination;
  return `
    <div class="tasks-pagination">
      <span class="tasks-pagination__info">
        Page ${page} of ${totalPages} · ${total} total
      </span>
      <div class="tasks-pagination__btns">
        <button class="btn btn--ghost btn--sm" id="tasks-prev-page" ${page <= 1 ? 'disabled' : ''}>
          ${Icons.chevronLeft} Prev
        </button>
        <button class="btn btn--ghost btn--sm" id="tasks-next-page" ${page >= totalPages ? 'disabled' : ''}>
          Next ${Icons.chevronRight}
        </button>
      </div>
    </div>
  `;
}

// ── Render Timeline View ─────────────────────────────────────
function _renderTimeline(content) {
  if (state.timeline.length === 0) {
    content.innerHTML = `<div class="tasks-empty">
      <div class="tasks-empty__icon">${Icons.activity}</div>
      <h3>No activity history</h3>
      <p>Your organization's activity timeline will appear here.</p>
    </div>`;
    return;
  }

  content.innerHTML = `
    <div class="timeline-wrap" id="activity-timeline">
      <div class="timeline-header">
        <h3 class="timeline-title">${Icons.activity} Organization Activity Timeline</h3>
        <span class="timeline-count">${state.timeline.length} events</span>
      </div>
      <div class="timeline-track">
        ${state.timeline.map((item, i) => _renderTimelineItem(item, i)).join('')}
      </div>
    </div>
  `;
}

function _renderTimelineItem(item, index) {
  const typeMeta = TYPE_META[item.type] || TYPE_META.task;
  const isCompleted = item.status === 'completed';
  const dateStr = new Date(item.completedAt || item.dueDate || item.createdAt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return `
    <div class="timeline-item" style="--delay: ${index * 0.04}s">
      <div class="timeline-dot" style="background:${typeMeta.color};box-shadow:0 0 8px ${typeMeta.color}66">
        <span style="font-size:0.65rem">${typeMeta.icon}</span>
      </div>
      <div class="timeline-line"></div>
      <div class="timeline-card">
        <div class="timeline-card__header">
          <span class="timeline-type" style="color:${typeMeta.color}">${typeMeta.label}</span>
          <span class="timeline-date">${dateStr}</span>
        </div>
        <div class="timeline-title">${_esc(item.title)}</div>
        ${item.description ? `<div class="timeline-desc">${_esc(item.description)}</div>` : ''}
        <div class="timeline-footer">
          ${item.assignedToName ? `<span class="timeline-meta">${Icons.user} ${_esc(item.assignedToName)}</span>` : ''}
          ${item.entityName ? `<span class="timeline-meta">${Icons.tag} ${_esc(item.entityName)}</span>` : ''}
          ${isCompleted && item.outcome ? `<span class="timeline-outcome">✓ ${_esc(item.outcome)}</span>` : ''}
        </div>
        ${isCompleted ? '<span class="timeline-done-badge">Completed</span>' : ''}
      </div>
    </div>
  `;
}

// ── Activity Modal (Create / Edit) ───────────────────────────
function _openActivityModal(existing = null) {
  document.getElementById('activity-modal')?.remove();

  const isEdit = Boolean(existing);
  const title = isEdit ? 'Edit Activity' : 'New Activity';

  const userOptions = state.users.map(u =>
    `<option value="${u.id}" ${existing?.assignedTo === u.id ? 'selected' : ''}>${_esc(u.name)} (${u.role})</option>`
  ).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'activity-modal';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:580px">
      <div class="modal-header">
        <h3 class="modal-title">${Icons.tasks} ${title}</h3>
        <button class="modal-close" id="modal-close-btn">${Icons.x}</button>
      </div>
      <form id="activity-form" class="modal-body" autocomplete="off">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Title <span class="required">*</span></label>
            <input type="text" name="title" class="form-input" required
              placeholder="Activity title…" value="${_esc(existing?.title || '')}" />
          </div>
        </div>
        <div class="form-row form-row--2col">
          <div class="form-group">
            <label class="form-label">Type</label>
            <select name="type" class="form-select">
              ${['task','call','meeting','email','note','reminder'].map(t =>
                `<option value="${t}" ${(existing?.type||'task')===t?'selected':''}>${TYPE_META[t].label}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select name="priority" class="form-select">
              ${['low','medium','high','urgent'].map(p =>
                `<option value="${p}" ${(existing?.priority||'medium')===p?'selected':''}>${PRIORITY_META[p].label}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="form-row form-row--2col">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select name="status" class="form-select">
              ${['pending','in_progress','completed','cancelled'].map(s =>
                `<option value="${s}" ${(existing?.status||'pending')===s?'selected':''}>${STATUS_META[s].label}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Assigned To</label>
            <select name="assignedTo" class="form-select">
              ${userOptions || `<option value="${state.user?.id}">${state.user?.name}</option>`}
            </select>
          </div>
        </div>
        <div class="form-row form-row--2col">
          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="datetime-local" name="dueDate" class="form-input"
              value="${existing?.dueDate ? new Date(existing.dueDate).toISOString().slice(0,16) : ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Reminder Date</label>
            <input type="datetime-local" name="reminderDate" class="form-input"
              value="${existing?.reminderDate ? new Date(existing.reminderDate).toISOString().slice(0,16) : ''}" />
          </div>
        </div>
        <div class="form-row form-row--2col">
          <div class="form-group">
            <label class="form-label">Related To (Entity Type)</label>
            <select name="entityType" class="form-select">
              ${['none','lead','contact','company','deal'].map(et =>
                `<option value="${et}" ${(existing?.entityType||'none')===et?'selected':''}>${et.charAt(0).toUpperCase()+et.slice(1)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Entity Name</label>
            <input type="text" name="entityName" class="form-input"
              placeholder="e.g. Stripe Deal" value="${_esc(existing?.entityName || '')}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea name="description" class="form-input" rows="3"
            placeholder="Additional notes or context…">${_esc(existing?.description || '')}</textarea>
        </div>
        ${isEdit ? `
          <div class="form-group">
            <label class="form-label">Outcome / Notes</label>
            <input type="text" name="outcome" class="form-input"
              placeholder="Result or completion notes…" value="${_esc(existing?.outcome || '')}" />
          </div>` : ''}
        <div class="modal-footer">
          <button type="button" class="btn btn--ghost" id="modal-cancel-btn">Cancel</button>
          <button type="submit" class="btn btn--primary" id="modal-submit-btn">
            ${Icons.check} ${isEdit ? 'Save Changes' : 'Create Activity'}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Close handlers
  const close = () => modal.remove();
  modal.querySelector('#modal-close-btn').addEventListener('click', close);
  modal.querySelector('#modal-cancel-btn').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  // Form submit
  modal.querySelector('#activity-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = modal.querySelector('#modal-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? 'Saving…' : 'Creating…';

    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());

    // Resolve assigned-to name
    const assignedUser = state.users.find(u => u.id === data.assignedTo);
    if (assignedUser) data.assignedToName = assignedUser.name;

    // Convert empty dates to null
    if (!data.dueDate) data.dueDate = null;
    if (!data.reminderDate) data.reminderDate = null;

    try {
      if (isEdit) {
        const res = await api.activities.update(existing.id, data);
        const idx = state.items.findIndex(i => i.id === existing.id);
        if (idx >= 0) state.items[idx] = res.activity;
        showToast('success', 'Activity Updated', `"${res.activity.title}" saved.`);
      } else {
        const res = await api.activities.create(data);
        state.items.unshift(res.activity);
        showToast('success', 'Activity Created', `"${res.activity.title}" added.`);
      }
      _renderContent();
      close();
    } catch (err) {
      showToast('error', isEdit ? 'Update Failed' : 'Create Failed', err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `${Icons.check} ${isEdit ? 'Save Changes' : 'Create Activity'}`;
    }
  });
}

// ── Helpers ──────────────────────────────────────────────────
function _esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

