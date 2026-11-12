// ── Nexora CRM — Leads Module Frontend ───────────────────────
import { Icons } from '../icons.js';
import { api } from '../api.js';
import { showToast } from '../toast.js';
import { _esc } from '../utils.js';

export async function renderLeads(container, user) {
  let leads = [];
  let pagination = { page: 1, limit: 10, total: 0, totalPages: 1 };
  let currentSearch = '';
  let currentStatus = '';
  let currentSource = '';
  let stats = { total: 0, new: 0, qualified: 0, converted: 0, pipelineValue: 0 };

  container.innerHTML = `
    <div class="page-enter">
      <!-- Page Header -->
      <div class="crm-page-header">
        <div>
          <div class="page-header__eyebrow">Pipeline Acquisition</div>
          <h1 class="page-header__title">Leads Management</h1>
          <p class="page-header__subtitle">Capture, qualify, score, and safely convert prospects into verified contacts and accounts.</p>
        </div>
        <div class="crm-header-actions">
          <button class="btn btn--primary" id="btn-create-lead">
            ${Icons.plus} New Lead
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div class="crm-stats-row" id="leads-stats-row">
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Total Leads</div>
          <div class="crm-stat-card__val" id="stat-total">--</div>
          <div class="crm-stat-card__sub">Across all sources</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">New Inbound</div>
          <div class="crm-stat-card__val text-cyan" id="stat-new">--</div>
          <div class="crm-stat-card__sub">Awaiting outreach</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Qualified</div>
          <div class="crm-stat-card__val text-emerald" id="stat-qualified">--</div>
          <div class="crm-stat-card__sub">Ready for conversion</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Converted</div>
          <div class="crm-stat-card__val text-purple" id="stat-converted">--</div>
          <div class="crm-stat-card__sub">Contacts & Companies created</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Est. Pipeline Value</div>
          <div class="crm-stat-card__val text-amber" id="stat-pipeline">--</div>
          <div class="crm-stat-card__sub">Potential contract value</div>
        </div>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="crm-toolbar">
        <div class="crm-search-wrap">
          <span class="crm-search-icon">${Icons.search}</span>
          <input
            type="search"
            class="crm-search-input"
            id="leads-search-input"
            placeholder="Search leads by name, email, company, title…"
            value=""
          />
        </div>

        <div class="crm-filter-group">
          <select class="crm-select" id="filter-status">
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Unqualified">Unqualified</option>
            <option value="Converted">Converted</option>
          </select>

          <select class="crm-select" id="filter-source">
            <option value="">All Sources</option>
            <option value="Website">Website</option>
            <option value="Referral">Referral</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Cold Outreach">Cold Outreach</option>
            <option value="Inbound">Inbound</option>
            <option value="Webinar">Webinar</option>
            <option value="Event">Event</option>
            <option value="Partner">Partner</option>
          </select>

          <button class="btn btn--secondary" id="btn-refresh-leads" title="Refresh">
            ${Icons.refresh}
          </button>
        </div>
      </div>

      <!-- Main Data Table Card -->
      <div class="crm-table-card">
        <div class="table-responsive">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Company & Title</th>
                <th>Status</th>
                <th>Lead Score</th>
                <th>Est. Value</th>
                <th>Source & Owner</th>
                <th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody id="leads-table-body">
              <tr>
                <td colspan="7" class="crm-loading-cell">Loading enterprise leads…</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="crm-pagination-bar" id="leads-pagination-bar">
          <div class="crm-pagination-info" id="leads-page-info">Showing 0 of 0 leads</div>
          <div class="crm-pagination-btns">
            <button class="btn btn--sm btn--secondary" id="btn-prev-page" disabled>
              ${Icons.chevronLeft} Previous
            </button>
            <span class="crm-page-number" id="current-page-num">Page 1</span>
            <button class="btn btn--sm btn--secondary" id="btn-next-page" disabled>
              Next ${Icons.chevronRight}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop Container -->
    <div id="leads-modal-root"></div>
  `;

  // ── Load Stats ──────────────────────────────────────────────
  async function loadStats() {
    try {
      const res = await api.leads.stats();
      if (res.stats) {
        stats = res.stats;
        container.querySelector('#stat-total').textContent = stats.total;
        container.querySelector('#stat-new').textContent = stats.new;
        container.querySelector('#stat-qualified').textContent = stats.qualified;
        container.querySelector('#stat-converted').textContent = stats.converted;
        container.querySelector('#stat-pipeline').textContent = `$${(stats.pipelineValue || 0).toLocaleString()}`;
      }
    } catch {
      // Ignore background stats err
    }
  }

  // ── Fetch Leads ─────────────────────────────────────────────
  async function fetchLeads(page = 1) {
    const tbody = container.querySelector('#leads-table-body');
    tbody.innerHTML = `<tr><td colspan="7" class="crm-loading-cell">Updating list…</td></tr>`;

    try {
      const res = await api.leads.list({
        page,
        limit: 10,
        search: currentSearch,
        status: currentStatus,
        source: currentSource,
      });

      leads = res.items || [];
      pagination = res.pagination || { page: 1, limit: 10, total: leads.length, totalPages: 1 };
      renderTable();
      renderPagination();
      loadStats();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="crm-error-cell">Failed to load leads: ${err.message}</td></tr>`;
      showToast('error', 'Error', err.message);
    }
  }

  // ── Render Table ────────────────────────────────────────────
  function renderTable() {
    const tbody = container.querySelector('#leads-table-body');
    if (!leads.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="crm-empty-cell">
            <div class="empty-state-wrap">
              <span class="empty-icon">${Icons.leads}</span>
              <h3>No leads found</h3>
              <p>Try modifying your search or filters, or create a new lead.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = leads.map(l => {
      const initials = `${(l.firstName || '')[0] || ''}${(l.lastName || '')[0] || ''}`.toUpperCase() || 'LD';
      const statusClass = `badge--lead-${(l.status || 'new').toLowerCase()}`;
      const scoreColor = l.score >= 80 ? 'var(--color-emerald-400)' : l.score >= 50 ? 'var(--color-purple-400)' : 'var(--color-amber-400)';

      return `
        <tr data-lead-id="${l.id}">
          <td>
            <div class="lead-name-cell">
              <div class="lead-avatar">${initials}</div>
              <div>
                <div class="lead-fullname">${_esc(l.fullName || `${l.firstName} ${l.lastName}`)}</div>
                <div class="lead-email">${_esc(l.email)}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="lead-company">${_esc(l.company)}</div>
            <div class="lead-title">${_esc(l.title || 'Prospect')}</div>
          </td>
          <td>
            <span class="lead-status-badge ${statusClass}">${_esc(l.status)}</span>
          </td>
          <td>
            <div class="lead-score-wrap" title="Qualification Score: ${l.score}/100">
              <span class="lead-score-text" style="color:${scoreColor}">${l.score}</span>
              <div class="lead-score-track">
                <div class="lead-score-fill" style="width:${l.score}%;background:${scoreColor}"></div>
              </div>
            </div>
          </td>
          <td class="lead-value-cell">
            $${(Number(l.value) || 0).toLocaleString()}
          </td>
          <td>
            <div class="lead-source-tag">${_esc(l.source || 'Website')}</div>
            <div class="lead-owner-text">${_esc(l.ownerName || 'Assigned Rep')}</div>
          </td>
          <td style="text-align:right">
            <div class="crm-row-actions">
              ${!l.converted ? `
                <button class="crm-action-btn crm-action-btn--convert" data-action="convert" data-id="${l.id}" title="Safely convert to Contact & Company">
                  ${Icons.convert} Convert
                </button>
                <button class="crm-action-btn" data-action="edit" data-id="${l.id}" title="Edit Lead">
                  ${Icons.edit}
                </button>
                <button class="crm-action-btn crm-action-btn--danger" data-action="delete" data-id="${l.id}" title="Delete Lead">
                  ${Icons.trash}
                </button>
              ` : `
                <span class="converted-pill" title="Converted to Contact (${l.conversion?.contactId || ''})">
                  ${Icons.check} Converted
                </span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row events
    tbody.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const lead = leads.find(item => item.id === id);
        if (!lead) return;

        if (action === 'convert') showConvertModal(lead);
        if (action === 'edit') showLeadModal(lead);
        if (action === 'delete') confirmDeleteLead(lead);
      });
    });
  }

  // ── Render Pagination ───────────────────────────────────────
  function renderPagination() {
    const info = container.querySelector('#leads-page-info');
    const pageNum = container.querySelector('#current-page-num');
    const btnPrev = container.querySelector('#btn-prev-page');
    const btnNext = container.querySelector('#btn-next-page');

    const start = (pagination.page - 1) * pagination.limit + (leads.length ? 1 : 0);
    const end = Math.min(pagination.page * pagination.limit, pagination.total);

    info.textContent = `Showing ${start}–${end} of ${pagination.total} leads`;
    pageNum.textContent = `Page ${pagination.page} of ${pagination.totalPages || 1}`;

    btnPrev.disabled = !pagination.hasPrev;
    btnNext.disabled = !pagination.hasNext;
  }

  // ── Safe Lead Conversion Modal ──────────────────────────────
  function showConvertModal(lead) {
    const modalRoot = container.querySelector('#leads-modal-root');
    modalRoot.innerHTML = `
      <div class="crm-modal-backdrop" id="modal-backdrop">
        <div class="crm-modal-card">
          <div class="crm-modal-header">
            <div>
              <div class="modal-badge-safe">🛡️ Safe Lead Conversion</div>
              <h2 class="crm-modal-title">Convert Lead to Account</h2>
            </div>
            <button class="crm-modal-close" id="btn-close-modal">${Icons.x}</button>
          </div>

          <div class="crm-modal-body">
            <div class="convert-notice-box">
              <p>Converting <strong>${lead.fullName}</strong> will create a verified <strong>Contact</strong>, link or create a <strong>Company account</strong>, and establish an audit trail for sales metrics.</p>
            </div>

            <form id="convert-lead-form">
              <div class="form-group">
                <label class="form-label">Contact Name & Email</label>
                <div class="convert-readonly-field">
                  <div><strong>${lead.fullName}</strong> (${lead.title || 'Prospect'})</div>
                  <div class="text-muted">${lead.email} • ${lead.phone || 'No phone'}</div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="conv-company-name">Target Company / Account Name</label>
                <input
                  class="form-input"
                  type="text"
                  id="conv-company-name"
                  value="${lead.company || ''}"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="conv-deal-name">Opportunity / Deal Name (Optional)</label>
                <input
                  class="form-input"
                  type="text"
                  id="conv-deal-name"
                  value="${lead.company ? `${lead.company} - Initial Opportunity` : 'Initial Opportunity'}"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="conv-deal-amount">Deal Value ($ USD)</label>
                <input
                  class="form-input"
                  type="number"
                  id="conv-deal-amount"
                  value="${lead.value || 50000}"
                  min="0"
                />
              </div>

              <div class="crm-modal-footer">
                <button type="button" class="btn btn--secondary" id="btn-cancel-convert">Cancel</button>
                <button type="submit" class="btn btn--primary" id="btn-submit-convert">
                  ${Icons.convert} Convert Lead Safely
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    function closeModal() {
      modalRoot.innerHTML = '';
    }

    modalRoot.querySelector('#btn-close-modal').addEventListener('click', closeModal);
    modalRoot.querySelector('#btn-cancel-convert').addEventListener('click', closeModal);

    modalRoot.querySelector('#convert-lead-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const companyName = modalRoot.querySelector('#conv-company-name').value.trim();
      const dealName = modalRoot.querySelector('#conv-deal-name').value.trim();
      const dealAmount = Number(modalRoot.querySelector('#conv-deal-amount').value) || 0;

      const submitBtn = modalRoot.querySelector('#btn-submit-convert');
      submitBtn.classList.add('loading');
      submitBtn.textContent = 'Converting…';

      try {
        const res = await api.leads.convert(lead.id, {
          companyName,
          dealName,
          dealAmount,
        });

        showToast('success', 'Lead Converted!', `Created Contact ${res.contact?.fullName} at ${res.company?.name}`);
        closeModal();
        fetchLeads(pagination.page);
      } catch (err) {
        showToast('error', 'Conversion Failed', err.message);
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Convert Lead Safely';
      }
    });
  }

  // ── Create / Edit Lead Modal ────────────────────────────────
  function showLeadModal(leadToEdit = null) {
    const isEdit = Boolean(leadToEdit);
    const modalRoot = container.querySelector('#leads-modal-root');

    modalRoot.innerHTML = `
      <div class="crm-modal-backdrop" id="modal-backdrop">
        <div class="crm-modal-card">
          <div class="crm-modal-header">
            <div>
              <div class="modal-badge-safe">${isEdit ? 'Update Lead' : 'New Prospect'}</div>
              <h2 class="crm-modal-title">${isEdit ? 'Edit Lead Information' : 'Create New Lead'}</h2>
            </div>
            <button class="crm-modal-close" id="btn-close-modal">${Icons.x}</button>
          </div>

          <div class="crm-modal-body">
            <form id="lead-form">
              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="lead-fname">First Name *</label>
                  <input class="form-input" id="lead-fname" type="text" value="${leadToEdit?.firstName || ''}" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="lead-lname">Last Name *</label>
                  <input class="form-input" id="lead-lname" type="text" value="${leadToEdit?.lastName || ''}" required />
                </div>
              </div>

              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="lead-email">Work Email *</label>
                  <input class="form-input" id="lead-email" type="email" value="${leadToEdit?.email || ''}" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="lead-phone">Phone Number</label>
                  <input class="form-input" id="lead-phone" type="tel" value="${leadToEdit?.phone || ''}" placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="lead-company">Company / Organization *</label>
                  <input class="form-input" id="lead-company" type="text" value="${leadToEdit?.company || ''}" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="lead-title">Job Title</label>
                  <input class="form-input" id="lead-title" type="text" value="${leadToEdit?.title || ''}" placeholder="e.g. VP of Sales" />
                </div>
              </div>

              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="lead-status">Lead Status</label>
                  <select class="crm-select w-full" id="lead-status">
                    <option value="New" ${leadToEdit?.status === 'New' ? 'selected' : ''}>New</option>
                    <option value="Contacted" ${leadToEdit?.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                    <option value="Qualified" ${leadToEdit?.status === 'Qualified' ? 'selected' : ''}>Qualified</option>
                    <option value="Unqualified" ${leadToEdit?.status === 'Unqualified' ? 'selected' : ''}>Unqualified</option>
                    ${isEdit ? `<option value="Converted" ${leadToEdit?.status === 'Converted' ? 'selected' : ''}>Converted</option>` : ''}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="lead-source">Lead Source</label>
                  <select class="crm-select w-full" id="lead-source">
                    <option value="Website" ${leadToEdit?.source === 'Website' ? 'selected' : ''}>Website</option>
                    <option value="Referral" ${leadToEdit?.source === 'Referral' ? 'selected' : ''}>Referral</option>
                    <option value="LinkedIn" ${leadToEdit?.source === 'LinkedIn' ? 'selected' : ''}>LinkedIn</option>
                    <option value="Cold Outreach" ${leadToEdit?.source === 'Cold Outreach' ? 'selected' : ''}>Cold Outreach</option>
                    <option value="Inbound" ${leadToEdit?.source === 'Inbound' ? 'selected' : ''}>Inbound</option>
                    <option value="Webinar" ${leadToEdit?.source === 'Webinar' ? 'selected' : ''}>Webinar</option>
                    <option value="Event" ${leadToEdit?.source === 'Event' ? 'selected' : ''}>Event</option>
                    <option value="Partner" ${leadToEdit?.source === 'Partner' ? 'selected' : ''}>Partner</option>
                  </select>
                </div>
              </div>

              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="lead-value">Estimated Value ($ USD)</label>
                  <input class="form-input" id="lead-value" type="number" value="${leadToEdit?.value || 0}" min="0" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="lead-score">Lead Score (0-100)</label>
                  <input class="form-input" id="lead-score" type="number" value="${leadToEdit?.score || 50}" min="0" max="100" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="lead-notes">Notes & Discovery Context</label>
                <textarea class="crm-textarea" id="lead-notes" rows="3" placeholder="Key prospect interests, budget timeline, pain points…">${leadToEdit?.notes || ''}</textarea>
              </div>

              <div class="crm-modal-footer">
                <button type="button" class="btn btn--secondary" id="btn-cancel-form">Cancel</button>
                <button type="submit" class="btn btn--primary" id="btn-submit-lead">
                  ${isEdit ? 'Save Changes' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    function closeModal() {
      modalRoot.innerHTML = '';
    }

    modalRoot.querySelector('#btn-close-modal').addEventListener('click', closeModal);
    modalRoot.querySelector('#btn-cancel-form').addEventListener('click', closeModal);

    modalRoot.querySelector('#lead-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        firstName: modalRoot.querySelector('#lead-fname').value.trim(),
        lastName: modalRoot.querySelector('#lead-lname').value.trim(),
        email: modalRoot.querySelector('#lead-email').value.trim(),
        phone: modalRoot.querySelector('#lead-phone').value.trim(),
        company: modalRoot.querySelector('#lead-company').value.trim(),
        title: modalRoot.querySelector('#lead-title').value.trim(),
        status: modalRoot.querySelector('#lead-status').value,
        source: modalRoot.querySelector('#lead-source').value,
        value: Number(modalRoot.querySelector('#lead-value').value) || 0,
        score: Number(modalRoot.querySelector('#lead-score').value) || 50,
        notes: modalRoot.querySelector('#lead-notes').value.trim(),
      };

      const submitBtn = modalRoot.querySelector('#btn-submit-lead');
      submitBtn.classList.add('loading');

      try {
        if (isEdit) {
          await api.leads.update(leadToEdit.id, payload);
          showToast('success', 'Lead Updated', `Saved changes for ${payload.firstName} ${payload.lastName}`);
        } else {
          await api.leads.create(payload);
          showToast('success', 'Lead Created', `Added ${payload.firstName} ${payload.lastName} to pipeline`);
        }
        closeModal();
        fetchLeads(isEdit ? pagination.page : 1);
      } catch (err) {
        showToast('error', 'Operation Failed', err.message);
        submitBtn.classList.remove('loading');
      }
    });
  }

  // ── Delete Confirmation ─────────────────────────────────────
  async function confirmDeleteLead(lead) {
    if (!confirm(`Are you sure you want to delete lead "${lead.fullName}" from ${lead.company}?`)) {
      return;
    }
    try {
      await api.leads.delete(lead.id);
      showToast('info', 'Lead Deleted', `Removed ${lead.fullName}`);
      fetchLeads(pagination.page);
    } catch (err) {
      showToast('error', 'Delete Failed', err.message);
    }
  }

  // ── Event Handlers ──────────────────────────────────────────
  container.querySelector('#btn-create-lead').addEventListener('click', () => showLeadModal());

  // Debounced search
  let searchTimer = null;
  container.querySelector('#leads-search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentSearch = e.target.value;
      fetchLeads(1);
    }, 300);
  });

  // Filters
  container.querySelector('#filter-status').addEventListener('change', (e) => {
    currentStatus = e.target.value;
    fetchLeads(1);
  });

  container.querySelector('#filter-source').addEventListener('change', (e) => {
    currentSource = e.target.value;
    fetchLeads(1);
  });

  container.querySelector('#btn-refresh-leads').addEventListener('click', () => {
    fetchLeads(pagination.page);
  });

  // Pagination navigation
  container.querySelector('#btn-prev-page').addEventListener('click', () => {
    if (pagination.hasPrev) fetchLeads(pagination.page - 1);
  });

  container.querySelector('#btn-next-page').addEventListener('click', () => {
    if (pagination.hasNext) fetchLeads(pagination.page + 1);
  });

  // Initial Fetch
  fetchLeads(1);
}
