// ── Nexora CRM — Contacts Module Frontend ────────────────────
import { Icons } from '../icons.js';
import { api } from '../api.js';
import { showToast } from '../toast.js';
import { _esc } from '../utils.js';

export async function renderContacts(container, user) {
  let contacts = [];
  let pagination = { page: 1, limit: 10, total: 0, totalPages: 1 };
  let currentSearch = '';
  let currentStage = '';
  let currentStatus = '';
  let companiesList = [];

  container.innerHTML = `
    <div class="page-enter">
      <!-- Page Header -->
      <div class="crm-page-header">
        <div>
          <div class="page-header__eyebrow">Customer Database</div>
          <h1 class="page-header__title">Contacts & People</h1>
          <p class="page-header__subtitle">Manage customer directory, engagement timelines, lifecycle stages, and relationship ownership.</p>
        </div>
        <div class="crm-header-actions">
          <button class="btn btn--primary" id="btn-create-contact">
            ${Icons.plus} New Contact
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div class="crm-stats-row">
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Total Contacts</div>
          <div class="crm-stat-card__val" id="cnt-stat-total">--</div>
          <div class="crm-stat-card__sub">Across all accounts</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Active Customers</div>
          <div class="crm-stat-card__val text-emerald" id="cnt-stat-customers">--</div>
          <div class="crm-stat-card__sub">Subscribed accounts</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Active Opportunities</div>
          <div class="crm-stat-card__val text-cyan" id="cnt-stat-opportunities">--</div>
          <div class="crm-stat-card__sub">In active sales cycle</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Nurture Leads</div>
          <div class="crm-stat-card__val text-purple" id="cnt-stat-leads">--</div>
          <div class="crm-stat-card__sub">MQL / SQL stages</div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="crm-toolbar">
        <div class="crm-search-wrap">
          <span class="crm-search-icon">${Icons.search}</span>
          <input
            type="search"
            class="crm-search-input"
            id="contacts-search-input"
            placeholder="Search contacts by name, email, company, title…"
            value=""
          />
        </div>

        <div class="crm-filter-group">
          <select class="crm-select" id="filter-stage">
            <option value="">All Lifecycle Stages</option>
            <option value="Customer">Customer</option>
            <option value="Opportunity">Opportunity</option>
            <option value="SQL">SQL</option>
            <option value="MQL">MQL</option>
            <option value="Lead">Lead</option>
            <option value="Subscriber">Subscriber</option>
            <option value="Evangelist">Evangelist</option>
          </select>

          <select class="crm-select" id="filter-contact-status">
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Customer">Customer</option>
            <option value="Lead">Lead</option>
            <option value="Inactive">Inactive</option>
          </select>

          <button class="btn btn--secondary" id="btn-refresh-contacts" title="Refresh">
            ${Icons.refresh}
          </button>
        </div>
      </div>

      <!-- Contacts Table Card -->
      <div class="crm-table-card">
        <div class="table-responsive">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Company & Title</th>
                <th>Phone & Details</th>
                <th>Lifecycle Stage</th>
                <th>Status</th>
                <th>Owner</th>
                <th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody id="contacts-table-body">
              <tr>
                <td colspan="7" class="crm-loading-cell">Loading contacts…</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="crm-pagination-bar">
          <div class="crm-pagination-info" id="contacts-page-info">Showing 0 of 0 contacts</div>
          <div class="crm-pagination-btns">
            <button class="btn btn--sm btn--secondary" id="btn-contacts-prev" disabled>
              ${Icons.chevronLeft} Previous
            </button>
            <span class="crm-page-number" id="contacts-current-page">Page 1</span>
            <button class="btn btn--sm btn--secondary" id="btn-contacts-next" disabled>
              Next ${Icons.chevronRight}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Container -->
    <div id="contacts-modal-root"></div>
  `;

  // ── Stats ───────────────────────────────────────────────────
  async function loadStats() {
    try {
      const res = await api.contacts.stats();
      if (res.stats) {
        container.querySelector('#cnt-stat-total').textContent = res.stats.total;
        container.querySelector('#cnt-stat-customers').textContent = res.stats.customers;
        container.querySelector('#cnt-stat-opportunities').textContent = res.stats.opportunities;
        container.querySelector('#cnt-stat-leads').textContent = res.stats.leads;
      }
    } catch {
      // background
    }
  }

  // ── Companies for dropdown ──────────────────────────────────
  async function loadCompanies() {
    try {
      const res = await api.companies.list({ limit: 100 });
      companiesList = res.items || [];
    } catch {
      companiesList = [];
    }
  }

  // ── Fetch Contacts ──────────────────────────────────────────
  async function fetchContacts(page = 1) {
    const tbody = container.querySelector('#contacts-table-body');
    tbody.innerHTML = `<tr><td colspan="7" class="crm-loading-cell">Updating contacts…</td></tr>`;

    try {
      const res = await api.contacts.list({
        page,
        limit: 10,
        search: currentSearch,
        lifecycleStage: currentStage,
        status: currentStatus,
      });

      contacts = res.items || [];
      pagination = res.pagination || { page: 1, limit: 10, total: contacts.length, totalPages: 1 };
      renderTable();
      renderPagination();
      loadStats();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="crm-error-cell">Failed to load contacts: ${err.message}</td></tr>`;
      showToast('error', 'Error', err.message);
    }
  }

  // ── Render Table ────────────────────────────────────────────
  function renderTable() {
    const tbody = container.querySelector('#contacts-table-body');
    if (!contacts.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="crm-empty-cell">
            <div class="empty-state-wrap">
              <span class="empty-icon">${Icons.contacts}</span>
              <h3>No contacts found</h3>
              <p>Add a new contact or convert a qualified lead.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = contacts.map(c => {
      const initials = `${(c.firstName || '')[0] || ''}${(c.lastName || '')[0] || ''}`.toUpperCase() || 'CT';
      const stageClass = `stage--${(c.lifecycleStage || 'lead').toLowerCase()}`;

      return `
        <tr data-contact-id="${c.id}">
          <td>
            <div class="lead-name-cell">
              <div class="contact-avatar">${initials}</div>
              <div>
                <div class="lead-fullname">${_esc(c.fullName || `${c.firstName} ${c.lastName}`)}</div>
                <div class="lead-email">${_esc(c.email)}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="lead-company">
              <a href="#companies" class="company-link" title="View company">
                ${_esc(c.companyName || 'Unassigned')}
              </a>
            </div>
            <div class="lead-title">${_esc(c.title || c.department || 'Contact')}</div>
          </td>
          <td>
            <div class="contact-phone">${c.phone ? _esc(c.phone) : '<span class="text-disabled">No phone</span>'}</div>
            <div class="contact-city">${c.address?.city ? _esc(`${c.address.city}, ${c.address.state || ''}`) : 'Location on file'}</div>
          </td>
          <td>
            <span class="lifecycle-badge ${stageClass}">${_esc(c.lifecycleStage || 'Lead')}</span>
          </td>
          <td>
            <span class="contact-status-dot contact-status--${(c.status || 'active').toLowerCase()}"></span>
            <span class="contact-status-text">${_esc(c.status || 'Active')}</span>
          </td>
          <td>
            <div class="lead-owner-text">${_esc(c.ownerName || 'Assigned Rep')}</div>
          </td>
          <td style="text-align:right">
            <div class="crm-row-actions">
              ${c.email ? `
                <a href="mailto:${c.email}" class="crm-action-btn" title="Send email via mailto">
                  ${Icons.mail}
                </a>
              ` : ''}
              ${c.phone ? `
                <a href="tel:${c.phone}" class="crm-action-btn" title="Call contact">
                  ${Icons.phone}
                </a>
              ` : ''}
              <button class="crm-action-btn" data-action="edit" data-id="${c.id}" title="Edit contact">
                ${Icons.edit}
              </button>
              <button class="crm-action-btn crm-action-btn--danger" data-action="delete" data-id="${c.id}" title="Delete contact">
                ${Icons.trash}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const contact = contacts.find(item => item.id === id);
        if (!contact) return;

        if (action === 'edit') showContactModal(contact);
        if (action === 'delete') confirmDeleteContact(contact);
      });
    });
  }

  // ── Render Pagination ───────────────────────────────────────
  function renderPagination() {
    const info = container.querySelector('#contacts-page-info');
    const pageNum = container.querySelector('#contacts-current-page');
    const btnPrev = container.querySelector('#btn-contacts-prev');
    const btnNext = container.querySelector('#btn-contacts-next');

    const start = (pagination.page - 1) * pagination.limit + (contacts.length ? 1 : 0);
    const end = Math.min(pagination.page * pagination.limit, pagination.total);

    info.textContent = `Showing ${start}–${end} of ${pagination.total} contacts`;
    pageNum.textContent = `Page ${pagination.page} of ${pagination.totalPages || 1}`;

    btnPrev.disabled = !pagination.hasPrev;
    btnNext.disabled = !pagination.hasNext;
  }

  // ── Create / Edit Contact Modal ─────────────────────────────
  function showContactModal(contactToEdit = null) {
    const isEdit = Boolean(contactToEdit);
    const modalRoot = container.querySelector('#contacts-modal-root');

    modalRoot.innerHTML = `
      <div class="crm-modal-backdrop" id="modal-backdrop">
        <div class="crm-modal-card">
          <div class="crm-modal-header">
            <div>
              <div class="modal-badge-safe">${isEdit ? 'Update Contact' : 'New Contact'}</div>
              <h2 class="crm-modal-title">${isEdit ? 'Edit Contact Profile' : 'Add New Contact'}</h2>
            </div>
            <button class="crm-modal-close" id="btn-close-modal">${Icons.x}</button>
          </div>

          <div class="crm-modal-body">
            <form id="contact-form">
              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="cnt-fname">First Name *</label>
                  <input class="form-input" id="cnt-fname" type="text" value="${contactToEdit?.firstName || ''}" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="cnt-lname">Last Name *</label>
                  <input class="form-input" id="cnt-lname" type="text" value="${contactToEdit?.lastName || ''}" required />
                </div>
              </div>

              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="cnt-email">Email Address *</label>
                  <input class="form-input" id="cnt-email" type="email" value="${contactToEdit?.email || ''}" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="cnt-phone">Phone Number</label>
                  <input class="form-input" id="cnt-phone" type="tel" value="${contactToEdit?.phone || ''}" placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="cnt-company">Company / Account</label>
                  <input
                    class="form-input"
                    id="cnt-company"
                    type="text"
                    list="company-suggestions"
                    value="${contactToEdit?.companyName || ''}"
                    placeholder="Search or enter company…"
                  />
                  <datalist id="company-suggestions">
                    ${companiesList.map(c => `<option value="${c.name}"></option>`).join('')}
                  </datalist>
                </div>
                <div class="form-group">
                  <label class="form-label" for="cnt-title">Job Title</label>
                  <input class="form-input" id="cnt-title" type="text" value="${contactToEdit?.title || ''}" placeholder="e.g. Director of Operations" />
                </div>
              </div>

              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="cnt-stage">Lifecycle Stage</label>
                  <select class="crm-select w-full" id="cnt-stage">
                    <option value="Lead" ${contactToEdit?.lifecycleStage === 'Lead' ? 'selected' : ''}>Lead</option>
                    <option value="MQL" ${contactToEdit?.lifecycleStage === 'MQL' ? 'selected' : ''}>MQL</option>
                    <option value="SQL" ${contactToEdit?.lifecycleStage === 'SQL' ? 'selected' : ''}>SQL</option>
                    <option value="Opportunity" ${contactToEdit?.lifecycleStage === 'Opportunity' ? 'selected' : ''}>Opportunity</option>
                    <option value="Customer" ${contactToEdit?.lifecycleStage === 'Customer' ? 'selected' : ''}>Customer</option>
                    <option value="Evangelist" ${contactToEdit?.lifecycleStage === 'Evangelist' ? 'selected' : ''}>Evangelist</option>
                    <option value="Subscriber" ${contactToEdit?.lifecycleStage === 'Subscriber' ? 'selected' : ''}>Subscriber</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="cnt-status">Account Status</label>
                  <select class="crm-select w-full" id="cnt-status">
                    <option value="Active" ${contactToEdit?.status === 'Active' ? 'selected' : ''}>Active</option>
                    <option value="Customer" ${contactToEdit?.status === 'Customer' ? 'selected' : ''}>Customer</option>
                    <option value="Lead" ${contactToEdit?.status === 'Lead' ? 'selected' : ''}>Lead</option>
                    <option value="Inactive" ${contactToEdit?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="cnt-notes">Relationship Notes</label>
                <textarea class="crm-textarea" id="cnt-notes" rows="3" placeholder="Key meeting history, relationship context…">${contactToEdit?.notes || ''}</textarea>
              </div>

              <div class="crm-modal-footer">
                <button type="button" class="btn btn--secondary" id="btn-cancel-contact">Cancel</button>
                <button type="submit" class="btn btn--primary" id="btn-submit-contact">
                  ${isEdit ? 'Save Changes' : 'Create Contact'}
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
    modalRoot.querySelector('#btn-cancel-contact').addEventListener('click', closeModal);

    modalRoot.querySelector('#contact-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const companyName = modalRoot.querySelector('#cnt-company').value.trim();
      const matchedComp = companiesList.find(c => c.name.toLowerCase() === companyName.toLowerCase());

      const payload = {
        firstName: modalRoot.querySelector('#cnt-fname').value.trim(),
        lastName: modalRoot.querySelector('#cnt-lname').value.trim(),
        email: modalRoot.querySelector('#cnt-email').value.trim(),
        phone: modalRoot.querySelector('#cnt-phone').value.trim(),
        companyName,
        companyId: matchedComp ? matchedComp.id : null,
        title: modalRoot.querySelector('#cnt-title').value.trim(),
        lifecycleStage: modalRoot.querySelector('#cnt-stage').value,
        status: modalRoot.querySelector('#cnt-status').value,
        notes: modalRoot.querySelector('#cnt-notes').value.trim(),
      };

      const submitBtn = modalRoot.querySelector('#btn-submit-contact');
      submitBtn.classList.add('loading');

      try {
        if (isEdit) {
          await api.contacts.update(contactToEdit.id, payload);
          showToast('success', 'Contact Updated', `Saved profile for ${payload.firstName} ${payload.lastName}`);
        } else {
          await api.contacts.create(payload);
          showToast('success', 'Contact Created', `Added ${payload.firstName} ${payload.lastName}`);
        }
        closeModal();
        fetchContacts(isEdit ? pagination.page : 1);
      } catch (err) {
        showToast('error', 'Operation Failed', err.message);
        submitBtn.classList.remove('loading');
      }
    });
  }

  // ── Delete Contact ──────────────────────────────────────────
  async function confirmDeleteContact(contact) {
    if (!confirm(`Are you sure you want to delete contact "${contact.fullName}"?`)) return;
    try {
      await api.contacts.delete(contact.id);
      showToast('info', 'Contact Deleted', `Removed ${contact.fullName}`);
      fetchContacts(pagination.page);
    } catch (err) {
      showToast('error', 'Delete Failed', err.message);
    }
  }

  // ── Listeners ───────────────────────────────────────────────
  container.querySelector('#btn-create-contact').addEventListener('click', () => showContactModal());

  let searchTimer = null;
  container.querySelector('#contacts-search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentSearch = e.target.value;
      fetchContacts(1);
    }, 300);
  });

  container.querySelector('#filter-stage').addEventListener('change', (e) => {
    currentStage = e.target.value;
    fetchContacts(1);
  });

  container.querySelector('#filter-contact-status').addEventListener('change', (e) => {
    currentStatus = e.target.value;
    fetchContacts(1);
  });

  container.querySelector('#btn-refresh-contacts').addEventListener('click', () => {
    fetchContacts(pagination.page);
  });

  container.querySelector('#btn-contacts-prev').addEventListener('click', () => {
    if (pagination.hasPrev) fetchContacts(pagination.page - 1);
  });

  container.querySelector('#btn-contacts-next').addEventListener('click', () => {
    if (pagination.hasNext) fetchContacts(pagination.page + 1);
  });

  // Initial Load
  loadCompanies();
  fetchContacts(1);
}
