// ── Nexora CRM — Topbar Component ──────────────────────────
import { Icons } from './icons.js';
import { api } from './api.js';
import { _esc, debounce } from './utils.js';

export function createTopbar(user, onToggleSidebar, onLogout) {
  const el = document.createElement('header');
  el.className = 'topbar';
  el.id = 'topbar';

  const initials = user?.avatar || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'NX');
  const roleDisplay = user?.roleTitle || (user?.role ? user.role.toUpperCase() : 'Administrator');
  const orgName = user?.organization?.name || 'Nexora Enterprise';

  el.innerHTML = `
    <button class="topbar__toggle" id="sidebar-toggle" aria-label="Toggle sidebar" title="Toggle sidebar">
      ${Icons.menu}
    </button>

    <div class="topbar__search" role="search" id="topbar-search-wrap">
      <span class="topbar__search-icon">${Icons.search}</span>
      <input
        type="search"
        id="global-search"
        placeholder="Search contacts, deals, companies…"
        aria-label="Global search"
        autocomplete="off"
      />
      <div class="topbar__search-kbd">
        <kbd>⌘</kbd><kbd>K</kbd>
      </div>
      <div id="search-results-dropdown" class="search-results-dropdown" style="display:none"></div>
    </div>

    <div class="topbar__actions">
      <!-- Organization Pill -->
      <div class="topbar-org-pill" title="Current Workspace: ${orgName}">
        <span class="topbar-org-indicator"></span>
        <span class="topbar-org-name">${_esc(orgName)}</span>
      </div>

      <button class="topbar__btn" id="topbar-add-btn" aria-label="Add new" title="Quick add">
        ${Icons.plus}
      </button>

      <button class="topbar__btn topbar__notif-btn" id="topbar-notif-btn" aria-label="Notifications" title="Notifications">
        ${Icons.bell}
        <span class="topbar__notif-dot" id="notif-badge"></span>
      </button>

      <div class="topbar__divider" role="separator"></div>

      <div class="topbar__user" id="topbar-user-menu" role="button" tabindex="0" aria-label="User menu" aria-haspopup="true">
        <div class="topbar__user-info">
          <div class="topbar__user-name">${_esc(user?.name || 'Admin')}</div>
          <div class="topbar__user-role">
            <span class="role-badge role-badge--${user?.role || 'admin'}">${_esc(roleDisplay)}</span>
          </div>
        </div>
        <div class="user-avatar" style="width:36px;height:36px;font-size:0.8rem;background:linear-gradient(135deg,var(--color-purple-600),var(--color-blue-600));color:white;font-weight:700;">
          ${_esc(initials)}
        </div>
      </div>
    </div>
  `;

  // Toggle sidebar
  el.querySelector('#sidebar-toggle').addEventListener('click', onToggleSidebar);

  // Search input & focus shortcut
  const searchInput = el.querySelector('#global-search');
  const searchWrap = el.querySelector('#topbar-search-wrap');
  const dropdown = el.querySelector('#search-results-dropdown');

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    if (e.key === 'Escape') {
      if (dropdown) dropdown.style.display = 'none';
      if (document.activeElement === searchInput) searchInput.blur();
    }
  });

  const doSearch = debounce(async query => {
    if (!query || query.length < 2) {
      dropdown.style.display = 'none';
      return;
    }

    try {
      const [leadsRes, contactsRes, dealsRes, compsRes] = await Promise.all([
        api.leads.list({ search: query, limit: 3 }).catch(() => ({ items: [] })),
        api.contacts.list({ search: query, limit: 3 }).catch(() => ({ items: [] })),
        api.deals.list({ search: query, limit: 3 }).catch(() => ({ items: [] })),
        api.companies.list({ search: query, limit: 3 }).catch(() => ({ items: [] })),
      ]);

      const leads = leadsRes.items || [];
      const contacts = contactsRes.items || [];
      const deals = dealsRes.items || [];
      const comps = compsRes.items || [];

      const totalFound = leads.length + contacts.length + deals.length + comps.length;

      if (totalFound === 0) {
        dropdown.innerHTML = '<div class="search-empty">No results found</div>';
        dropdown.style.display = 'block';
        return;
      }

      dropdown.innerHTML = `
        ${leads.length > 0 ? `
          <div class="search-group-title">Leads</div>
          ${leads.map(l => `
            <a href="#leads" class="search-item" data-page="leads">
              <span class="search-item-icon">${Icons.leads}</span>
              <div>
                <div class="search-item-title">${_esc(l.fullName || `${l.firstName} ${l.lastName}`)}</div>
                <div class="search-item-sub">${_esc(l.company)} · ${_esc(l.status)}</div>
              </div>
            </a>
          `).join('')}
        ` : ''}

        ${contacts.length > 0 ? `
          <div class="search-group-title">Contacts</div>
          ${contacts.map(c => `
            <a href="#contacts" class="search-item" data-page="contacts">
              <span class="search-item-icon">${Icons.contacts}</span>
              <div>
                <div class="search-item-title">${_esc(c.fullName || `${c.firstName} ${c.lastName}`)}</div>
                <div class="search-item-sub">${_esc(c.company || c.companyName || '')} · ${_esc(c.email)}</div>
              </div>
            </a>
          `).join('')}
        ` : ''}

        ${deals.length > 0 ? `
          <div class="search-group-title">Deals</div>
          ${deals.map(d => `
            <a href="#deals" class="search-item" data-page="deals">
              <span class="search-item-icon">${Icons.deals}</span>
              <div>
                <div class="search-item-title">${_esc(d.name)}</div>
                <div class="search-item-sub">$${(d.amount || 0).toLocaleString()} · ${_esc(d.stage)}</div>
              </div>
            </a>
          `).join('')}
        ` : ''}

        ${comps.length > 0 ? `
          <div class="search-group-title">Companies</div>
          ${comps.map(co => `
            <a href="#companies" class="search-item" data-page="companies">
              <span class="search-item-icon">${Icons.companies}</span>
              <div>
                <div class="search-item-title">${_esc(co.name)}</div>
                <div class="search-item-sub">${_esc(co.industry)} · ${_esc(co.status)}</div>
              </div>
            </a>
          `).join('')}
        ` : ''}
      `;

      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.search-item').forEach(item => {
        item.addEventListener('click', () => {
          dropdown.style.display = 'none';
          searchInput.value = '';
        });
      });
    } catch {
      dropdown.style.display = 'none';
    }
  }, 250);

  searchInput.addEventListener('input', e => {
    doSearch(e.target.value.trim());
  });

  document.addEventListener('click', e => {
    if (!searchWrap.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Quick Add Button
  el.querySelector('#topbar-add-btn').addEventListener('click', e => {
    e.stopPropagation();
    showQuickAddMenu(el.querySelector('#topbar-add-btn'));
  });

  // User menu → user dropdown
  const userMenuBtn = el.querySelector('#topbar-user-menu');
  userMenuBtn.addEventListener('click', () => {
    showUserDropdown(userMenuBtn, user, onLogout);
  });

  return el;
}

function showQuickAddMenu(anchor) {
  document.getElementById('quick-add-menu')?.remove();

  const menu = document.createElement('div');
  menu.id = 'quick-add-menu';
  menu.className = 'user-dropdown-card';

  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 8}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  menu.innerHTML = `
    <div class="quick-add-header">Quick Create</div>
    <a href="#leads" class="quick-add-item"><span class="btn-icon">${Icons.leads}</span> New Lead</a>
    <a href="#contacts" class="quick-add-item"><span class="btn-icon">${Icons.contacts}</span> New Contact</a>
    <a href="#deals" class="quick-add-item"><span class="btn-icon">${Icons.deals}</span> New Opportunity / Deal</a>
    <a href="#tasks" class="quick-add-item"><span class="btn-icon">${Icons.tasks}</span> New Task / Activity</a>
  `;

  document.body.appendChild(menu);

  menu.querySelectorAll('.quick-add-item').forEach(item => {
    item.addEventListener('click', () => menu.remove());
  });

  const close = e => {
    if (!menu.contains(e.target) && !anchor.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', close, true);
    }
  };
  setTimeout(() => document.addEventListener('click', close, true), 50);
}

export function showUserDropdown(anchor, user, onLogout) {
  document.getElementById('user-dropdown')?.remove();

  const dropdown = document.createElement('div');
  dropdown.id = 'user-dropdown';
  dropdown.className = 'user-dropdown-card';

  const rect = anchor.getBoundingClientRect();
  dropdown.style.top = `${rect.bottom + 8}px`;
  dropdown.style.right = `${Math.max(16, window.innerWidth - rect.right)}px`;

  const roleName = user?.roleTitle || (user?.role ? user.role.toUpperCase() : 'Administrator');
  const orgName = user?.organization?.name || 'Nexora Enterprise';
  const email = user?.email || 'admin@nexora.io';

  dropdown.innerHTML = `
    <div class="user-dropdown-header">
      <div class="user-dropdown-name">${_esc(user?.name || 'Administrator')}</div>
      <div class="user-dropdown-email">${_esc(email)}</div>
      <div class="user-dropdown-meta">
        <span class="role-badge role-badge--${user?.role || 'admin'}">${_esc(roleName)}</span>
        <span class="user-dropdown-org">${_esc(orgName)}</span>
      </div>
    </div>

    <div class="user-dropdown-permissions">
      <div class="permissions-label">Role Authorization:</div>
      <div class="permissions-list">
        ${(user?.permissions || ['*']).map(p => `<span class="perm-pill">${p}</span>`).join('')}
      </div>
    </div>

    <div class="user-dropdown-divider"></div>

    <button id="dd-logout" class="user-dropdown-logout-btn">
      <span class="btn-icon">${Icons.logOut}</span> Sign Out (Clear Session &amp; Cookie)
    </button>
  `;

  dropdown.querySelector('#dd-logout').addEventListener('click', () => {
    dropdown.remove();
    onLogout();
  });

  document.body.appendChild(dropdown);

  const close = e => {
    if (!dropdown.contains(e.target) && !anchor.contains(e.target)) {
      dropdown.remove();
      document.removeEventListener('click', close, true);
    }
  };
  setTimeout(() => document.addEventListener('click', close, true), 100);
}
