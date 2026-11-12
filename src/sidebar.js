// ── Nexora CRM — Sidebar Component ─────────────────────────
import { Icons } from './icons.js';
import { showUserDropdown } from './topbar.js';

function buildNav(user) {
  const role = user?.role || 'viewer';
  const isElevated = ['owner', 'admin', 'manager'].includes(role);
  return [
    {
      section: 'Main',
      items: [
        { id: 'dashboard', label: 'Dashboard',  icon: 'dashboard', badge: null },
        { id: 'leads',     label: 'Leads',      icon: 'leads',     badge: 'Hot' },
        { id: 'contacts',  label: 'Contacts',   icon: 'contacts',  badge: '1.2k' },
        { id: 'deals',     label: 'Deals',      icon: 'deals',     badge: null },
        { id: 'companies', label: 'Companies',  icon: 'companies', badge: null },
      ],
    },
    {
      section: 'Productivity',
      items: [
        { id: 'tasks',    label: 'Tasks',    icon: 'tasks',    badge: '7' },
        { id: 'calendar', label: 'Calendar', icon: 'calendar', badge: null },
        { id: 'pipeline', label: 'Pipeline', icon: 'pipeline', badge: null },
        { id: 'emails',   label: 'Emails',   icon: 'mail',     badge: null },
      ],
    },
    {
      section: 'Insights',
      items: [
        { id: 'reports', label: 'Reports', icon: 'reports', badge: null },
        ...(isElevated ? [{ id: 'audit', label: 'Audit Log', icon: 'shield', badge: null }] : []),
      ],
    },
    {
      section: 'System',
      items: [
        { id: 'team',     label: 'Team',     icon: 'users',    badge: null },
        { id: 'settings', label: 'Settings', icon: 'settings', badge: null },
        { id: 'help',     label: 'Help',     icon: 'help',     badge: null },
      ],
    },
  ];
}

const LOGO_SVG = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M6 6L6 26L10 26L10 17L22 26L26 26L26 6L22 6L22 15L10 6Z" fill="white"/>
</svg>`;

export function createSidebar(currentPage, user, onNavigate, onLogout) {
  const el = document.createElement('aside');
  el.className = 'sidebar';
  el.id = 'sidebar';

  const orgName = user?.organization?.name || 'Nexora Workspace';
  const roleDisplay = user?.roleTitle || (user?.role ? user.role.toUpperCase() : 'Administrator');
  const initials = user?.avatar || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'NX');
  const NAV = buildNav(user);

  el.innerHTML = `
    <div class="sidebar__brand">
      <div class="sidebar__logo">${LOGO_SVG}</div>
      <div class="sidebar__brand-text">
        <div class="sidebar__brand-name">Nexora</div>
        <div class="sidebar__brand-sub" title="${orgName}">${orgName}</div>
      </div>
    </div>

    <nav class="sidebar__nav" aria-label="Main navigation">
      ${NAV.map(section => `
        <div class="nav-section-label">${section.section}</div>
        ${section.items.map(item => `
          <a
            href="#${item.id}"
            class="nav-item${currentPage === item.id ? ' active' : ''}"
            data-page="${item.id}"
            id="nav-${item.id}"
            aria-current="${currentPage === item.id ? 'page' : 'false'}"
          >
            <span class="nav-item__icon">${Icons[item.icon] || ''}</span>
            <span class="nav-item__label">${item.label}</span>
            ${item.badge ? `<span class="nav-item__badge">${item.badge}</span>` : ''}
          </a>
        `).join('')}
      `).join('')}
    </nav>

    <div class="sidebar__footer">
      <div class="sidebar__user" id="sidebar-user-btn" role="button" tabindex="0" aria-label="User profile">
        <div class="user-avatar">${initials}</div>
        <div class="sidebar__user-info">
          <div class="sidebar__user-name">${user?.name || 'Authorized User'}</div>
          <div class="sidebar__user-role">${roleDisplay}</div>
        </div>
      </div>
    </div>
  `;

  // Navigation click events
  el.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      onNavigate(page);
    });
  });

  // User profile click event
  const userBtn = el.querySelector('#sidebar-user-btn');
  if (userBtn && onLogout) {
    userBtn.addEventListener('click', () => {
      showUserDropdown(userBtn, user, onLogout);
    });
  }

  return el;
}

export function updateActiveNav(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    const isActive = el.dataset.page === page;
    el.classList.toggle('active', isActive);
    el.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}
