// ── Nexora CRM — Companies Module Frontend ───────────────────
import { Icons } from '../icons.js';
import { api } from '../api.js';
import { showToast } from '../toast.js';
import { _esc } from '../utils.js';

export async function renderCompanies(container, user) {
  let companies = [];
  let pagination = { page: 1, limit: 10, total: 0, totalPages: 1 };
  let currentSearch = '';
  let currentIndustry = '';
  let currentSize = '';
  let currentStatus = '';

  container.innerHTML = `
    <div class="page-enter">
      <!-- Page Header -->
      <div class="crm-page-header">
        <div>
          <div class="page-header__eyebrow">Accounts & Organizations</div>
          <h1 class="page-header__title">Companies Directory</h1>
          <p class="page-header__subtitle">Manage corporate accounts, industry verticals, commercial sizes, and related customer records.</p>
        </div>
        <div class="crm-header-actions">
          <button class="btn btn--primary" id="btn-create-company">
            ${Icons.plus} New Company
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div class="crm-stats-row">
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Total Accounts</div>
          <div class="crm-stat-card__val" id="comp-stat-total">--</div>
          <div class="crm-stat-card__sub">Across all industries</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Active Clients</div>
          <div class="crm-stat-card__val text-emerald" id="comp-stat-clients">--</div>
          <div class="crm-stat-card__sub">Contracted corporate accounts</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Strategic Prospects</div>
          <div class="crm-stat-card__val text-cyan" id="comp-stat-prospects">--</div>
          <div class="crm-stat-card__sub">Pipeline opportunities</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Tracked Account Value</div>
          <div class="crm-stat-card__val text-amber" id="comp-stat-value">--</div>
          <div class="crm-stat-card__sub">Combined deal pipeline</div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="crm-toolbar">
        <div class="crm-search-wrap">
          <span class="crm-search-icon">${Icons.search}</span>
          <input
            type="search"
            class="crm-search-input"
            id="comp-search-input"
            placeholder="Search companies by name, domain, city…"
            value=""
          />
        </div>

        <div class="crm-filter-group">
          <select class="crm-select" id="filter-industry">
            <option value="">All Industries</option>
            <option value="Technology & SaaS">Technology & SaaS</option>
            <option value="Financial Services">Financial Services</option>
            <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
            <option value="Manufacturing & Logistics">Manufacturing & Logistics</option>
            <option value="Energy & Utilities">Energy & Utilities</option>
            <option value="Professional Services">Professional Services</option>
            <option value="E-Commerce & Retail">E-Commerce & Retail</option>
          </select>

          <select class="crm-select" id="filter-size">
            <option value="">All Sizes</option>
            <option value="1-10">1-10 Employees</option>
            <option value="11-50">11-50 Employees</option>
            <option value="51-200">51-200 Employees</option>
            <option value="201-500">201-500 Employees</option>
            <option value="500+">500+ Employees</option>
          </select>

          <select class="crm-select" id="filter-comp-status">
            <option value="">All Statuses</option>
            <option value="Active Client">Active Client</option>
            <option value="Prospect">Prospect</option>
            <option value="Partner">Partner</option>
            <option value="Churned">Churned</option>
            <option value="Inactive">Inactive</option>
          </select>

          <button class="btn btn--secondary" id="btn-refresh-companies" title="Refresh">
            ${Icons.refresh}
          </button>
        </div>
      </div>

      <!-- Companies Table Card -->
      <div class="crm-table-card">
        <div class="table-responsive">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Industry</th>
                <th>Size & Revenue</th>
                <th>Contacts</th>
                <th>Status</th>
                <th>Account Owner</th>
                <th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody id="companies-table-body">
              <tr>
                <td colspan="7" class="crm-loading-cell">Loading companies…</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="crm-pagination-bar">
          <div class="crm-pagination-info" id="comp-page-info">Showing 0 of 0 companies</div>
          <div class="crm-pagination-btns">
            <button class="btn btn--sm btn--secondary" id="btn-comp-prev" disabled>
              ${Icons.chevronLeft} Previous
            </button>
            <span class="crm-page-number" id="comp-current-page">Page 1</span>
            <button class="btn btn--sm btn--secondary" id="btn-comp-next" disabled>
              Next ${Icons.chevronRight}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Container -->
    <div id="companies-modal-root"></div>
  `;

  // ── Load Stats ──────────────────────────────────────────────
  async function loadStats() {
    try {
      const res = await api.companies.stats();
      if (res.stats) {
        container.querySelector('#comp-stat-total').textContent = res.stats.total;
        container.querySelector('#comp-stat-clients').textContent = res.stats.clients;
        container.querySelector('#comp-stat-prospects').textContent = res.stats.prospects;
        container.querySelector('#comp-stat-value').textContent = `$${(res.stats.totalPipelineValue || 0).toLocaleString()}`;
      }
    } catch {
      // background
    }
  }

  // ── Fetch Companies ─────────────────────────────────────────
  async function fetchCompanies(page = 1) {
    const tbody = container.querySelector('#companies-table-body');
    tbody.innerHTML = `<tr><td colspan="7" class="crm-loading-cell">Updating companies…</td></tr>`;

    try {
      const res = await api.companies.list({
        page,
        limit: 10,
        search: currentSearch,
        industry: currentIndustry,
        size: currentSize,
        status: currentStatus,
      });

      companies = res.items || [];
      pagination = res.pagination || { page: 1, limit: 10, total: companies.length, totalPages: 1 };
      renderTable();
      renderPagination();
      loadStats();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="crm-error-cell">Failed to load companies: ${err.message}</td></tr>`;
      showToast('error', 'Error', err.message);
    }
  }

  // ── Render Table ────────────────────────────────────────────
  function renderTable() {
    const tbody = container.querySelector('#companies-table-body');
    if (!companies.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="crm-empty-cell">
            <div class="empty-state-wrap">
              <span class="empty-icon">${Icons.building}</span>
              <h3>No companies found</h3>
              <p>Add a new company or convert an inbound lead.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = companies.map(c => {
      const initials = (c.name || 'CO').slice(0, 2).toUpperCase();
      const statusClass = `comp-status--${(c.status || 'prospect').toLowerCase().replace(/\s+/g, '-')}`;

      return `
        <tr data-comp-id="${c.id}">
          <td>
            <div class="lead-name-cell">
              <div class="company-avatar">${initials}</div>
              <div>
                <div class="lead-fullname">${_esc(c.name)}</div>
                <div class="lead-email">
                  ${c.domain ? `<a href="${_esc(c.website || `https://${c.domain}`)}" target="_blank" class="external-link" rel="noopener">${_esc(c.domain)} ${Icons.external}</a>` : 'No domain'}
                </div>
              </div>
            </div>
          </td>
          <td>
            <span class="industry-tag">${_esc(c.industry || 'General')}</span>
          </td>
          <td>
            <div class="comp-size-text">${_esc(c.size || '11-50')} emp.</div>
            <div class="comp-revenue-text">$${(c.annualRevenue ? (c.annualRevenue / 1000000).toFixed(1) + 'M' : 'Undisclosed')}</div>
          </td>
          <td>
            <span class="contacts-count-pill" title="${c.contactsCount || 0} associated contacts">
              ${Icons.user} ${c.contactsCount || 0}
            </span>
          </td>
          <td>
            <span class="company-status-badge ${statusClass}">${_esc(c.status)}</span>
          </td>
          <td>
            <div class="lead-owner-text">${_esc(c.ownerName || 'Account Exec')}</div>
          </td>
          <td style="text-align:right">
            <div class="crm-row-actions">
              <button class="crm-action-btn crm-action-btn--primary" data-action="details" data-id="${c.id}" title="View Company 360 Details">
                ${Icons.eye} Details
              </button>
              <button class="crm-action-btn" data-action="edit" data-id="${c.id}" title="Edit Company">
                ${Icons.edit}
              </button>
              <button class="crm-action-btn crm-action-btn--danger" data-action="delete" data-id="${c.id}" title="Delete Company">
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
        const comp = companies.find(item => item.id === id);
        if (!comp) return;

        if (action === 'details') showCompanyDetailsModal(comp.id);
        if (action === 'edit') showCompanyModal(comp);
        if (action === 'delete') confirmDeleteCompany(comp);
      });
    });
  }

  // ── Render Pagination ───────────────────────────────────────
  function renderPagination() {
    const info = container.querySelector('#comp-page-info');
    const pageNum = container.querySelector('#comp-current-page');
    const btnPrev = container.querySelector('#btn-comp-prev');
    const btnNext = container.querySelector('#btn-comp-next');

    const start = (pagination.page - 1) * pagination.limit + (companies.length ? 1 : 0);
    const end = Math.min(pagination.page * pagination.limit, pagination.total);

    info.textContent = `Showing ${start}–${end} of ${pagination.total} companies`;
    pageNum.textContent = `Page ${pagination.page} of ${pagination.totalPages || 1}`;

    btnPrev.disabled = !pagination.hasPrev;
    btnNext.disabled = !pagination.hasNext;
  }

  // ── Company 360 View Modal (Details + Related Contacts & Leads)
  async function showCompanyDetailsModal(companyId) {
    const modalRoot = container.querySelector('#companies-modal-root');
    modalRoot.innerHTML = `
      <div class="crm-modal-backdrop" id="modal-backdrop">
        <div class="crm-modal-card crm-modal-card--wide">
          <div class="crm-loading-cell" style="padding:40px">Loading 360 account profile…</div>
        </div>
      </div>
    `;

    try {
      const res = await api.companies.get(companyId);
      const company = res.company;
      const contacts = company.contacts || [];
      const leads = company.leads || [];

      modalRoot.innerHTML = `
        <div class="crm-modal-backdrop" id="modal-backdrop">
          <div class="crm-modal-card crm-modal-card--wide">
            <div class="crm-modal-header">
              <div class="comp-details-header">
                <div class="company-avatar company-avatar--lg">${(company.name || 'CO').slice(0, 2).toUpperCase()}</div>
                <div>
                  <h2 class="crm-modal-title" style="margin-bottom:2px">${company.name}</h2>
                  <div class="text-muted" style="font-size:0.85rem">
                    ${company.industry} • ${company.size} employees • ${company.address?.city ? `${company.address.city}, ${company.address.country || 'USA'}` : 'Global HQ'}
                  </div>
                </div>
              </div>
              <button class="crm-modal-close" id="btn-close-modal">${Icons.x}</button>
            </div>

            <div class="crm-modal-body">
              <div class="comp-quick-stats">
                <div class="quick-stat">
                  <div class="quick-stat-lbl">Account Status</div>
                  <div class="quick-stat-val text-emerald">${company.status}</div>
                </div>
                <div class="quick-stat">
                  <div class="quick-stat-lbl">Annual Revenue</div>
                  <div class="quick-stat-val">$${(Number(company.annualRevenue) || 0).toLocaleString()}</div>
                </div>
                <div class="quick-stat">
                  <div class="quick-stat-lbl">Linked Contacts</div>
                  <div class="quick-stat-val text-purple">${contacts.length}</div>
                </div>
                <div class="quick-stat">
                  <div class="quick-stat-lbl">Tracked Deals Value</div>
                  <div class="quick-stat-val text-amber">$${(Number(company.dealsValue) || 0).toLocaleString()}</div>
                </div>
              </div>

              <!-- Related Contacts Section -->
              <div class="related-section">
                <div class="related-section-title">
                  <span>${Icons.contacts} Associated People & Decision Makers (${contacts.length})</span>
                </div>
                ${contacts.length ? `
                  <div class="related-items-grid">
                    ${contacts.map(ct => `
                      <div class="related-item-card">
                        <div class="related-item-header">
                          <div class="related-item-name">${ct.fullName}</div>
                          <span class="lifecycle-badge stage--${(ct.lifecycleStage || 'lead').toLowerCase()}">${ct.lifecycleStage || 'Lead'}</span>
                        </div>
                        <div class="related-item-sub">${ct.title || 'Executive'}</div>
                        <div class="related-item-contact">
                          <a href="mailto:${ct.email}">${ct.email}</a>
                          ${ct.phone ? `<span>• ${ct.phone}</span>` : ''}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <div class="related-empty-box">No direct contacts linked yet to this organization.</div>
                `}
              </div>

              <!-- Related Leads Section -->
              ${leads.length ? `
                <div class="related-section" style="margin-top:20px">
                  <div class="related-section-title">
                    <span>${Icons.leads} Historical Inbound Leads (${leads.length})</span>
                  </div>
                  <div class="related-items-grid">
                    ${leads.map(ld => `
                      <div class="related-item-card">
                        <div class="related-item-header">
                          <div class="related-item-name">${ld.fullName}</div>
                          <span class="lead-status-badge badge--lead-${(ld.status || 'new').toLowerCase()}">${ld.status}</span>
                        </div>
                        <div class="related-item-sub">${ld.title || 'Lead'} • Value: $${(Number(ld.value) || 0).toLocaleString()}</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <div class="crm-modal-footer">
                <button type="button" class="btn btn--secondary" id="btn-close-details">Close</button>
              </div>
            </div>
          </div>
        </div>
      `;

      modalRoot.querySelector('#btn-close-modal').addEventListener('click', () => modalRoot.innerHTML = '');
      modalRoot.querySelector('#btn-close-details').addEventListener('click', () => modalRoot.innerHTML = '');
    } catch (err) {
      modalRoot.innerHTML = '';
      showToast('error', 'Failed to load details', err.message);
    }
  }

  // ── Create / Edit Company Modal ─────────────────────────────
  function showCompanyModal(compToEdit = null) {
    const isEdit = Boolean(compToEdit);
    const modalRoot = container.querySelector('#companies-modal-root');

    modalRoot.innerHTML = `
      <div class="crm-modal-backdrop" id="modal-backdrop">
        <div class="crm-modal-card">
          <div class="crm-modal-header">
            <div>
              <div class="modal-badge-safe">${isEdit ? 'Update Account' : 'New Account'}</div>
              <h2 class="crm-modal-title">${isEdit ? 'Edit Company Profile' : 'Add New Company'}</h2>
            </div>
            <button class="crm-modal-close" id="btn-close-modal">${Icons.x}</button>
          </div>

          <div class="crm-modal-body">
            <form id="comp-form">
              <div class="form-group">
                <label class="form-label" for="cp-name">Company Name *</label>
                <input class="form-input" id="cp-name" type="text" value="${compToEdit?.name || ''}" required />
              </div>

              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="cp-domain">Domain (e.g. stripe.com)</label>
                  <input class="form-input" id="cp-domain" type="text" value="${compToEdit?.domain || ''}" placeholder="domain.com" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="cp-phone">HQ Phone</label>
                  <input class="form-input" id="cp-phone" type="tel" value="${compToEdit?.phone || ''}" placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="cp-industry">Industry Vertical</label>
                  <select class="crm-select w-full" id="cp-industry">
                    <option value="Technology & SaaS" ${compToEdit?.industry === 'Technology & SaaS' ? 'selected' : ''}>Technology & SaaS</option>
                    <option value="Financial Services" ${compToEdit?.industry === 'Financial Services' ? 'selected' : ''}>Financial Services</option>
                    <option value="Healthcare & Life Sciences" ${compToEdit?.industry === 'Healthcare & Life Sciences' ? 'selected' : ''}>Healthcare & Life Sciences</option>
                    <option value="Manufacturing & Logistics" ${compToEdit?.industry === 'Manufacturing & Logistics' ? 'selected' : ''}>Manufacturing & Logistics</option>
                    <option value="Energy & Utilities" ${compToEdit?.industry === 'Energy & Utilities' ? 'selected' : ''}>Energy & Utilities</option>
                    <option value="Professional Services" ${compToEdit?.industry === 'Professional Services' ? 'selected' : ''}>Professional Services</option>
                    <option value="E-Commerce & Retail" ${compToEdit?.industry === 'E-Commerce & Retail' ? 'selected' : ''}>E-Commerce & Retail</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="cp-size">Company Size</label>
                  <select class="crm-select w-full" id="cp-size">
                    <option value="1-10" ${compToEdit?.size === '1-10' ? 'selected' : ''}>1-10 Employees</option>
                    <option value="11-50" ${compToEdit?.size === '11-50' ? 'selected' : ''}>11-50 Employees</option>
                    <option value="51-200" ${compToEdit?.size === '51-200' ? 'selected' : ''}>51-200 Employees</option>
                    <option value="201-500" ${compToEdit?.size === '201-500' ? 'selected' : ''}>201-500 Employees</option>
                    <option value="500+" ${compToEdit?.size === '500+' ? 'selected' : ''}>500+ Employees</option>
                  </select>
                </div>
              </div>

              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="cp-status">Relationship Status</label>
                  <select class="crm-select w-full" id="cp-status">
                    <option value="Prospect" ${compToEdit?.status === 'Prospect' ? 'selected' : ''}>Prospect</option>
                    <option value="Active Client" ${compToEdit?.status === 'Active Client' ? 'selected' : ''}>Active Client</option>
                    <option value="Partner" ${compToEdit?.status === 'Partner' ? 'selected' : ''}>Partner</option>
                    <option value="Churned" ${compToEdit?.status === 'Churned' ? 'selected' : ''}>Churned</option>
                    <option value="Inactive" ${compToEdit?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="cp-rev">Annual Revenue ($ USD)</label>
                  <input class="form-input" id="cp-rev" type="number" value="${compToEdit?.annualRevenue || 0}" min="0" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="cp-desc">Company Description & Strategic Notes</label>
                <textarea class="crm-textarea" id="cp-desc" rows="3">${compToEdit?.description || ''}</textarea>
              </div>

              <div class="crm-modal-footer">
                <button type="button" class="btn btn--secondary" id="btn-cancel-comp">Cancel</button>
                <button type="submit" class="btn btn--primary" id="btn-submit-comp">
                  ${isEdit ? 'Save Changes' : 'Create Company'}
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
    modalRoot.querySelector('#btn-cancel-comp').addEventListener('click', closeModal);

    modalRoot.querySelector('#comp-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: modalRoot.querySelector('#cp-name').value.trim(),
        domain: modalRoot.querySelector('#cp-domain').value.trim(),
        website: `https://${modalRoot.querySelector('#cp-domain').value.trim()}`,
        phone: modalRoot.querySelector('#cp-phone').value.trim(),
        industry: modalRoot.querySelector('#cp-industry').value,
        size: modalRoot.querySelector('#cp-size').value,
        status: modalRoot.querySelector('#cp-status').value,
        annualRevenue: Number(modalRoot.querySelector('#cp-rev').value) || 0,
        description: modalRoot.querySelector('#cp-desc').value.trim(),
      };

      const submitBtn = modalRoot.querySelector('#btn-submit-comp');
      submitBtn.classList.add('loading');

      try {
        if (isEdit) {
          await api.companies.update(compToEdit.id, payload);
          showToast('success', 'Company Updated', `Saved profile for ${payload.name}`);
        } else {
          await api.companies.create(payload);
          showToast('success', 'Company Created', `Added ${payload.name}`);
        }
        closeModal();
        fetchCompanies(isEdit ? pagination.page : 1);
      } catch (err) {
        showToast('error', 'Operation Failed', err.message);
        submitBtn.classList.remove('loading');
      }
    });
  }

  // ── Delete Company ──────────────────────────────────────────
  async function confirmDeleteCompany(comp) {
    if (!confirm(`Are you sure you want to delete company "${comp.name}"?`)) return;
    try {
      await api.companies.delete(comp.id);
      showToast('info', 'Company Deleted', `Removed ${comp.name}`);
      fetchCompanies(pagination.page);
    } catch (err) {
      showToast('error', 'Delete Failed', err.message);
    }
  }

  // ── Listeners ───────────────────────────────────────────────
  container.querySelector('#btn-create-company').addEventListener('click', () => showCompanyModal());

  let searchTimer = null;
  container.querySelector('#comp-search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentSearch = e.target.value;
      fetchCompanies(1);
    }, 300);
  });

  container.querySelector('#filter-industry').addEventListener('change', (e) => {
    currentIndustry = e.target.value;
    fetchCompanies(1);
  });

  container.querySelector('#filter-size').addEventListener('change', (e) => {
    currentSize = e.target.value;
    fetchCompanies(1);
  });

  container.querySelector('#filter-comp-status').addEventListener('change', (e) => {
    currentStatus = e.target.value;
    fetchCompanies(1);
  });

  container.querySelector('#btn-refresh-companies').addEventListener('click', () => {
    fetchCompanies(pagination.page);
  });

  container.querySelector('#btn-comp-prev').addEventListener('click', () => {
    if (pagination.hasPrev) fetchCompanies(pagination.page - 1);
  });

  container.querySelector('#btn-comp-next').addEventListener('click', () => {
    if (pagination.hasNext) fetchCompanies(pagination.page + 1);
  });

  fetchCompanies(1);
}
