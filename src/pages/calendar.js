// ── Nexora CRM — Interactive Calendar Module ──────────────────
import { api } from '../api.js';
import { showToast } from '../toast.js';
import { Icons } from '../icons.js';
import { _esc, formatTimeAgo } from '../utils.js';

export async function renderCalendar(container, currentUser) {
  let currentDate = new Date();
  let activities = [];
  let currentFilter = 'all'; // 'all' | 'task' | 'call' | 'meeting'

  container.innerHTML = `
    <div class="page-enter">
      <!-- Page Header -->
      <div class="crm-page-header">
        <div>
          <div class="page-header__eyebrow">Productivity &amp; Scheduling</div>
          <h1 class="page-header__title">Activity Calendar</h1>
          <p class="page-header__subtitle">Schedule, track deadlines, and visualize team meetings and follow-up tasks.</p>
        </div>
        <div class="crm-header-actions">
          <button class="btn btn-primary" id="cal-new-act-btn">
            ${Icons.plus || '+'} Schedule Activity
          </button>
        </div>
      </div>

      <!-- Calendar Controls & Filter Bar -->
      <div class="calendar-controls-bar">
        <div class="calendar-nav-group">
          <button class="btn btn-sm btn-outline" id="cal-prev" title="Previous Month">
            ${Icons.chevronLeft || '‹'}
          </button>
          <button class="btn btn-sm btn-outline" id="cal-today">Today</button>
          <button class="btn btn-sm btn-outline" id="cal-next" title="Next Month">
            ${Icons.chevronRight || '›'}
          </button>
          <h2 class="calendar-month-title" id="cal-month-label">Month Year</h2>
        </div>

        <div class="btn-group" id="cal-filter-group">
          <button class="btn btn-sm btn-outline active" data-filter="all">All</button>
          <button class="btn btn-sm btn-outline" data-filter="task">Tasks</button>
          <button class="btn btn-sm btn-outline" data-filter="call">Calls</button>
          <button class="btn btn-sm btn-outline" data-filter="meeting">Meetings</button>
        </div>
      </div>

      <!-- Calendar Grid Container -->
      <div class="card calendar-card" id="calendar-grid-card">
        <div class="calendar-grid-header">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>
        <div class="calendar-grid-body" id="cal-days-grid">
          <div class="card-empty">Loading calendar events...</div>
        </div>
      </div>

      <!-- Detail Modal Root -->
      <div id="cal-modal-root"></div>
    </div>
  `;

  // ── Event Handlers ──────────────────────────────────────────
  container.querySelector('#cal-prev').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderMonth();
  });

  container.querySelector('#cal-next').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderMonth();
  });

  container.querySelector('#cal-today').addEventListener('click', () => {
    currentDate = new Date();
    renderMonth();
  });

  container.querySelector('#cal-filter-group').addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    container.querySelectorAll('#cal-filter-group .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderMonth();
  });

  container.querySelector('#cal-new-act-btn').addEventListener('click', () => {
    window.location.hash = '#tasks';
  });

  // ── Fetch Activities & Render ───────────────────────────────
  async function loadData() {
    try {
      const res = await api.activities.list({ limit: 100 });
      activities = res.items || [];
      renderMonth();
    } catch (err) {
      showToast('error', 'Calendar Error', err.message);
      const grid = container.querySelector('#cal-days-grid');
      if (grid) grid.innerHTML = `<div class="card-empty text-danger">${_esc(err.message)}</div>`;
    }
  }

  function renderMonth() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthLabel = container.querySelector('#cal-month-label');
    if (monthLabel) {
      monthLabel.textContent = new Date(year, month, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }

    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDate = today.getDate();

    const daysGrid = container.querySelector('#cal-days-grid');
    if (!daysGrid) return;

    let cellsHtml = '';

    // Prev month padding days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      cellsHtml += `<div class="cal-day-cell cal-day-cell--other"><span class="cal-day-num">${d}</span></div>`;
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = isCurrentMonth && d === todayDate;

      // Filter activities for this day
      const dayActs = activities.filter(a => {
        if (currentFilter !== 'all' && a.type !== currentFilter) return false;
        const targetDate = a.dueDate || a.createdAt;
        if (!targetDate) return false;
        return targetDate.slice(0, 10) === cellDateStr;
      });

      cellsHtml += `
        <div class="cal-day-cell${isToday ? ' cal-day-cell--today' : ''}" data-date="${cellDateStr}">
          <div class="cal-day-header">
            <span class="cal-day-num${isToday ? ' today-badge' : ''}">${d}</span>
            ${dayActs.length > 0 ? `<span class="cal-day-count">${dayActs.length}</span>` : ''}
          </div>
          <div class="cal-day-events">
            ${dayActs.slice(0, 3).map(a => `
              <div class="cal-event-chip cal-event--${a.type || 'task'} ${a.status === 'completed' ? 'cal-event--done' : ''}"
                   data-id="${_esc(a.id)}" title="${_esc(a.title)}">
                <span class="cal-chip-dot"></span>
                <span class="cal-chip-title">${_esc(a.title)}</span>
              </div>
            `).join('')}
            ${dayActs.length > 3 ? `<span class="cal-more-link">+${dayActs.length - 3} more</span>` : ''}
          </div>
        </div>
      `;
    }

    // Next month padding days to complete grid (multiples of 7)
    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cellsHtml += `<div class="cal-day-cell cal-day-cell--other"><span class="cal-day-num">${i}</span></div>`;
    }

    daysGrid.innerHTML = cellsHtml;

    // Attach click listener to event chips
    daysGrid.querySelectorAll('.cal-event-chip').forEach(chip => {
      chip.addEventListener('click', e => {
        e.stopPropagation();
        const actId = chip.dataset.id;
        const act = activities.find(a => a.id === actId);
        if (act) openEventModal(act, container, currentUser, loadData);
      });
    });
  }

  loadData();
}

