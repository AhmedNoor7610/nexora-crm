// ── Nexora CRM — Deals & Visual Kanban Sales Pipeline ──────────────
import Sortable from 'sortablejs';
import { Icons } from '../icons.js';
import { api } from '../api.js';
import { showToast } from '../toast.js';
import { _esc } from '../utils.js';

const STAGES = [
  { key: 'qualification', label: 'Qualification', probability: 20, color: '#38bdf8' },
  { key: 'proposal',      label: 'Proposal / Demo', probability: 40, color: '#a78bfa' },
  { key: 'negotiation',   label: 'Negotiation',   probability: 70, color: '#f59e0b' },
  { key: 'closing',       label: 'Closing',       probability: 90, color: '#ec4899' },
  { key: 'won',           label: 'Closed Won',    probability: 100, color: '#10b981' },
  { key: 'lost',          label: 'Closed Lost',   probability: 0,   color: '#f43f5e' },
];

export async function renderDeals(container, user) {
  let viewMode = 'kanban'; // 'kanban' | 'list'
  let pipelineData = null;
  let allDeals = [];
  let currentSearch = '';
  let currentPriority = '';
  let sortableInstances = [];

  container.innerHTML = `
    <div class="page-enter">
      <!-- Page Header -->
      <div class="crm-page-header">
        <div>
          <div class="page-header__eyebrow">Revenue Generation</div>
          <h1 class="page-header__title">Deals & Sales Pipeline</h1>
          <p class="page-header__subtitle">Visual Kanban board with drag-and-drop stage progression, probability weighting, and audit history.</p>
        </div>
        <div class="crm-header-actions">
          <div class="view-mode-toggle" role="group" aria-label="View Mode">
            <button class="view-btn ${viewMode === 'kanban' ? 'active' : ''}" id="btn-view-kanban" title="Kanban Board View">
              ${Icons.dashboard} Kanban
            </button>
            <button class="view-btn ${viewMode === 'list' ? 'active' : ''}" id="btn-view-list" title="List View">
              ${Icons.tasks} Table
            </button>
          </div>
          <button class="btn btn--primary" id="btn-create-deal">
            ${Icons.plus} New Deal
          </button>
        </div>
      </div>

      <!-- Pipeline Valuation Summary Banner -->
      <div class="crm-stats-row" id="deals-metrics-banner">
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Total Pipeline Value</div>
          <div class="crm-stat-card__val text-cyan" id="metric-pipeline-val">--</div>
          <div class="crm-stat-card__sub">Active open deals</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Weighted Forecast</div>
          <div class="crm-stat-card__val text-purple" id="metric-weighted-val">--</div>
          <div class="crm-stat-card__sub">Sum of (Value × Probability)</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Closed Won Revenue</div>
          <div class="crm-stat-card__val text-emerald" id="metric-won-rev">--</div>
          <div class="crm-stat-card__sub">Signed commercial revenue</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Win Rate</div>
          <div class="crm-stat-card__val text-amber" id="metric-win-rate">--</div>
          <div class="crm-stat-card__sub">Won / Closed deals</div>
        </div>
        <div class="crm-stat-card">
          <div class="crm-stat-card__label">Active Deals</div>
          <div class="crm-stat-card__val" id="metric-total-deals">--</div>
          <div class="crm-stat-card__sub">In active sales cycles</div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="crm-toolbar">
        <div class="crm-search-wrap">
          <span class="crm-search-icon">${Icons.search}</span>
          <input
            type="search"
            class="crm-search-input"
            id="deals-search-input"
            placeholder="Search deals by name, company, contact…"
            value=""
          />
        </div>

        <div class="crm-filter-group">
          <select class="crm-select" id="filter-deal-priority">
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <button class="btn btn--secondary" id="btn-refresh-pipeline" title="Refresh Board">
            ${Icons.refresh}
          </button>
        </div>
      </div>

      <!-- Main Kanban Board or List View Container -->
      <div id="deals-view-content">
        <div class="crm-loading-cell">Loading Kanban sales pipeline…</div>
      </div>
    </div>

    <!-- Modals & Drawers Root -->
    <div id="deals-modal-root"></div>
  `;

  // ── Load Pipeline Data ──────────────────────────────────────
  async function loadPipeline() {
    try {
      const res = await api.deals.pipeline();
      pipelineData = res;

      // Extract all deals array for list view and filtering
      allDeals = [];
      if (res.columns) {
        for (const col of Object.values(res.columns)) {
          if (col.deals) allDeals.push(...col.deals);
        }
      }

      updateMetricsBanner(res.metrics);
      renderCurrentView();
    } catch (err) {
      container.querySelector('#deals-view-content').innerHTML = `
        <div class="crm-error-cell">Failed to load pipeline: ${err.message}</div>
      `;
      showToast('error', 'Error', err.message);
    }
  }

  // ── Update Valuation Banner ─────────────────────────────────
  function updateMetricsBanner(metrics) {
    if (!metrics) return;
    container.querySelector('#metric-pipeline-val').textContent = `$${(metrics.totalPipelineValue || 0).toLocaleString()}`;
    container.querySelector('#metric-weighted-val').textContent = `$${(metrics.weightedPipelineValue || 0).toLocaleString()}`;
    container.querySelector('#metric-won-rev').textContent = `$${(metrics.wonRevenue || 0).toLocaleString()}`;
    container.querySelector('#metric-win-rate').textContent = `${metrics.winRate || 0}%`;
    container.querySelector('#metric-total-deals').textContent = metrics.totalDeals || 0;
  }

  // ── Render View Router ──────────────────────────────────────
  function renderCurrentView() {
    const viewContainer = container.querySelector('#deals-view-content');
    if (viewMode === 'kanban') {
      renderKanbanBoard(viewContainer);
    } else {
      renderTableView(viewContainer);
    }
  }

  // ── Render Visual Kanban Board ──────────────────────────────
  function renderKanbanBoard(wrapper) {
    // Destroy previous sortable instances
    sortableInstances.forEach(s => s.destroy());
    sortableInstances = [];

    const columns = pipelineData?.columns || {};

    wrapper.innerHTML = `
      <div class="kanban-board-scroll">
        <div class="kanban-board" id="kanban-board">
          ${STAGES.map(stage => {
            const col = columns[stage.key] || { count: 0, totalAmount: 0, weightedAmount: 0, deals: [] };
            let stageDeals = col.deals || [];

            // Apply search & priority filters
            if (currentSearch) {
              const q = currentSearch.toLowerCase();
              stageDeals = stageDeals.filter(d =>
                d.name?.toLowerCase().includes(q) ||
                d.companyName?.toLowerCase().includes(q) ||
                d.contactName?.toLowerCase().includes(q)
              );
            }
            if (currentPriority) {
              stageDeals = stageDeals.filter(d => d.priority === currentPriority);
            }

            const colAmount = stageDeals.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

            return `
              <div class="kanban-column" data-stage="${stage.key}">
                <!-- Column Header -->
                <div class="kanban-column-header">
                  <div class="kanban-header-left">
                    <span class="kanban-stage-dot" style="background:${stage.color}"></span>
                    <span class="kanban-stage-title">${stage.label}</span>
                    <span class="kanban-count-badge" id="col-count-${stage.key}">${stageDeals.length}</span>
                  </div>
                  <div class="kanban-prob-pill" style="color:${stage.color}">${stage.probability}%</div>
                </div>

                <!-- Column Valuation -->
                <div class="kanban-column-value">
                  <div class="col-val-total" id="col-total-${stage.key}">$${colAmount.toLocaleString()}</div>
                  <div class="col-val-weighted">Weight: $${Math.round((colAmount * stage.probability) / 100).toLocaleString()}</div>
                </div>

                <!-- Drop List -->
                <div class="kanban-cards-list" data-stage="${stage.key}" id="column-list-${stage.key}">
                  ${stageDeals.map(deal => renderDealCardHTML(deal, stage)).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Initialize SortableJS Drag & Drop on every column
    const lists = wrapper.querySelectorAll('.kanban-cards-list');
    lists.forEach(listEl => {
      const sortable = new Sortable(listEl, {
        group: 'deals-kanban-pipeline',
        animation: 200,
        ghostClass: 'kanban-card--ghost',
        chosenClass: 'kanban-card--chosen',
        dragClass: 'kanban-card--dragging',
        handle: '.kanban-card',
        onEnd: async (evt) => {
          const itemEl = evt.item;
          const dealId = itemEl.dataset.dealId;
          const fromStage = evt.from.dataset.stage;
          const toStage = evt.to.dataset.stage;

          if (fromStage === toStage) return; // Dropped in same column

          // Optimistic UI state
          updateColumnCounters();

          try {
            const result = await api.deals.changeStage(
              dealId,
              toStage,
              `Moved from ${getStageLabel(fromStage)} to ${getStageLabel(toStage)} via Kanban Drag-and-Drop`
            );

            showToast('success', 'Stage Updated', `Moved to ${getStageLabel(toStage)}`);
            loadPipeline(); // Recalculate full weighted pipeline
          } catch (err) {
            showToast('error', 'Stage Transition Denied', err.message);
            // Revert DOM position on failure
            if (evt.from && itemEl) {
              evt.from.appendChild(itemEl);
            }
            updateColumnCounters();
          }
        },
      });

      sortableInstances.push(sortable);
    });

    // Attach card click handlers to view details & audit history
    wrapper.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent opening drawer if user is dragging
        if (card.classList.contains('kanban-card--chosen')) return;
        const dealId = card.dataset.dealId;
        const deal = allDeals.find(d => d.id === dealId);
        if (deal) showDealDetailsDrawer(deal);
      });
    });
  }

  // ── Render Deal Card HTML ───────────────────────────────────
  function renderDealCardHTML(deal, stage) {
    const priorityClass = `priority--${(deal.priority || 'medium').toLowerCase()}`;
    const initials = (deal.ownerName || 'AE').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'NX';

    return `
      <div class="kanban-card" data-deal-id="${deal.id}" tabindex="0" role="button" aria-label="Deal: ${_esc(deal.name)}">
        <div class="kanban-card__top">
          <span class="kanban-priority-badge ${priorityClass}">${_esc(deal.priority || 'Medium')}</span>
          <span class="kanban-card__prob">${deal.probability || stage?.probability || 20}%</span>
        </div>

        <h4 class="kanban-card__title">${_esc(deal.name)}</h4>

        <div class="kanban-card__company">
          ${Icons.building} ${_esc(deal.companyName || 'Corporate Client')}
        </div>

        ${deal.contactName ? `
          <div class="kanban-card__contact">
            ${Icons.user} ${_esc(deal.contactName)}
          </div>
        ` : ''}

        <div class="kanban-card__bottom">
          <div class="kanban-card__amount">
            $${(Number(deal.amount) || 0).toLocaleString()}
          </div>
          <div class="kanban-card__owner" title="Account Owner: ${_esc(deal.ownerName || 'Assigned Rep')}">
            <div class="owner-circle">${initials}</div>
          </div>
        </div>

        ${deal.stageHistory?.length ? `
          <div class="kanban-card__history-pill" title="${deal.stageHistory.length} recorded stage transitions">
            ${Icons.activity} ${deal.stageHistory.length} moves
          </div>
        ` : ''}
      </div>
    `;
  }

  // ── Dynamic Column Counters Update ──────────────────────────
  function updateColumnCounters() {
    STAGES.forEach(st => {
      const listEl = container.querySelector(`#column-list-${st.key}`);
      const countEl = container.querySelector(`#col-count-${st.key}`);
      const totalEl = container.querySelector(`#col-total-${st.key}`);
      if (!listEl || !countEl || !totalEl) return;

      const cards = listEl.querySelectorAll('.kanban-card');
      countEl.textContent = cards.length;
    });
  }

  // ── Render Table / List View ────────────────────────────────
  function renderTableView(wrapper) {
    let filteredDeals = [...allDeals];
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      filteredDeals = filteredDeals.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.companyName?.toLowerCase().includes(q) ||
        d.contactName?.toLowerCase().includes(q)
      );
    }
    if (currentPriority) {
      filteredDeals = filteredDeals.filter(d => d.priority === currentPriority);
    }

    wrapper.innerHTML = `
      <div class="crm-table-card">
        <div class="table-responsive">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Deal Name</th>
                <th>Company & Contact</th>
                <th>Stage</th>
                <th>Amount</th>
                <th>Probability</th>
                <th>Weighted Val.</th>
                <th>Priority</th>
                <th>Owner</th>
                <th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredDeals.length ? filteredDeals.map(d => {
                const stageObj = STAGES.find(s => s.key === d.stage) || STAGES[0];
                const priorityClass = `priority--${(d.priority || 'medium').toLowerCase()}`;
                const weighted = Math.round(((d.amount || 0) * (d.probability || stageObj.probability)) / 100);

                return `
                  <tr data-deal-id="${d.id}">
                    <td>
                      <div class="lead-fullname">${d.name}</div>
                      <div class="lead-email">${d.notes ? d.notes.slice(0, 45) + '…' : 'No notes'}</div>
                    </td>
                    <td>
                      <div class="lead-company">${d.companyName || 'Unassigned'}</div>
                      <div class="lead-title">${d.contactName || ''}</div>
                    </td>
                    <td>
                      <span class="stage-pill" style="color:${stageObj.color};border-color:${stageObj.color}40;background:${stageObj.color}15">
                        ${stageObj.label}
                      </span>
                    </td>
                    <td class="lead-value-cell">$${(Number(d.amount) || 0).toLocaleString()}</td>
                    <td>${d.probability}%</td>
                    <td class="text-purple" style="font-weight:700">$${weighted.toLocaleString()}</td>
                    <td><span class="kanban-priority-badge ${priorityClass}">${d.priority}</span></td>
                    <td><div class="lead-owner-text">${d.ownerName || 'Assigned Rep'}</div></td>
                    <td style="text-align:right">
                      <div class="crm-row-actions">
                        <button class="crm-action-btn crm-action-btn--primary" data-action="details" data-id="${d.id}" title="View Timeline & Details">
                          ${Icons.eye} Details
                        </button>
                        <button class="crm-action-btn" data-action="edit" data-id="${d.id}" title="Edit Deal">
                          ${Icons.edit}
                        </button>
                        <button class="crm-action-btn crm-action-btn--danger" data-action="delete" data-id="${d.id}" title="Delete Deal">
                          ${Icons.trash}
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="9" class="crm-empty-cell">No deals match the selected criteria.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;

    wrapper.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const deal = allDeals.find(d => d.id === id);
        if (!deal) return;

        if (action === 'details') showDealDetailsDrawer(deal);
        if (action === 'edit') showDealModal(deal);
        if (action === 'delete') confirmDeleteDeal(deal);
      });
    });
  }

  // ── Deal Details & Stage History Timeline Drawer ────────────
  function showDealDetailsDrawer(deal) {
    const modalRoot = container.querySelector('#deals-modal-root');
    const stageObj = STAGES.find(s => s.key === deal.stage) || STAGES[0];
    const history = deal.stageHistory || [];

    modalRoot.innerHTML = `
      <div class="crm-modal-backdrop" id="modal-backdrop">
        <div class="crm-modal-card crm-modal-card--wide">
          <div class="crm-modal-header">
            <div>
              <div class="modal-badge-safe">Commercial Opportunity</div>
              <h2 class="crm-modal-title" style="margin-top:2px">${deal.name}</h2>
              <div class="text-muted" style="font-size:0.85rem">
                ${deal.companyName || 'Corporate Client'} • Owner: ${deal.ownerName || 'Assigned Rep'}
              </div>
            </div>
            <button class="crm-modal-close" id="btn-close-drawer">${Icons.x}</button>
          </div>

          <div class="crm-modal-body">
            <!-- Top Deal Overview Stats -->
            <div class="comp-quick-stats">
              <div class="quick-stat">
                <div class="quick-stat-lbl">Deal Value</div>
                <div class="quick-stat-val text-cyan">$${(Number(deal.amount) || 0).toLocaleString()}</div>
              </div>
              <div class="quick-stat">
                <div class="quick-stat-lbl">Stage</div>
                <div class="quick-stat-val" style="color:${stageObj.color}">${stageObj.label}</div>
              </div>
              <div class="quick-stat">
                <div class="quick-stat-lbl">Probability</div>
                <div class="quick-stat-val text-purple">${deal.probability}%</div>
              </div>
              <div class="quick-stat">
                <div class="quick-stat-lbl">Weighted Value</div>
                <div class="quick-stat-val text-amber">$${Math.round(((deal.amount || 0) * (deal.probability || stageObj.probability)) / 100).toLocaleString()}</div>
              </div>
            </div>

            <!-- Quick Stage Transition Selector -->
            <div class="deal-stage-quick-change">
              <label class="form-label">Update Pipeline Stage:</label>
              <div class="stage-stepper-wrap">
                ${STAGES.map(s => `
                  <button
                    type="button"
                    class="stage-step-btn ${s.key === deal.stage ? 'active' : ''}"
                    data-stage="${s.key}"
                    style="${s.key === deal.stage ? `background:${s.color};border-color:${s.color}` : ''}"
                  >
                    ${s.label}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Stage History Audit Timeline -->
            <div class="related-section" style="margin-top:24px">
              <div class="related-section-title">
                <span>${Icons.activity} Stage Transition Audit History (${history.length} events)</span>
              </div>

              ${history.length ? `
                <div class="timeline-trail">
                  ${history.map((evt, idx) => {
                    const fromLabel = getStageLabel(evt.fromStage);
                    const toLabel = getStageLabel(evt.toStage);
                    const formattedDate = new Date(evt.changedAt).toLocaleString();

                    return `
                      <div class="timeline-node">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                          <div class="timeline-header">
                            <span class="timeline-transition">
                              <strong>${fromLabel}</strong> ${Icons.arrowRight} <strong>${toLabel}</strong>
                            </span>
                            <span class="timeline-date">${formattedDate}</span>
                          </div>
                          <div class="timeline-user">Updated by: <strong>${evt.changedByName || evt.changedBy}</strong></div>
                          ${evt.note ? `<div class="timeline-note">“${evt.note}”</div>` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div class="related-empty-box">This deal has remained in initial <strong>${stageObj.label}</strong> stage since creation.</div>
              `}
            </div>

            <div class="crm-modal-footer">
              <button type="button" class="btn btn--secondary" id="btn-edit-from-drawer">${Icons.edit} Edit Deal</button>
              <button type="button" class="btn btn--secondary" id="btn-close-drawer-bottom">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;

    function closeDrawer() {
      modalRoot.innerHTML = '';
    }

    modalRoot.querySelector('#btn-close-drawer').addEventListener('click', closeDrawer);
    modalRoot.querySelector('#btn-close-drawer-bottom').addEventListener('click', closeDrawer);

    modalRoot.querySelector('#btn-edit-from-drawer').addEventListener('click', () => {
      closeDrawer();
      showDealModal(deal);
    });

    // Quick stage selector click inside drawer
    modalRoot.querySelectorAll('.stage-step-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newStage = btn.dataset.stage;
        if (newStage === deal.stage) return;

        btn.textContent = 'Updating…';
        try {
          await api.deals.changeStage(
            deal.id,
            newStage,
            `Stage updated via Deal Drawer to ${getStageLabel(newStage)}`
          );

          showToast('success', 'Stage Updated', `Deal is now in ${getStageLabel(newStage)}`);
          closeDrawer();
          loadPipeline();
        } catch (err) {
          showToast('error', 'Stage Update Failed', err.message);
          btn.textContent = getStageLabel(newStage);
        }
      });
    });
  }

  // ── Create / Edit Deal Modal ────────────────────────────────
  function showDealModal(dealToEdit = null) {
    const isEdit = Boolean(dealToEdit);
    const modalRoot = container.querySelector('#deals-modal-root');

    modalRoot.innerHTML = `
      <div class="crm-modal-backdrop" id="modal-backdrop">
        <div class="crm-modal-card">
          <div class="crm-modal-header">
            <div>
              <div class="modal-badge-safe">${isEdit ? 'Update Deal' : 'New Opportunity'}</div>
              <h2 class="crm-modal-title">${isEdit ? 'Edit Deal Opportunity' : 'Create New Deal'}</h2>
            </div>
            <button class="crm-modal-close" id="btn-close-modal">${Icons.x}</button>
          </div>

          <div class="crm-modal-body">
            <form id="deal-form">
              <div class="form-group">
                <label class="form-label" for="deal-name">Deal / Opportunity Name *</label>
                <input class="form-input" id="deal-name" type="text" value="${dealToEdit?.name || ''}" placeholder="e.g. Acme Corp — Global Expansion" required />
              </div>

              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="deal-amount">Deal Amount ($ USD) *</label>
                  <input class="form-input" id="deal-amount" type="number" value="${dealToEdit?.amount || 50000}" min="0" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="deal-priority">Priority</label>
                  <select class="crm-select w-full" id="deal-priority">
                    <option value="Critical" ${dealToEdit?.priority === 'Critical' ? 'selected' : ''}>Critical</option>
                    <option value="High" ${dealToEdit?.priority === 'High' ? 'selected' : ''}>High</option>
                    <option value="Medium" ${dealToEdit?.priority === 'Medium' || !dealToEdit ? 'selected' : ''}>Medium</option>
                    <option value="Low" ${dealToEdit?.priority === 'Low' ? 'selected' : ''}>Low</option>
                  </select>
                </div>
              </div>

              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="deal-company">Company / Account Name</label>
                  <input class="form-input" id="deal-company" type="text" value="${dealToEdit?.companyName || ''}" placeholder="e.g. Stripe Payments Inc." />
                </div>
                <div class="form-group">
                  <label class="form-label" for="deal-contact">Primary Contact</label>
                  <input class="form-input" id="deal-contact" type="text" value="${dealToEdit?.contactName || ''}" placeholder="e.g. Patrick Vance" />
                </div>
              </div>

              <div class="crm-form-row">
                <div class="form-group">
                  <label class="form-label" for="deal-stage">Pipeline Stage</label>
                  <select class="crm-select w-full" id="deal-stage">
                    ${STAGES.map(s => `
                      <option value="${s.key}" ${dealToEdit?.stage === s.key ? 'selected' : ''}>
                        ${s.label} (${s.probability}%)
                      </option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="deal-prob">Custom Probability (%)</label>
                  <input class="form-input" id="deal-prob" type="number" min="0" max="100" value="${dealToEdit?.probability || ''}" placeholder="Auto from stage" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="deal-notes">Opportunity Notes & Commercial Scope</label>
                <textarea class="crm-textarea" id="deal-notes" rows="3" placeholder="Contract terms, technical requirements, procurement schedule…">${dealToEdit?.notes || ''}</textarea>
              </div>

              <div class="crm-modal-footer">
                <button type="button" class="btn btn--secondary" id="btn-cancel-deal">Cancel</button>
                <button type="submit" class="btn btn--primary" id="btn-submit-deal">
                  ${isEdit ? 'Save Changes' : 'Create Deal'}
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
    modalRoot.querySelector('#btn-cancel-deal').addEventListener('click', closeModal);

    modalRoot.querySelector('#deal-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: modalRoot.querySelector('#deal-name').value.trim(),
        amount: Number(modalRoot.querySelector('#deal-amount').value) || 0,
        priority: modalRoot.querySelector('#deal-priority').value,
        companyName: modalRoot.querySelector('#deal-company').value.trim(),
        contactName: modalRoot.querySelector('#deal-contact').value.trim(),
        stage: modalRoot.querySelector('#deal-stage').value,
        notes: modalRoot.querySelector('#deal-notes').value.trim(),
      };

      const customProb = modalRoot.querySelector('#deal-prob').value;
      if (customProb !== '') {
        payload.probability = Number(customProb);
      }

      const submitBtn = modalRoot.querySelector('#btn-submit-deal');
      submitBtn.classList.add('loading');

      try {
        if (isEdit) {
          await api.deals.update(dealToEdit.id, payload);
          showToast('success', 'Deal Updated', `Saved changes for ${payload.name}`);
        } else {
          await api.deals.create(payload);
          showToast('success', 'Deal Created', `Added ${payload.name} to pipeline`);
        }
        closeModal();
        loadPipeline();
      } catch (err) {
        showToast('error', 'Operation Failed', err.message);
        submitBtn.classList.remove('loading');
      }
    });
  }

  // ── Delete Confirmation ─────────────────────────────────────
  async function confirmDeleteDeal(deal) {
    if (!confirm(`Are you sure you want to delete deal "${deal.name}"?`)) return;
    try {
      await api.deals.delete(deal.id);
      showToast('info', 'Deal Deleted', `Removed ${deal.name}`);
      loadPipeline();
    } catch (err) {
      showToast('error', 'Delete Failed', err.message);
    }
  }

  function getStageLabel(key) {
    const s = STAGES.find(item => item.key === key);
    return s ? s.label : key;
  }

  // ── Listeners ───────────────────────────────────────────────
  container.querySelector('#btn-create-deal').addEventListener('click', () => showDealModal());

  container.querySelector('#btn-view-kanban').addEventListener('click', () => {
    viewMode = 'kanban';
    container.querySelector('#btn-view-kanban').classList.add('active');
    container.querySelector('#btn-view-list').classList.remove('active');
    renderCurrentView();
  });

  container.querySelector('#btn-view-list').addEventListener('click', () => {
    viewMode = 'list';
    container.querySelector('#btn-view-list').classList.add('active');
    container.querySelector('#btn-view-kanban').classList.remove('active');
    renderCurrentView();
  });

  let searchTimer = null;
  container.querySelector('#deals-search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentSearch = e.target.value;
      renderCurrentView();
    }, 250);
  });

  container.querySelector('#filter-deal-priority').addEventListener('change', (e) => {
    currentPriority = e.target.value;
    renderCurrentView();
  });

  container.querySelector('#btn-refresh-pipeline').addEventListener('click', () => {
    loadPipeline();
  });

  // Initial Load
  loadPipeline();
}
