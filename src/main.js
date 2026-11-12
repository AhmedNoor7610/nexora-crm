// ── Nexora CRM — Main Application Entry ─────────────────────
import './style.css';
import { api } from './api.js';
import { showToast } from './toast.js';
import { createSidebar, updateActiveNav } from './sidebar.js';
import { createTopbar } from './topbar.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderLeads } from './pages/leads.js';
import { renderContacts } from './pages/contacts.js';
import { renderCompanies } from './pages/companies.js';
import { renderDeals } from './pages/deals.js';
import { renderTasks } from './pages/tasks.js';
import { renderTeam } from './pages/team.js';
import { renderReports } from './pages/reports.js';
import { renderCalendar } from './pages/calendar.js';
import { renderSettings } from './pages/settings.js';
import { renderHelp } from './pages/help.js';
import { renderEmails } from './pages/emails.js';
import { renderAuditLog } from './pages/audit.js';
import { connectSocket, disconnectSocket } from './socket-client.js';
import { initNotificationsWidget, destroyNotificationsWidget } from './notifications-widget.js';

// ── App State ────────────────────────────────────────────────
const state = {
  user: null,
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  sidebarOpen: false, // mobile
};

// ── App Root ─────────────────────────────────────────────────
const app = document.getElementById('app');

// ── Router ───────────────────────────────────────────────────
const PAGES = {
  dashboard: (c, u) => renderDashboard(c, u),
  leads:     (c, u) => renderLeads(c, u),
  contacts:  (c, u) => renderContacts(c, u),
  companies: (c, u) => renderCompanies(c, u),
  deals:     (c, u) => renderDeals(c, u),
  pipeline:  (c, u) => renderDeals(c, u),
  tasks:     (c, u) => renderTasks(c, u),
  team:      (c, u) => renderTeam(c, u),
  calendar:  (c, u) => renderCalendar(c, u),
  reports:   (c, u) => renderReports(c, u),
  settings:  (c, u) => renderSettings(c, u),
  help:      (c, u) => renderHelp(c, u),
  emails:    (c, u) => renderEmails(c, u),
  audit:     (c, u) => renderAuditLog(c, u),
};

function navigate(pageId) {
  if (!PAGES[pageId]) pageId = 'dashboard';
  state.currentPage = pageId;
  updateActiveNav(pageId);

  // Close mobile sidebar on navigate
  if (state.sidebarOpen) closeMobileSidebar();

  const content = document.getElementById('main-content');
  if (!content) return;

  content.scrollTop = 0;
  const render = PAGES[pageId];
  if (render) render(content, state.user);
}

function handleHashChange() {
  const hash = location.hash.replace('#', '') || 'dashboard';
  navigate(hash);
}

// ── Shell Builder ────────────────────────────────────────────
function buildShell(user) {
  state.user = user;
  app.innerHTML = '';

  // Backdrop for mobile
  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.id = 'sidebar-backdrop';
  backdrop.addEventListener('click', closeMobileSidebar);

  const shell = document.createElement('div');
  shell.className = 'app-shell';
  shell.id = 'app-shell';

  // Sidebar
  const sidebar = createSidebar(
    state.currentPage,
    user,
    (page) => { location.hash = page; },
    onLogout
  );

  // Topbar
  const topbar = createTopbar(
    user,
    onToggleSidebar,
    onLogout
  );

  // Main content area
  const main = document.createElement('main');
  main.className = 'main-content';
  main.id = 'main-content';
  main.setAttribute('role', 'main');

  shell.appendChild(sidebar);
  shell.appendChild(topbar);
  shell.appendChild(main);

  app.appendChild(backdrop);
  app.appendChild(shell);

  // Add ambient orbs
  const orb1 = document.createElement('div');
  orb1.className = 'bg-orb bg-orb-1';
  const orb2 = document.createElement('div');
  orb2.className = 'bg-orb bg-orb-2';
  app.prepend(orb1, orb2);

  // ── Initialize Socket.IO Real-Time Connection ─────────────
  connectSocket(user);

  // ── Initialize Notifications Widget in Topbar ─────────────
  initNotificationsWidget(topbar, user);

  // Start routing
  window.addEventListener('hashchange', handleHashChange);
  handleHashChange();
}

// ── Sidebar Toggle ───────────────────────────────────────────
function onToggleSidebar() {
  const shell = document.getElementById('app-shell');
  if (!shell) return;

  const isMobile = window.innerWidth <= 900;
  if (isMobile) {
    state.sidebarOpen = !state.sidebarOpen;
    shell.classList.toggle('sidebar-open', state.sidebarOpen);
  } else {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    shell.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
  }
}

function closeMobileSidebar() {
  const shell = document.getElementById('app-shell');
  if (!shell) return;
  state.sidebarOpen = false;
  shell.classList.remove('sidebar-open');
}

// ── Auth / Boot ──────────────────────────────────────────────
async function onLogout() {
  try {
    await api.auth.logout();
  } catch (e) {
    console.error('Logout error:', e);
  }
  // Cleanup Socket.IO + Notifications
  destroyNotificationsWidget();
  disconnectSocket();

  state.user = null;
  showToast('info', 'Signed Out', 'Session terminated & cookies cleared.');
  window.removeEventListener('hashchange', handleHashChange);
  location.hash = '';
  bootApp();
}

async function bootApp() {
  // Check if active session exists (via HTTP-Only cookie or stored token)
  try {
    const user = await api.auth.me();
    if (user && user.id) {
      state.user = user;
      buildShell(user);
      return;
    }
  } catch {
    // Not authenticated
  }

  // Render Auth & Registration screen
  app.innerHTML = '';
  renderLogin(app, (user) => {
    state.user = user;
    buildShell(user);
  });
}

// ── Responsive: listen for resize ───────────────────────────
window.addEventListener('resize', () => {
  if (window.innerWidth > 900) {
    closeMobileSidebar();
  }
});

// ── Init ─────────────────────────────────────────────────────
bootApp();