function openEventModal(act, container, currentUser, onRefresh) {
  const root = container.querySelector('#cal-modal-root');
  if (!root) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const isDone = act.status === 'completed';

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="role-badge role-badge--${act.type || 'task'}" style="text-transform:capitalize">
            ${_esc(act.type || 'Task')}
          </span>
          <h3 class="modal-title" style="margin:0">${_esc(act.title)}</h3>
        </div>
        <button class="modal-close" id="cal-modal-close">✕</button>
      </div>

      <div class="modal-body">
        ${act.description ? `<p style="margin-bottom:1rem;color:var(--text-secondary);line-height:1.5;">${_esc(act.description)}</p>` : ''}

        <div class="cal-detail-grid">
          <div><label class="form-label">Priority</label><div><span class="task-priority priority-${act.priority || 'medium'}">${_esc(act.priority || 'Medium')}</span></div></div>
          <div><label class="form-label">Status</label><div><span class="member-status ${isDone ? 'status-active' : 'status-inactive'}">${isDone ? 'Completed' : 'Pending'}</span></div></div>
          <div><label class="form-label">Due Date</label><div>${act.dueDate ? new Date(act.dueDate).toLocaleString() : 'No due date'}</div></div>
          <div><label class="form-label">Assigned To</label><div>${_esc(act.assignedToName || 'Unassigned')}</div></div>
          ${act.entityName ? `<div><label class="form-label">Related Record</label><div><strong>${_esc(act.entityName)}</strong> (${_esc(act.entityType || 'entity')})</div></div>` : ''}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" id="cal-modal-cancel">Close</button>
        <button class="btn ${isDone ? 'btn-outline' : 'btn-primary'}" id="cal-toggle-complete">
          ${isDone ? 'Mark as Pending' : '✓ Mark Completed'}
        </button>
      </div>
    </div>
  `;

  root.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#cal-modal-close').addEventListener('click', close);
  overlay.querySelector('#cal-modal-cancel').addEventListener('click', close);

  overlay.querySelector('#cal-toggle-complete').addEventListener('click', async () => {
    try {
      await api.activities.complete(act.id, isDone ? '' : 'Completed via calendar');
      showToast('success', 'Status Updated', `Activity marked as ${isDone ? 'pending' : 'completed'}.`);
      close();
      await onRefresh();
    } catch (err) {
      showToast('error', 'Update Failed', err.message);
    }
  });

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

