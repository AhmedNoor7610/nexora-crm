// ── Nexora CRM — Coming Soon Page (placeholder for future modules) ──
import { Icons } from '../icons.js';

const PAGE_META = {
  contacts:  { title: 'Contacts',  icon: 'contacts',  desc: 'Manage your customer relationships and contact database.' },
  deals:     { title: 'Deals',     icon: 'deals',     desc: 'Track opportunities through your sales pipeline.' },
  companies: { title: 'Companies', icon: 'companies', desc: 'View and manage your business accounts and organizations.' },
  tasks:     { title: 'Tasks',     icon: 'tasks',     desc: 'Track your team\'s action items and to-dos.' },
  calendar:  { title: 'Calendar',  icon: 'calendar',  desc: 'View scheduled meetings, calls, and deadlines.' },
  pipeline:  { title: 'Pipeline',  icon: 'pipeline',  desc: 'Visualize and manage your full sales pipeline.' },
  reports:   { title: 'Reports',   icon: 'reports',   desc: 'Analyze performance with advanced analytics.' },
  settings:  { title: 'Settings',  icon: 'settings',  desc: 'Configure your workspace and preferences.' },
  help:      { title: 'Help',      icon: 'help',      desc: 'Documentation, guides, and support.' },
};

export function renderPlaceholder(container, pageId) {
  const meta = PAGE_META[pageId] || { title: pageId, icon: 'dashboard', desc: 'This module is coming soon.' };

  container.innerHTML = `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header__eyebrow">${meta.title}</div>
        <h1 class="page-header__title">${meta.title}</h1>
        <p class="page-header__subtitle">${meta.desc}</p>
      </div>

      <div style="display:flex;align-items:center;justify-content:center;min-height:400px;">
        <div style="text-align:center;max-width:400px;">
          <div style="width:80px;height:80px;border-radius:var(--radius-2xl);background:linear-gradient(135deg,rgba(124,58,237,0.2),rgba(37,99,235,0.15));border:1px solid rgba(124,58,237,0.25);display:flex;align-items:center;justify-content:center;margin:0 auto 2rem;color:var(--color-purple-400);">
            <span style="width:36px;height:36px;display:flex;align-items:center;">${Icons[meta.icon] || Icons.dashboard}</span>
          </div>
          <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:0.75rem;font-family:var(--font-display)">
            Coming in the Next Phase
          </h2>
          <p style="color:var(--text-muted);line-height:1.7;margin-bottom:2rem;">
            The <strong style="color:var(--text-secondary)">${meta.title}</strong> module is part of our upcoming advanced business modules release. The foundation is set — stay tuned!
          </p>
          <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
            <a href="#dashboard" class="btn btn--primary" id="back-to-dash">
              ${Icons.dashboard}
              Back to Dashboard
            </a>
            <button class="btn btn--secondary" onclick="this.textContent='✓ Noted!'">
              Notify Me
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
