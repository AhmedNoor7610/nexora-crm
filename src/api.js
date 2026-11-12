// ── Nexora CRM — API Client ────────────────────────────────
// Handles secure communication with Express backend via HTTP-Only Cookies & JWT

const BASE = '/api';

function getToken() {
  return sessionStorage.getItem('nexora_token') || localStorage.getItem('nexora_token');
}

function setToken(token, remember = false) {
  if (token) {
    if (remember) {
      localStorage.setItem('nexora_token', token);
    } else {
      sessionStorage.setItem('nexora_token', token);
    }
  }
}

function clearToken() {
  sessionStorage.removeItem('nexora_token');
  localStorage.removeItem('nexora_token');
}

async function request(method, path, body, requiresAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  
  if (requiresAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include', // Automatically sends HTTP-Only cookies with request
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Network request failed' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      q.append(k, v);
    }
  }
  const str = q.toString();
  return str ? `?${str}` : '';
}

export const api = {
  // Auth & RBAC
  auth: {
    login: async (email, password, remember = false) => {
      const data = await request('POST', '/auth/login', { email, password, remember }, false);
      if (data.token) setToken(data.token, remember);
      return data;
    },

    register: async (payload) => {
      const data = await request('POST', '/auth/register', payload, false);
      if (data.token) setToken(data.token, true);
      return data;
    },

    logout: async () => {
      try {
        await request('POST', '/auth/logout', null, false);
      } catch {
        // Continue even if network error
      } finally {
        clearToken();
      }
    },

    me: async () => {
      const data = await request('GET', '/auth/me');
      return data.user || data;
    },

    roles: async () => {
      const data = await request('GET', '/auth/roles', null, false);
      return data.roles;
    },

    getUsers: async () => {
      const data = await request('GET', '/auth/users');
      return data.users;
    },

    createUser: async (payload) => {
      return request('POST', '/auth/users', payload);
    },

    getOrganization: async () => {
      const data = await request('GET', '/auth/organization');
      return data.organization;
    },

    forgotPassword: async (email) => {
      return request('POST', '/auth/forgot-password', { email }, false);
    },

    resetPassword: async (token, newPassword) => {
      return request('POST', '/auth/reset-password', { token, newPassword }, false);
    },

    sendVerification: async () => {
      return request('POST', '/auth/send-verification');
    },

    verifyEmail: async (token) => {
      return request('POST', '/auth/verify-email', { token }, false);
    },

    getInvitation: async (token) => {
      return request('GET', `/auth/invitation/${token}`, null, false);
    },

    acceptInvitation: async (payload) => {
      const data = await request('POST', '/auth/accept-invitation', payload, false);
      if (data.token) setToken(data.token, true);
      return data;
    },

    isLoggedIn: () => Boolean(getToken()),
  },

  // Leads Module
  leads: {
    stats:   () => request('GET', '/leads/stats'),
    list:    (params) => request('GET', `/leads${buildQuery(params)}`),
    get:     (id) => request('GET', `/leads/${id}`),
    create:  (data) => request('POST', '/leads', data),
    update:  (id, data) => request('PUT', `/leads/${id}`, data),
    delete:  (id) => request('DELETE', `/leads/${id}`),
    convert: (id, data) => request('POST', `/leads/${id}/convert`, data),
  },

  // Contacts Module
  contacts: {
    stats:  () => request('GET', '/contacts/stats'),
    list:   (params) => request('GET', `/contacts${buildQuery(params)}`),
    get:    (id) => request('GET', `/contacts/${id}`),
    create: (data) => request('POST', '/contacts', data),
    update: (id, data) => request('PUT', `/contacts/${id}`, data),
    delete: (id) => request('DELETE', `/contacts/${id}`),
  },

  // Companies Module
  companies: {
    stats:  () => request('GET', '/companies/stats'),
    list:   (params) => request('GET', `/companies${buildQuery(params)}`),
    get:    (id) => request('GET', `/companies/${id}`),
    create: (data) => request('POST', '/companies', data),
    update: (id, data) => request('PUT', `/companies/${id}`, data),
    delete: (id) => request('DELETE', `/companies/${id}`),
  },

  // Deals & Pipeline Module
  deals: {
    pipeline:    (params) => request('GET', `/deals/pipeline${buildQuery(params)}`),
    list:        (params) => request('GET', `/deals${buildQuery(params)}`),
    get:         (id) => request('GET', `/deals/${id}`),
    create:      (data) => request('POST', '/deals', data),
    update:      (id, data) => request('PUT', `/deals/${id}`, data),
    changeStage: (id, stage, note = '', lostReason = '') => request('PATCH', `/deals/${id}/stage`, { stage, note, lostReason }),
    delete:      (id) => request('DELETE', `/deals/${id}`),
  },

  // Dashboard
  dashboard: {
    stats:    () => request('GET', '/dashboard/stats'),
    revenue:  () => request('GET', '/dashboard/revenue'),
    activity: () => request('GET', '/dashboard/activity'),
    pipeline: () => request('GET', '/dashboard/pipeline'),
    tasks:    () => request('GET', '/dashboard/tasks'),
    team:     () => request('GET', '/dashboard/team'),
  },

  // ── Activities & Tasks ──────────────────────────────────────
  activities: {
    list:     (params) => request('GET', `/activities${buildQuery(params)}`),
    get:      (id) => request('GET', `/activities/${id}`),
    create:   (data) => request('POST', '/activities', data),
    update:   (id, data) => request('PUT', `/activities/${id}`, data),
    complete: (id, outcome = '') => request('PATCH', `/activities/${id}/complete`, { outcome }),
    delete:   (id) => request('DELETE', `/activities/${id}`),
    timeline: (params) => request('GET', `/activities/timeline${buildQuery(params)}`),
  },

  // ── Notifications ───────────────────────────────────────────
  notifications: {
    list:    (params) => request('GET', `/notifications${buildQuery(params)}`),
    count:   () => request('GET', '/notifications/count'),
    markRead:    (id) => request('PATCH', `/notifications/${id}/read`, {}),
    markAllRead: () => request('PATCH', '/notifications/read-all', {}),
    delete:  (id) => request('DELETE', `/notifications/${id}`),
  },

  // ── Team Management ──────────────────────────────────────────
  team: {
    list:         ()             => request('GET',   '/team'),
    performance:  ()             => request('GET',   '/team/performance'),
    invite:       (data)         => request('POST',  '/team/invite', data),
    updateRole:   (id, role)     => request('PATCH', `/team/${id}/role`, { role }),
    updateStatus: (id, isActive) => request('PATCH', `/team/${id}/status`, { isActive }),
  },

  // ── Reports & Analytics ──────────────────────────────────────
  reports: {
    revenue:          (params) => request('GET', `/reports/revenue${buildQuery(params)}`),
    pipelineSummary:  ()       => request('GET', '/reports/pipeline-summary'),
    teamPerformance:  ()       => request('GET', '/reports/team-performance'),
    activitySummary:  (params) => request('GET', `/reports/activity-summary${buildQuery(params)}`),
    salesTargets:     (params) => request('GET', `/reports/sales-targets${buildQuery(params)}`),
    yoyComparison:    ()       => request('GET', '/reports/yoy-comparison'),
    leadSources:      ()       => request('GET', '/reports/lead-sources'),
    lostDeals:        ()       => request('GET', '/reports/lost-deals'),
    repActivities:    ()       => request('GET', '/reports/rep-activities'),
    exportLeads:      ()       => '/api/reports/export/leads',
    exportContacts:   ()       => '/api/reports/export/contacts',
    exportDeals:      ()       => '/api/reports/export/deals',
    exportActivities: ()       => '/api/reports/export/activities',
    exportPdf:        ()       => '/api/reports/export/pdf',
  },

  // ── Audit Logs ───────────────────────────────────────────────
  auditLogs: {
    list: (params) => request('GET', `/audit-logs${buildQuery(params)}`),
  },

  // ── Emails ───────────────────────────────────────────────────
  emails: {
    templates: ()       => request('GET', '/emails/templates'),
    list:      (params) => request('GET', `/emails${buildQuery(params)}`),
    get:       (id)     => request('GET', `/emails/${id}`),
    send:      (data)   => request('POST', '/emails/send', data),
  },

  // ── Attachments ──────────────────────────────────────────────
  attachments: {
    list:        (params) => request('GET', `/attachments${buildQuery(params)}`),
    upload:      (data)   => request('POST', '/attachments/upload', data),
    delete:      (id)     => request('DELETE', `/attachments/${id}`),
    downloadUrl: (id)     => `${BASE}/attachments/${id}/download`,
  },
};
