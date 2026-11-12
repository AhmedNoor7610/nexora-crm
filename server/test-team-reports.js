// ── Nexora CRM — Team Management, Reports & Analytics Test Suite ──
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

async function runTests() {
  console.log('\n================================================================');
  console.log('🧪 Nexora CRM — Team Management, Reports & Analytics Test Suite');
  console.log('================================================================\n');

  // ── 1. AUTHENTICATION & LOGIN ────────────────────────────────
  console.log('--- 1. Multi-Role Authentication Setup ---');
  const ownerLogin = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@nexora.io',
    password: 'nexora123',
  });
  const ownerCookie = extractCookie(ownerLogin.cookies);
  assert(ownerLogin.status === 200, 'Owner login successful (admin@nexora.io)');
  assert(Boolean(ownerCookie), 'Owner session cookie obtained');

  const mgrLogin = await makeRequest('POST', '/api/auth/login', {
    email: 'marcus@nexora.io',
    password: 'nexora123',
  });
  const mgrCookie = extractCookie(mgrLogin.cookies);
  assert(mgrLogin.status === 200, 'Manager login successful (marcus@nexora.io)');

  const repLogin = await makeRequest('POST', '/api/auth/login', {
    email: 'priya@nexora.io',
    password: 'nexora123',
  });
  const repCookie = extractCookie(repLogin.cookies);
  assert(repLogin.status === 200, 'Rep login successful (priya@nexora.io)');

  // ── 2. TEAM MANAGEMENT & RBAC ────────────────────────────────
  console.log('\n--- 2. Team Directory & RBAC Visibility ---');
  // Owner sees all users
  const ownerTeam = await makeRequest('GET', '/api/team', null, { Cookie: ownerCookie });
  assert(ownerTeam.status === 200, 'Owner can access /api/team');
  assert(Array.isArray(ownerTeam.body.users), 'Owner receives users array');
  assert(ownerTeam.body.users.length >= 4, `Owner sees all org members (Found: ${ownerTeam.body.users.length})`);
  assert(ownerTeam.body.users[0].metrics !== undefined, 'User objects include performance metrics');
  assert(typeof ownerTeam.body.users[0].metrics.dealsWon === 'number', 'Metrics include dealsWon count');
  assert(typeof ownerTeam.body.users[0].metrics.revenueWon === 'number', 'Metrics include revenueWon value');

  // Manager sees reps, viewers, and self (cannot see owner)
  const mgrTeam = await makeRequest('GET', '/api/team', null, { Cookie: mgrCookie });
  assert(mgrTeam.status === 200, 'Manager can access /api/team');
  const mgrHasOwner = mgrTeam.body.users.some(u => u.role === 'owner');
  assert(!mgrHasOwner, 'Manager cannot see owner in team list (RBAC filtered)');
  const mgrHasSelf = mgrTeam.body.users.some(u => u.id === 'user-002');
  assert(mgrHasSelf, 'Manager sees self in team list');

  // Rep sees only self
  const repTeam = await makeRequest('GET', '/api/team', null, { Cookie: repCookie });
  assert(repTeam.status === 200, 'Rep can access /api/team');
  assert(repTeam.body.users.length === 1, 'Rep sees only 1 user (self)');
  assert(repTeam.body.users[0].id === 'user-003', 'Rep sees self (user-003)');

  // Unauthenticated access fails
  const unauthTeam = await makeRequest('GET', '/api/team');
  assert(unauthTeam.status === 401, 'Unauthenticated /api/team rejected with 401');

  // ── 3. TEAM PERFORMANCE LEADERBOARD ──────────────────────────
  console.log('\n--- 3. Team Performance Leaderboard ---');
  const perfRes = await makeRequest('GET', '/api/team/performance', null, { Cookie: ownerCookie });
  assert(perfRes.status === 200, 'Leaderboard /api/team/performance returns 200');
  assert(Array.isArray(perfRes.body.performance), 'Performance leaderboard is an array');
  assert(perfRes.body.performance.length > 0, 'Leaderboard has active members');
  // Leaderboard must be sorted by revenueWon descending
  const perfItems = perfRes.body.performance;
  let isSorted = true;
  for (let i = 1; i < perfItems.length; i++) {
    if (perfItems[i].revenueWon > perfItems[i - 1].revenueWon) isSorted = false;
  }
  assert(isSorted, 'Leaderboard is sorted by revenueWon descending');

  // ── 4. SECURE EMPLOYEE INVITATION ────────────────────────────
  console.log('\n--- 4. Secure Employee Invitations ---');
  // Rep cannot invite
  const repInvite = await makeRequest('POST', '/api/team/invite', {
    name: 'Unauthorized User',
    email: 'unauth@nexora.io',
    password: 'password123',
    role: 'rep',
  }, { Cookie: repCookie });
  assert(repInvite.status === 403, 'Rep cannot invite employees (403 Forbidden)');

  // Owner invite with short password fails
  const shortPassInvite = await makeRequest('POST', '/api/team/invite', {
    name: 'Short Pass',
    email: 'short@nexora.io',
    password: 'short',
    role: 'rep',
  }, { Cookie: ownerCookie });
  assert(shortPassInvite.status === 400, 'Invite with short password rejected (400 Bad Request)');

  // Owner invite with missing fields fails
  const missingFieldInvite = await makeRequest('POST', '/api/team/invite', {
    name: 'No Email',
    password: 'password123',
  }, { Cookie: ownerCookie });
  assert(missingFieldInvite.status === 400, 'Invite with missing fields rejected (400 Bad Request)');

  // Owner successfully invites new member
  const newEmail = `sarah.connor.${Date.now()}@nexora.io`;
  const validInvite = await makeRequest('POST', '/api/team/invite', {
    name: 'Sarah Connor',
    email: newEmail,
    role: 'rep',
    department: 'Strategic Accounts',
    title: 'Enterprise AE',
    password: 'securePassword123!',
  }, { Cookie: ownerCookie });
  assert(validInvite.status === 201, 'Owner invites new team member (201 Created)');
  assert(validInvite.body.user?.email === newEmail.toLowerCase(), 'Invited member email matches');
  assert(validInvite.body.user?.role === 'rep', 'Invited member role matches');
  assert(validInvite.body.user?.isActive === true, 'Invited member is active');
  const invitedUserId = validInvite.body.user?.id;

  // Duplicate email invite fails
  const dupInvite = await makeRequest('POST', '/api/team/invite', {
    name: 'Duplicate Sarah',
    email: newEmail,
    role: 'rep',
    password: 'securePassword123!',
  }, { Cookie: ownerCookie });
  assert(dupInvite.status === 409, 'Duplicate email invite rejected (409 Conflict)');

  // Newly invited user can log in immediately
  const invitedLogin = await makeRequest('POST', '/api/auth/login', {
    email: newEmail,
    password: 'securePassword123!',
  });
  assert(invitedLogin.status === 200, 'Newly invited employee logs in successfully (200 OK)');

  // ── 5. PERMISSION CONTROLS (ROLE & STATUS UPDATES) ───────────
  console.log('\n--- 5. Permission Controls (Role & Status Updates) ---');
  // Rep cannot change roles
  const repRoleChange = await makeRequest('PATCH', `/api/team/${invitedUserId}/role`, {
    role: 'manager',
  }, { Cookie: repCookie });
  assert(repRoleChange.status === 403, 'Rep cannot change roles (403 Forbidden)');

  // User cannot change own role
  const selfRoleChange = await makeRequest('PATCH', '/api/team/user-001/role', {
    role: 'rep',
  }, { Cookie: ownerCookie });
  assert(selfRoleChange.status === 400, 'Owner cannot change own role (400 Bad Request)');

  // Invalid role fails
  const invalidRoleChange = await makeRequest('PATCH', `/api/team/${invitedUserId}/role`, {
    role: 'superhero',
  }, { Cookie: ownerCookie });
  assert(invalidRoleChange.status === 400, 'Invalid role rejected (400 Bad Request)');

  // Owner promotes invited member to manager
  const promoteRes = await makeRequest('PATCH', `/api/team/${invitedUserId}/role`, {
    role: 'manager',
  }, { Cookie: ownerCookie });
  assert(promoteRes.status === 200, 'Owner changes employee role to manager (200 OK)');
  assert(promoteRes.body.user?.role === 'manager', 'Updated user role is manager');

  // Deactivate employee
  // Rep cannot deactivate
  const repDeactivate = await makeRequest('PATCH', `/api/team/${invitedUserId}/status`, {
    isActive: false,
  }, { Cookie: repCookie });
  assert(repDeactivate.status === 403, 'Rep cannot deactivate accounts (403 Forbidden)');

  // Owner cannot deactivate self
  const selfDeactivate = await makeRequest('PATCH', '/api/team/user-001/status', {
    isActive: false,
  }, { Cookie: ownerCookie });
  assert(selfDeactivate.status === 400, 'Owner cannot deactivate self (400 Bad Request)');

  // Owner deactivates employee
  const deactRes = await makeRequest('PATCH', `/api/team/${invitedUserId}/status`, {
    isActive: false,
  }, { Cookie: ownerCookie });
  assert(deactRes.status === 200, 'Owner deactivates employee account (200 OK)');
  assert(deactRes.body.user?.isActive === false, 'User status is inactive');

  // Deactivated user cannot log in
  const deactivatedLogin = await makeRequest('POST', '/api/auth/login', {
    email: newEmail,
    password: 'securePassword123!',
  });
  assert(deactivatedLogin.status === 403, 'Deactivated account cannot log in (403 Forbidden)');

  // Reactivate employee
  const reactRes = await makeRequest('PATCH', `/api/team/${invitedUserId}/status`, {
    isActive: true,
  }, { Cookie: ownerCookie });
  assert(reactRes.status === 200, 'Owner reactivates employee account (200 OK)');
  assert(reactRes.body.user?.isActive === true, 'User status is active again');

  // ── 6. DASHBOARD REAL DATABASE DATA ──────────────────────────
  console.log('\n--- 6. Dashboard Real Database Data ---');
  const dashStats = await makeRequest('GET', '/api/dashboard/stats', null, { Cookie: ownerCookie });
  assert(dashStats.status === 200, 'Dashboard stats returns 200');
  assert(Array.isArray(dashStats.body), 'Dashboard stats is an array (backward compatibility)');
  assert(dashStats.body.length === 4, 'Dashboard stats returns 4 KPI cards');
  const revCard = dashStats.body.find(s => s.id === 'revenue');
  assert(Boolean(revCard) && revCard.value.startsWith('$'), `Revenue card computed from real won deals (${revCard?.value})`);

  const dashRev = await makeRequest('GET', '/api/dashboard/revenue', null, { Cookie: ownerCookie });
  assert(dashRev.status === 200, 'Dashboard revenue returns 200');
  assert(Array.isArray(dashRev.body.monthly), 'Revenue has monthly array');
  assert(dashRev.body.monthly.length === 6, 'Revenue monthly has 6 months');

  const dashAct = await makeRequest('GET', '/api/dashboard/activity', null, { Cookie: ownerCookie });
  assert(dashAct.status === 200, 'Dashboard activity returns 200');
  assert(Array.isArray(dashAct.body), 'Dashboard activity is an array');

  const dashPipe = await makeRequest('GET', '/api/dashboard/pipeline', null, { Cookie: ownerCookie });
  assert(dashPipe.status === 200, 'Dashboard pipeline returns 200');
  assert(Array.isArray(dashPipe.body), 'Dashboard pipeline is an array of stages');

  const dashTasks = await makeRequest('GET', '/api/dashboard/tasks', null, { Cookie: ownerCookie });
  assert(dashTasks.status === 200, 'Dashboard tasks returns 200');
  assert(Array.isArray(dashTasks.body), 'Dashboard tasks is an array');

  const dashTeam = await makeRequest('GET', '/api/dashboard/team', null, { Cookie: ownerCookie });
  assert(dashTeam.status === 200, 'Dashboard team returns 200');
  assert(Array.isArray(dashTeam.body), 'Dashboard team is an array');

  // ── 7. REPORTS & ANALYTICS ───────────────────────────────────
  console.log('\n--- 7. Reports & Analytics ---');
  const repRev = await makeRequest('GET', '/api/reports/revenue?period=6', null, { Cookie: ownerCookie });
  assert(repRev.status === 200, 'Reports revenue returns 200');
  assert(Array.isArray(repRev.body.revenue), 'Reports revenue has monthly breakdown');
  assert(typeof repRev.body.totalRevenue === 'number', 'Reports revenue has totalRevenue number');
  assert(repRev.body.period === 6, 'Period query parameter respected');

  const pipeSummary = await makeRequest('GET', '/api/reports/pipeline-summary', null, { Cookie: ownerCookie });
  assert(pipeSummary.status === 200, 'Pipeline summary returns 200');
  assert(Array.isArray(pipeSummary.body.stages), 'Pipeline summary has stages array');
  assert(pipeSummary.body.stages.length === 6, 'All 6 pipeline stages summarized');
  assert(typeof pipeSummary.body.totalPipelineValue === 'number', 'Total pipeline value computed');

  const teamPerf = await makeRequest('GET', '/api/reports/team-performance', null, { Cookie: ownerCookie });
  assert(teamPerf.status === 200, 'Reports team-performance returns 200');
  assert(Array.isArray(teamPerf.body.performance), 'Team performance is an array');
  assert(teamPerf.body.performance.length > 0, 'Team performance contains org members');
  assert(typeof teamPerf.body.performance[0].dealsWon === 'number', 'Member has dealsWon count');

  const actSummary = await makeRequest('GET', '/api/reports/activity-summary', null, { Cookie: ownerCookie });
  assert(actSummary.status === 200, 'Activity summary returns 200');
  assert(typeof actSummary.body.total === 'number', 'Activity summary has total count');
  assert(Array.isArray(actSummary.body.byType), 'Activity summary has byType array');
  assert(Array.isArray(actSummary.body.byStatus), 'Activity summary has byStatus array');

  // ── 8. CSV EXPORTS ───────────────────────────────────────────
  console.log('\n--- 8. Database CSV Exports ---');
  // Leads export
  const leadsExp = await makeRequest('GET', '/api/reports/export/leads', null, { Cookie: ownerCookie });
  assert(leadsExp.status === 200, 'Export leads returns 200 OK');
  assert(leadsExp.headers['content-type']?.includes('text/csv'), 'Export leads Content-Type is text/csv');
  assert(leadsExp.headers['content-disposition']?.includes('nexora-leads.csv'), 'Export leads Content-Disposition has filename');
  assert(typeof leadsExp.body === 'string' && leadsExp.body.includes('First Name'), 'CSV body contains header row');

  // Contacts export
  const contactsExp = await makeRequest('GET', '/api/reports/export/contacts', null, { Cookie: ownerCookie });
  assert(contactsExp.status === 200, 'Export contacts returns 200 OK');
  assert(contactsExp.headers['content-type']?.includes('text/csv'), 'Export contacts Content-Type is text/csv');
  assert(typeof contactsExp.body === 'string' && contactsExp.body.includes('Email'), 'Contacts CSV body contains header row');

  // Deals export
  const dealsExp = await makeRequest('GET', '/api/reports/export/deals', null, { Cookie: ownerCookie });
  assert(dealsExp.status === 200, 'Export deals returns 200 OK');
  assert(dealsExp.headers['content-type']?.includes('text/csv'), 'Export deals Content-Type is text/csv');
  assert(typeof dealsExp.body === 'string' && dealsExp.body.includes('Deal Name'), 'Deals CSV body contains header row');

  // Activities export
  const actExp = await makeRequest('GET', '/api/reports/export/activities', null, { Cookie: ownerCookie });
  assert(actExp.status === 200, 'Export activities returns 200 OK');
  assert(actExp.headers['content-type']?.includes('text/csv'), 'Export activities Content-Type is text/csv');
  assert(typeof actExp.body === 'string' && actExp.body.includes('Assigned To'), 'Activities CSV body contains header row');

  // Unauthenticated export rejected
  const unauthExport = await makeRequest('GET', '/api/reports/export/deals');
  assert(unauthExport.status === 401, 'Unauthenticated export rejected (401 Unauthorized)');

  // ── 9. NON-REGRESSION VERIFICATION ───────────────────────────
  console.log('\n--- 9. Non-Regression Verification ---');
  const meRes = await makeRequest('GET', '/api/auth/me', null, { Cookie: ownerCookie });
  assert(meRes.status === 200 && meRes.body.user?.role === 'owner', 'Auth /api/auth/me still intact');

  const leadsList = await makeRequest('GET', '/api/leads?limit=5', null, { Cookie: ownerCookie });
  assert(leadsList.status === 200 && Array.isArray(leadsList.body.items), 'Leads API still intact');

  const dealsList = await makeRequest('GET', '/api/deals?limit=5', null, { Cookie: ownerCookie });
  assert(dealsList.status === 200 && Array.isArray(dealsList.body.items), 'Deals API still intact');

  const actList = await makeRequest('GET', '/api/activities?limit=5', null, { Cookie: ownerCookie });
  assert(actList.status === 200 && Array.isArray(actList.body.items), 'Activities API still intact');

  console.log('\n================================================================');
  console.log(`📊 Team & Reports Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

