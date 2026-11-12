# Contributing to Nexora CRM

Thank you for your interest in contributing to Nexora CRM! Nexora is a full-stack, enterprise-grade Customer Relationship Management platform built with Node.js, Express, Socket.IO, MongoDB/In-Memory dual store, and high-performance Vanilla JavaScript + Vite.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: v18.0.0+ (v20+ recommended)
- **npm**: v9.0.0+
- **Docker & Docker Compose** (optional, for containerized MongoDB)

### 1. Clone & Install
```bash
git clone https://github.com/your-org/nexora-crm.git
cd nexora-crm
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Servers
In separate terminals:

**Backend Server (Express & Socket.IO):**
```bash
npm run server
# Runs on http://localhost:3001
```

**Frontend Dev Server (Vite HMR):**
```bash
npm run dev
# Runs on http://localhost:5173
```

---

## 🧪 Automated Testing & Quality Gates

All contributions must pass the complete automated test suite before merging.

### Running All Test Suites
```bash
npm test
# Executes all 6 suites (314+ automated tests)
```

### Individual Test Suites
```bash
npm run test:audit         # Security headers, XSS resilience, RBAC lockouts
npm run test:auth          # JWT auth, HttpOnly cookies, session management
npm run test:crm           # Leads, Contacts, Companies CRUD & safe conversion
npm run test:deals         # Kanban pipeline, Drag-and-Drop, stage transitions
npm run test:activities    # Tasks, activities, timelines, Socket.IO notifications
npm run test:team          # Team management, role permissions, reports, CSV exports
```

---

## 🛡️ Architecture & Security Standards

### 1. Multi-Tenant Isolation
- **Strict Tenant Boundary:** Every database record (`Lead`, `Contact`, `Company`, `Deal`, `Activity`, `Notification`, `User`) MUST include an `orgId`.
- **Query Scoping:** Never execute a query without scoping by `req.user.orgId`.
- **User Ownership:** Sales Representatives (`rep` role) can only access records they own or are assigned to (`assignedTo === req.user.id`).

### 2. Role-Based Access Control (RBAC)
Nexora enforces four discrete hierarchical roles:
1. `owner`: Full administrative control, workspace settings, team member provisioning.
2. `manager`: Team oversight, lead assignment, reporting and pipeline analytics.
3. `rep`: Pipeline execution, creating and advancing owned deals, logging activities.
4. `viewer`: Strictly read-only access. Blocked from POST, PUT, PATCH, DELETE endpoints.

### 3. Dual-Mode Store Parity
The backend supports running with a live MongoDB instance or in-memory fallback store (`crmStore`). Any updates to entity models in `server/models/` must have matching query capabilities in `server/db/crmStore.js`.

### 4. Input Sanitization & XSS Defense
- Dynamic user content rendered into the DOM must be escaped using `_esc()` from `src/utils.js`.
- Never inject untrusted strings directly into `innerHTML` without sanitization.

### 5. Modern Web Guidelines & Accessibility
- Table elements must be enclosed in accessible scroll containers:
  `<div class="table-scroll-wrapper" tabindex="0" role="region" aria-label="...">`
- Maintain high contrast ratios, responsive media queries, and keyboard accessibility.

---

## 🚀 Pull Request Checklist

Before submitting a Pull Request:
- [ ] Code compiles without warnings (`npm run build`).
- [ ] All 6 test suites pass (`npm test`).
- [ ] No hardcoded credentials or API keys.
- [ ] Documentation updated if adding or modifying API endpoints.
- [ ] Conventional commit messages (e.g., `feat: ...`, `fix: ...`, `docs: ...`).

