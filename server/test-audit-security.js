// ── Nexora CRM — Security & Application Audit Test Suite ───────
import http from 'http';

const BASE_URL = 'http://localhost:3001';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch {
            parsed = data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            cookies: res.headers['set-cookie'] || [],
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function extractCookie(cookieHeaders, name = 'nexora_token') {
  if (!cookieHeaders) return null;
  const list = Array.isArray(cookieHeaders) ? cookieHeaders : [cookieHeaders];
  for (const c of list) {
    if (c.startsWith(`${name}=`)) {
      return c.split(';')[0];
    }
  }
  return null;
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

async function runAuditTests() {
  console.log('\n================================================================');
  console.log('🛡️ Nexora CRM — Security & Application Audit Test Suite');
  console.log('================================================================\n');

  // ── 1. Authentication & Role Provisioning ────────────────────
  console.log('--- 1. Multi-Role Authentication Setup ---');
  const ownerLogin = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@nexora.io',
    password: 'nexora123',
  });
  const ownerCookie = extractCookie(ownerLogin.cookies);
  assert(ownerLogin.status === 200, 'Owner authenticated');

  const repLogin = await makeRequest('POST', '/api/auth/login', {
    email: 'priya@nexora.io',
    password: 'nexora123',
  });
  const repCookie = extractCookie(repLogin.cookies);
  assert(repLogin.status === 200, 'Sales Rep authenticated');

  // In our seeded store, Jordan Williams (user-004) was initialized as inactive.
  // Activate Jordan as a viewer for security testing:
  await makeRequest('PATCH', '/api/team/user-004/status', { isActive: true }, { Cookie: ownerCookie });
  const viewerLogin = await makeRequest('POST', '/api/auth/login', {
    email: 'jordan@nexora.io',
    password: 'nexora123',
  });
  const viewerCookie = extractCookie(viewerLogin.cookies);
  assert(viewerLogin.status === 200, 'Viewer account (jordan@nexora.io) authenticated');

  // ── 2. Read-Only Viewer Mutation Locks (RBAC Defense) ────────
  console.log('\n--- 2. Read-Only Viewer Mutation Locks (RBAC Defense) ---');
  // Viewer cannot create leads
  const vLead = await makeRequest('POST', '/api/leads', {
    firstName: 'Hacker',
    lastName: 'Attempt',
    email: 'hack@lead.com',
    company: 'Test Co',
  }, { Cookie: viewerCookie });
  assert(vLead.status === 403, 'Viewer blocked from POST /api/leads with 403 Forbidden');

  // Viewer cannot create deals
  const vDeal = await makeRequest('POST', '/api/deals', {
    name: 'Unauthorized Deal',
    amount: 50000,
  }, { Cookie: viewerCookie });
  assert(vDeal.status === 403, 'Viewer blocked from POST /api/deals with 403 Forbidden');

  // Viewer cannot create contacts
  const vContact = await makeRequest('POST', '/api/contacts', {
    firstName: 'Unauthorized',
    lastName: 'Contact',
    email: 'unauth@contact.com',
  }, { Cookie: viewerCookie });
  assert(vContact.status === 403, 'Viewer blocked from POST /api/contacts with 403 Forbidden');

  // Viewer cannot create companies
  const vComp = await makeRequest('POST', '/api/companies', {
    name: 'Unauthorized Company',
  }, { Cookie: viewerCookie });
  assert(vComp.status === 403, 'Viewer blocked from POST /api/companies with 403 Forbidden');

  // Viewer cannot create activities
  const vAct = await makeRequest('POST', '/api/activities', {
    title: 'Unauthorized Task',
    type: 'task',
  }, { Cookie: viewerCookie });
  assert(vAct.status === 403, 'Viewer blocked from POST /api/activities with 403 Forbidden');

  // Viewer cannot complete activities
  const vComplete = await makeRequest('PATCH', '/api/activities/act-001/complete', {}, { Cookie: viewerCookie });
  assert(vComplete.status === 403, 'Viewer blocked from PATCH /api/activities/:id/complete with 403');

  // Viewer cannot delete activities
  const vDelAct = await makeRequest('DELETE', '/api/activities/act-001', null, { Cookie: viewerCookie });
  assert(vDelAct.status === 403, 'Viewer blocked from DELETE /api/activities/:id with 403');

  // Viewer CAN view allowed records (view:own)
  const vGetLeads = await makeRequest('GET', '/api/leads', null, { Cookie: viewerCookie });
  assert(vGetLeads.status === 200, 'Viewer permitted to read /api/leads (200 OK)');

  // ── 3. Dual-Mode Database Query Consistency ──────────────────
  console.log('\n--- 3. Dual-Mode Database Query Consistency ---');
  const leadStats = await makeRequest('GET', '/api/leads/stats', null, { Cookie: ownerCookie });
  assert(leadStats.status === 200 && typeof leadStats.body.stats?.total === 'number', 'GET /api/leads/stats returns valid count');
  assert(leadStats.body.stats.total >= 5, `Total leads verified (${leadStats.body.stats.total})`);

  const contactStats = await makeRequest('GET', '/api/contacts/stats', null, { Cookie: ownerCookie });
  assert(contactStats.status === 200 && typeof contactStats.body.stats?.total === 'number', 'GET /api/contacts/stats returns valid count');
  assert(contactStats.body.stats.total >= 6, `Total contacts verified (${contactStats.body.stats.total})`);

  const compStats = await makeRequest('GET', '/api/companies/stats', null, { Cookie: ownerCookie });
  assert(compStats.status === 200 && typeof compStats.body.stats?.total === 'number', 'GET /api/companies/stats returns valid count');
  assert(compStats.body.stats.total >= 5, `Total companies verified (${compStats.body.stats.total})`);

  // ── 4. Production Static Serving & SPA Routing ───────────────
  console.log('\n--- 4. Production Static Asset Serving & SPA Routing ---');
  const rootRes = await makeRequest('GET', '/');
  assert(rootRes.status === 200, 'GET / serves root application with 200 OK');
  assert(typeof rootRes.body === 'string' && rootRes.body.includes('<!DOCTYPE html>'), 'Root response is index.html');

  const spaRouteRes = await makeRequest('GET', '/calendar');
  assert(spaRouteRes.status === 200, 'GET /calendar (client-side route) falls back to index.html');
  assert(typeof spaRouteRes.body === 'string' && spaRouteRes.body.includes('<!DOCTYPE html>'), 'SPA fallback verified');

  const api404 = await makeRequest('GET', '/api/non-existent-endpoint');
  assert(api404.status === 404, 'Unmapped API path returns 404 Not Found');

  // ── 5. Security Headers & Rate Limiting ───────────────────────
  console.log('\n--- 5. Security Headers & Rate Limiting ---');
  const healthRes = await makeRequest('GET', '/api/health');
  assert(healthRes.status === 200, 'GET /api/health operational');
  assert(healthRes.headers['x-content-type-options'] === 'nosniff', 'Helmet nosniff header enforced');
  assert(Boolean(healthRes.headers['ratelimit-limit'] || healthRes.headers['x-ratelimit-limit']), 'Rate limiting headers enforced');

  // ── 6. XSS Injection Resilience ──────────────────────────────
  console.log('\n--- 6. XSS Injection Resilience ---');
  const xssPayload = '<script>alert("xss")</script>';
  const createXSSLead = await makeRequest('POST', '/api/leads', {
    firstName: 'Security',
    lastName: 'Test',
    email: `sec.${Date.now()}@test.io`,
    company: xssPayload,
  }, { Cookie: ownerCookie });
  assert(createXSSLead.status === 201, 'Lead with special characters stored without database error');
  const leadId = createXSSLead.body.lead?.id;

  const getXSSLead = await makeRequest('GET', `/api/leads/${leadId}`, null, { Cookie: ownerCookie });
  assert(getXSSLead.status === 200, 'Lead safely retrieved');
  assert(getXSSLead.body.lead?.company === xssPayload, 'Payload preserved exactly without execution or corruption');

  // Restore Jordan Williams to inactive status to maintain test parity for test-auth
  await makeRequest('PATCH', '/api/team/user-004/status', { isActive: false }, { Cookie: ownerCookie });

  console.log('\n================================================================');
  console.log(`📊 Audit & Security Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runAuditTests().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
