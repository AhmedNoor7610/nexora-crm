# ⚡ Nexora CRM — Enterprise Customer Relationship Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-314%20passed%20%7C%200%20failed-success.svg)]()
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-blue.svg)]()
[![Express](https://img.shields.io/badge/express-5.3.0-orange.svg)]()
[![Vite](https://img.shields.io/badge/vite-8.3.5-646CFF.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED.svg)](Dockerfile)

**Nexora CRM** is a modern, full-stack, enterprise-grade Customer Relationship Management platform. Engineered for high performance, strict multi-tenant isolation, real-time collaboration, and fluid user interactions, Nexora empowers sales, management, and executive teams to scale their pipeline with confidence.

---

## 📸 Key Capabilities & Features

### 🏢 Multi-Tenant RBAC & Security Isolation
- **Organization-Scoped Storage:** Every entity (`Lead`, `Contact`, `Company`, `Deal`, `Activity`, `Notification`, `User`) is strictly partitioned by `orgId`.
- **4-Tier Granular Permissions:**
  - 👑 **Owner:** Complete workspace oversight, settings, user provisioning, revenue reports.
  - 👔 **Manager:** Team management, stage re-assignments, organizational pipeline insights.
  - 💼 **Sales Representative:** Pipeline execution, owned deal movement, contact management, activity logging.
  - 👁️ **Viewer:** Strictly read-only observer. Guaranteed mutation lockdown (403 Forbidden on write operations).
- **Hardened Authentication:** Dual-mode authentication via HTTP-Only `nexora_token` cookies or Bearer headers with bcrypt password hashing and IP rate limiting.

### 📊 Real-Time Deals Pipeline & Kanban Valuation
- **Interactive Drag-and-Drop:** Intuitive stage progression powered by SortableJS (`Qualification` ➔ `Proposal` ➔ `Negotiation` ➔ `Closing` ➔ `Won` / `Lost`).
- **Dynamic Valuation Calculations:** Stage-weighted revenue forecasting, total pipeline valuation, win rates, and stage transition audit logs.
- **Ownership Verification:** Reps can only advance deals they own; Managers and Owners can manage workspace-wide pipelines.

### 🔄 Safe Lead Conversion Engine
- **One-Click Atomic Conversion:** Safely elevates qualified leads into formal **Contacts** and linked **Companies**.
- **Idempotency Protection:** Double-conversion guard prevents duplicate record creation.
- **Audit Tracking:** Stores conversion timestamps and direct foreign-key references to generated contacts and companies.

### 📅 Calendar & Activity Timeline
- **Interactive Monthly Grid:** Visual representation of scheduled meetings, calls, demos, and follow-ups with color-coded badges and today indicator.
- **Omni-Channel Activity Timeline:** Chronological audit trail linked directly to deals, contacts, or standalone tasks with one-click completion toggles.

### 🔔 Real-Time Notifications (Socket.IO)
- **Room-Based Multi-Tenant Delivery:** Real-time push notifications isolated by `orgId` and targeted to specific assigned users (`task_assigned`, `deal_won`, `stage_change`).
- **Persistent In-App Center:** Unread count badges, slide-out notification drawer, mark-as-read toggles, and multi-tenant broadcast filters.

### 👥 Team Directory, Invitations & Performance
- **Secure Employee Invitations:** Provision team members with defined roles and temporary passwords.
- **Account Lifecycle Management:** Instant account activation and deactivation toggles.
- **Live Leaderboard:** Real-time ranking by deals won and closed revenue.

### 📈 Reports, Analytics & Direct CSV Exports
- **Revenue Analytics:** Monthly revenue trend lines, stage breakdown distributions, and activity completion metrics.
- **Native CSV Data Export:** One-click streaming database exports for Leads, Contacts, Deals, and Activities with compliant RFC 4180 formatting.

### 🔍 Global Productivity Tools
- **Global Search (⌘K / Ctrl+K):** Debounced instant search across leads, contacts, deals, and companies.
- **Quick Add Menu:** Instant creation drawer for leads, contacts, deals, and tasks from any view.
- **Workspace Settings & Diagnostics:** Live latency ping, database health checks, Socket.IO connection monitors, and RBAC permission viewer.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Vite SPA (Vanilla JS + Modern CSS)           │
│  ┌───────────────┬────────────────┬──────────────────────────┐  │
│  │ Global Search │ Quick Add Menu │ Live Notification Drawer │  │
│  ├───────────────┼────────────────┼──────────────────────────┤  │
│  │ Leads/Contacts│ Deals Kanban   │ Calendar & Activities    │  │
│  └───────────────┴────────────────┴──────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS / WebSocket (Socket.IO)
┌───────────────────────────────▼─────────────────────────────────┐
│              Express 5.3 + Socket.IO Unified Server             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Security Middleware (Helmet, CORS, RateLimit, CookieAuth) │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ Multi-Tenant Context & RBAC Guards (requireRole, Mutate)  │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ Real-Time Engine (Socket.IO Room Partitioning by Org/User)│  │
│  └────────────────────────────┬──────────────────────────────┘  │
└───────────────────────────────┼─────────────────────────────────┘
                                │ Dual-Mode Abstraction Layer
┌───────────────────────────────▼─────────────────────────────────┐
│              Persistence & Data Storage Engine                  │
│  ┌──────────────────────────────┬────────────────────────────┐  │
│  │  MongoDB 7.0 via Mongoose    │ High-Performance In-Memory │  │
│  │  (Production Container)      │ Dual-Store Fallback        │  │
│  └──────────────────────────────┴────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES Modules), Vite 8, Modern CSS (Design Tokens, Container Queries), SortableJS, SVG Icons |
| **Backend** | Node.js (v20 LTS), Express 5.3, Socket.IO 4.8, Express-Validator, Express-Rate-Limit, Helmet, Cookie-Parser |
| **Security** | JSON Web Tokens (JWT), HTTP-Only Strict Cookies, Bcrypt.js, Helmet Security Headers, XSS HTML Sanitization |
| **Data Layer** | Mongoose 9 / MongoDB 7, with automatic in-memory persistence fallback (`crmStore`) |
| **Testing** | Native Node.js Test Suite (Zero external test runner bloat, 6 suites, 314 automated assertions) |
| **DevOps** | Multi-stage Dockerfile (Node 20 Alpine), Docker Compose with MongoDB healthchecks |

---

## 🚀 Quick Start Guide

### Option 1: Local Development

#### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/your-org/nexora-crm.git
cd nexora-crm
npm install
```

#### 2. Configure Environment
```bash
cp .env.example .env
```

#### 3. Run Development Servers
In separate terminals:

```bash
# Terminal 1: Backend API & WebSocket Server
npm run server
# Listening on http://localhost:3001

# Terminal 2: Vite Frontend Dev Server
npm run dev
# Available at http://localhost:5173
```

---

### Option 2: Production Deployment with Docker Compose

Run the entire full-stack application alongside MongoDB in isolated containers with a single command:

```bash
docker compose up -d --build
```

The application will be live at `http://localhost:3001` with automated database healthchecks and persistent storage.

To view container logs:
```bash
docker compose logs -f app
```

To stop containers:
```bash
docker compose down
```

---

## 🔑 Demo Credentials

The platform is pre-seeded with sample multi-tenant data for testing all role capabilities:

| Role | Email | Password | Scope & Privileges |
| :--- | :--- | :--- | :--- |
| 👑 **Owner** | `admin@nexora.io` | `nexora123` | Full administrative control, team invites, exports, revenue reports |
| 👔 **Manager** | `marcus@nexora.io` | `nexora123` | Sales leadership, lead assignment, team pipeline monitoring |
| 💼 **Sales Rep** | `priya@nexora.io` | `nexora123` | Territory execution, owned deals, contact management, activity logging |
| 👁️ **Viewer** | `jordan@nexora.io` | `nexora123` | Read-only compliance observer. Mutate operations return 403 Forbidden |

*(You can also use the One-Click Quick-Fill buttons on the `/login` screen to instantly populate these credentials).*

---

## 🧪 Comprehensive Automated Test Suites

Nexora CRM includes 6 comprehensive test suites containing **314 automated assertions** validating API integrity, multi-tenant boundaries, RBAC lockouts, and real-time delivery.

### Run All Test Suites
```bash
npm test
# Or: npm run test:all
```

### Individual Test Suites
```bash
# 1. Audit, Security, XSS & Viewer Lockdown (28 tests)
npm run test:audit

# 2. Authentication, JWT, HTTP-Only Cookies & RBAC (37 tests)
npm run test:auth

# 3. Leads, Contacts, Companies & Safe Conversion (49 tests)
npm run test:crm

# 4. Deals Pipeline, Kanban DnD & Valuation (62 tests)
npm run test:deals

# 5. Activities, Tasks, Timeline & Socket.IO (47 tests)
npm run test:activities

# 6. Team Management, Analytics, Reports & CSV Exports (91 tests)
npm run test:team
```

---

## 📡 REST API Reference

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new user and workspace organization.
- `POST /api/auth/login` — Authenticate and receive HTTP-Only cookie & JWT token.
- `POST /api/auth/logout` — Invalidate session and clear authentication cookie.
- `GET /api/auth/me` — Retrieve current authenticated user profile and organization.
- `GET /api/auth/users` — List organization users (*Owner/Manager only*).
- `POST /api/auth/users` — Provision new user (*Owner only*).

### 🎯 Leads & Conversion (`/api/leads`)
- `GET /api/leads` — Query leads with search, status filtering, and pagination.
- `POST /api/leads` — Create lead record.
- `GET /api/leads/:id` — Get lead details and activity history.
- `PUT /api/leads/:id` — Update lead status and details.
- `POST /api/leads/:id/convert` — Safely convert lead into Contact and Company.
- `GET /api/leads/stats` — Aggregate lead metrics by status.

### 💼 Deals & Pipeline (`/api/deals`)
- `GET /api/deals` — Query deals scoped to organization or assigned rep.
- `POST /api/deals` — Create deal with automated stage probability assignment.
- `GET /api/deals/pipeline` — Retrieve Kanban stage columns and calculated metrics.
- `PATCH /api/deals/:id/stage` — Advance deal stage via drag-and-drop with transition audit.

### 👥 Contacts & Companies (`/api/contacts`, `/api/companies`)
- `GET /api/contacts` & `POST /api/contacts` — Contact management with lifecycle stages.
- `GET /api/companies` & `POST /api/companies` — Company accounts with linked contacts.

### 📋 Activities & Tasks (`/api/activities`)
- `GET /api/activities` — Query activities with type, status, and priority filters.
- `POST /api/activities` — Log meeting, call, task, or demo.
- `PATCH /api/activities/:id/complete` — Toggle task completion status.
- `GET /api/activities/timeline` — Retrieve unified chronological event stream.

### 🔔 Notifications (`/api/notifications`)
- `GET /api/notifications` — Retrieve user and org broadcast notifications.
- `PATCH /api/notifications/:id/read` — Mark notification as read.
- `PATCH /api/notifications/read-all` — Mark all unread notifications as read.

### 👥 Team Management & Reports (`/api/team`)
- `GET /api/team` — RBAC-filtered team roster with deal performance metrics.
- `POST /api/team/invite` — Invite new team member (*Owner/Manager only*).
- `PATCH /api/team/:id/role` — Update member role (*Owner only*).
- `PATCH /api/team/:id/status` — Activate/deactivate member account (*Owner only*).
- `GET /api/team/reports/revenue` — Monthly revenue breakdown and period comparisons.
- `GET /api/team/reports/pipeline` — Stage distribution and total pipeline value.
- `GET /api/team/export/:entity` — RFC 4180 CSV export for `leads`, `contacts`, `deals`, or `activities`.

---

## 🔒 Security Hardening

- **XSS Defense:** Client uses centralized HTML sanitization (`_esc()`) for all user-provided strings before DOM injection.
- **Path-To-RegExp Compliance:** Native Express 5 catch-all SPA fallback prevents route parsing errors.
- **Strict Headers:** Configured with `helmet` for `nosniff`, `X-Frame-Options`, and cross-origin resource isolation.
- **Tenant Isolation:** Enforced at both the middleware layer (`crmGuards.js`) and database query layer.
- **Viewer Role Mutation Lock:** Any attempt by read-only users to invoke POST, PUT, PATCH, or DELETE triggers a 403 Forbidden response.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).

