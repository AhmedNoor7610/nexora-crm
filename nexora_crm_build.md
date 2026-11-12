# Nexora CRM — Foundation Build Complete

## Live URLs

| Service | URL |
|---------|-----|
| 🌐 Frontend (Vite) | **http://localhost:5173** |
| ⚙️ Backend (Express) | **http://localhost:3001** |
| 🔍 API Health | http://localhost:3001/api/health |

## Demo Credentials
| Field | Value |
|-------|-------|
| Email | `admin@nexora.io` |
| Password | `nexora123` |

---

## Architecture

```
nexora-crm/
├── index.html                  # App entry HTML (Google Fonts, meta tags)
├── vite.config.js              # Vite + /api proxy to Express
├── package.json
│
├── src/                        # Frontend (Vite vanilla JS)
│   ├── main.js                 # App boot, hash router, auth flow, shell builder
│   ├── style.css               # 4-tier design system (1300+ lines)
│   ├── api.js                  # API client (JWT token management)
│   ├── icons.js                # 30+ Lucide-style SVG icons
│   ├── sidebar.js              # Collapsible sidebar component
│   ├── topbar.js               # Top navigation + user dropdown
│   ├── toast.js                # Animated toast notifications
│   └── pages/
│       ├── login.js            # Login page (hero + form)
│       ├── dashboard.js        # Dashboard (charts, stats, pipeline, tasks)
│       └── placeholder.js      # Coming-soon for future modules
│
└── server/                     # Backend (Express.js)
    ├── index.js                # Server entry + middleware
    ├── middleware/auth.js       # JWT sign/verify middleware
    ├── routes/
    │   ├── auth.js             # POST /login, GET /me, POST /logout
    │   └── dashboard.js        # GET /stats, /revenue, /activity, /pipeline, /tasks, /team
    └── data/demo.js            # Realistic CRM demo data
```

---

## Design System Highlights

**Premium Dark Theme** with 4-tier CSS custom property architecture:
- **Tier 1** — Literal tokens: `--color-purple-600`, `--space-4`, `--radius-xl`
- **Tier 2** — Semantic tokens: `--bg-surface`, `--text-primary`, `--accent-primary`
- **Tier 3** — UI tokens: `--border-subtle`, `--shadow-glow`, `--sidebar-width`
- **Tier 4** — Component tokens per element

**Visual Effects:**
- Glassmorphism cards with backdrop blur
- Gradient text & buttons (purple → blue)
- Ambient glow orbs in background
- Sparkline charts per KPI card
- Animated shimmer skeleton loaders
- Slide-in toast notifications
- Hover micro-animations

---

## Features Implemented

### ✅ Authentication
- JWT-based login (bcrypt password hashing)
- Session persistence (sessionStorage / localStorage)
- Protected API routes
- Auto-login on refresh via stored token
- User dropdown with Sign Out

### ✅ App Shell
- Collapsible sidebar (desktop: icon-only mode)
- Responsive sidebar (mobile: drawer with backdrop)
- Sticky topbar with global search (`Ctrl+K` shortcut)
- Hash-based router (no page reloads)
- Page transition animations

### ✅ Dashboard
- **4 KPI stat cards** (Revenue, Contacts, Deals, Win Rate) with trend indicators + sparklines
- **Revenue bar chart** (SVG, responsive, tabbed 6M/1Y/YTD)
- **Sales pipeline** funnel with gradient bars
- **Recent activity** feed (8 items, typed with icons)
- **Top performers** leaderboard
- **Upcoming tasks** with priority badges and interactive checkboxes

### ✅ Navigation (Placeholder pages for future modules)
- Contacts, Deals, Companies, Tasks, Calendar, Pipeline, Reports, Settings, Help

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login → JWT token |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/dashboard/stats` | ✅ | KPI stat cards |
| GET | `/api/dashboard/revenue` | ✅ | Revenue chart data |
| GET | `/api/dashboard/activity` | ✅ | Activity feed |
| GET | `/api/dashboard/pipeline` | ✅ | Pipeline stages |
| GET | `/api/dashboard/tasks` | ✅ | Upcoming tasks |
| GET | `/api/dashboard/team` | ✅ | Team leaderboard |

---

## Next Steps (Advanced Modules)
- 📋 Contacts module (table, search, filters, CRUD)
- 💼 Deals & Pipeline (Kanban board)
- 🏢 Companies module
- 📅 Calendar (event management)
- 📊 Reports & Analytics (advanced charts)
- ⚙️ Settings (workspace config)
- 🗄️ Database integration (SQLite / PostgreSQL)
