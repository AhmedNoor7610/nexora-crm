// ── Nexora CRM — Complete Authentication & RBAC Test Suite ───────
import http from 'http';

const BASE_URL = 'http://localhost:3001';

// Minimal HTTP client supporting cookies and JSON
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

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n============================================================');
  console.log('🧪 Starting Nexora CRM Authentication & RBAC Test Suite');
  console.log('============================================================\n');

  // Test 1: Health Check
  console.log('--- 1. API Health Check ---');
  const healthRes = await makeRequest('GET', '/api/health');
  assert(healthRes.status === 200, `Health endpoint returns 200 (Got ${healthRes.status})`);
  assert(healthRes.body.status === 'ok', 'Health status is ok');

  // Test 2: User & Organization Registration
  console.log('\n--- 2. Organization Creation & User Registration ---');
  const uniqueSuffix = Date.now().toString().slice(-4);
  const regPayload = {
    name: 'Sarah Connor',
    email: `sarah.${uniqueSuffix}@skynet-defense.com`,
    password: 'SecurePassword123!',
    organizationName: 'Skynet Defense Technologies',
    plan: 'enterprise',
  };

  const regRes = await makeRequest('POST', '/api/auth/register', regPayload);
  assert(regRes.status === 201, `Registration returned 201 Created (Got ${regRes.status})`);
  assert(Boolean(regRes.body.token), 'JWT Token generated on registration');
  assert(regRes.body.user?.role === 'owner', 'New organization creator assigned "owner" role');
  assert(regRes.body.organization?.name === 'Skynet Defense Technologies', 'Organization created with specified name');

  // Check HTTP-only cookie in registration response
  const regCookie = extractCookie(regRes.cookies);
  assert(Boolean(regCookie), 'Set-Cookie header contains nexora_token');
  const rawSetCookie = regRes.cookies.find((c) => c.startsWith('nexora_token='));
  assert(
    rawSetCookie && rawSetCookie.toLowerCase().includes('httponly'),
    'Registration cookie has HttpOnly flag set'
  );

  // Test 3: Duplicate Registration Rejection
  console.log('\n--- 3. Duplicate Registration Prevention ---');
  const dupRes = await makeRequest('POST', '/api/auth/register', regPayload);
  assert(dupRes.status === 409, `Duplicate email rejected with 409 Conflict (Got ${dupRes.status})`);

  // Test 4: Registration Input Validation
  console.log('\n--- 4. Password Policy Validation ---');
  const weakPayload = {
    name: 'Weak Pass',
    email: 'weak@example.com',
    password: 'short',
    organizationName: 'Test Org',
  };
  const weakRes = await makeRequest('POST', '/api/auth/register', weakPayload);
  assert(weakRes.status === 400, `Short password rejected with 400 Bad Request (Got ${weakRes.status})`);

  // Test 5: Login with Hashed Password & Seeded User
  console.log('\n--- 5. Seeded User Login & Password Hashing Verification ---');
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@nexora.io',
    password: 'nexora123',
    remember: true,
  });
  assert(loginRes.status === 200, `Login returns 200 OK (Got ${loginRes.status})`);
  assert(Boolean(loginRes.body.token), 'JWT token returned in login response body');
  assert(loginRes.body.user?.email === 'admin@nexora.io', 'User profile returned matching email');
  assert(loginRes.body.user?.role === 'owner', 'User role correctly populated as owner');
  assert(!loginRes.body.user?.passwordHash, 'Security: passwordHash is stripped from response');

  const adminCookie = extractCookie(loginRes.cookies);
  assert(Boolean(adminCookie), 'Login issues nexora_token cookie');

  // Test 6: Invalid Credentials Rejection
  console.log('\n--- 6. Invalid Password Rejection ---');
  const badLoginRes = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@nexora.io',
    password: 'WrongPassword999',
  });
  assert(badLoginRes.status === 401, `Wrong password rejected with 401 Unauthorized (Got ${badLoginRes.status})`);

  // Test 7: Suspended/Inactive User Rejection
  console.log('\n--- 7. Inactive Account Access Guard ---');
  const inactiveRes = await makeRequest('POST', '/api/auth/login', {
    email: 'jordan@nexora.io', // seeded as isActive: false
    password: 'nexora123',
  });
  assert(inactiveRes.status === 403, `Deactivated account rejected with 403 Forbidden (Got ${inactiveRes.status})`);

  // Test 8: Protected Route via HTTP-Only Cookie
  console.log('\n--- 8. Protected Route (/api/auth/me) via HTTP-Only Cookie ---');
  const meCookieRes = await makeRequest('GET', '/api/auth/me', null, {
    Cookie: adminCookie,
  });
  assert(meCookieRes.status === 200, `Cookie-authenticated /me returns 200 OK (Got ${meCookieRes.status})`);
  assert(meCookieRes.body.user?.id === 'user-001', 'Cookie resolves to user-001 (Alexandra Reid)');
  assert(meCookieRes.body.user?.organization?.name !== undefined, 'User organization scope resolved');

  // Test 9: Protected Route via Authorization Bearer Header (Fallback)
  console.log('\n--- 9. Protected Route via Authorization Bearer Header ---');
  const meHeaderRes = await makeRequest('GET', '/api/auth/me', null, {
    Authorization: `Bearer ${loginRes.body.token}`,
  });
  assert(meHeaderRes.status === 200, `Bearer-authenticated /me returns 200 OK (Got ${meHeaderRes.status})`);

  // Test 10: Unauthenticated Request Blocked
  console.log('\n--- 10. Unauthenticated Request Blocked ---');
  const unauthRes = await makeRequest('GET', '/api/auth/me');
  assert(unauthRes.status === 401, `Missing credentials returns 401 Unauthorized (Got ${unauthRes.status})`);

  // Test 11: Role-Based Access Control (RBAC) Permissions
  console.log('\n--- 11. Role-Based Access Control (RBAC) Verification ---');
  // Log in as Sales Representative Priya Sharma
  const repLoginRes = await makeRequest('POST', '/api/auth/login', {
    email: 'priya@nexora.io',
    password: 'nexora123',
  });
  const repCookie = extractCookie(repLoginRes.cookies);
  assert(repLoginRes.body.user?.role === 'rep', 'Logged in as role: rep');

  // Rep attempts to access admin route: GET /api/auth/users
  const repUsersRes = await makeRequest('GET', '/api/auth/users', null, {
    Cookie: repCookie,
  });
  assert(
    repUsersRes.status === 403,
    `Sales Rep forbidden from accessing /api/auth/users with 403 (Got ${repUsersRes.status})`
  );

  // Owner attempts to access admin route: GET /api/auth/users
  const ownerUsersRes = await makeRequest('GET', '/api/auth/users', null, {
    Cookie: adminCookie,
  });
  assert(
    ownerUsersRes.status === 200,
    `Owner granted access to /api/auth/users with 200 OK (Got ${ownerUsersRes.status})`
  );
  assert(Array.isArray(ownerUsersRes.body.users), 'Team member list returned');

  // Owner provisions a new team member
  const newMemberRes = await makeRequest(
    'POST',
    '/api/auth/users',
    {
      name: 'David Kim',
      email: `david.${uniqueSuffix}@nexora.io`,
      role: 'manager',
      password: 'TemporaryPassword123!',
      department: 'Enterprise Sales',
    },
    { Cookie: adminCookie }
  );
  assert(
    newMemberRes.status === 201,
    `Owner provisions new team member with 201 Created (Got ${newMemberRes.status})`
  );
  assert(newMemberRes.body.user?.role === 'manager', 'New member has manager role');

  // Rep attempts to create user -> forbidden
  const repCreateRes = await makeRequest(
    'POST',
    '/api/auth/users',
    {
      name: 'Hacker',
      email: 'hacker@example.com',
      role: 'admin',
      password: 'password123',
    },
    { Cookie: repCookie }
  );
  assert(
    repCreateRes.status === 403,
    `Sales Rep forbidden from creating users with 403 (Got ${repCreateRes.status})`
  );

  // Test 12: Phase 1 Non-Regression (Dashboard Routes)
  console.log('\n--- 12. Phase 1 Non-Regression (Protected Dashboard Endpoints) ---');
  const statsRes = await makeRequest('GET', '/api/dashboard/stats', null, { Cookie: adminCookie });
  assert(statsRes.status === 200, `Dashboard stats 200 OK (Got ${statsRes.status})`);
  assert(Array.isArray(statsRes.body), 'Dashboard stats array returned');

  const revenueRes = await makeRequest('GET', '/api/dashboard/revenue', null, { Cookie: adminCookie });
  assert(revenueRes.status === 200, `Dashboard revenue 200 OK (Got ${revenueRes.status})`);

  const pipelineRes = await makeRequest('GET', '/api/dashboard/pipeline', null, { Cookie: adminCookie });
  assert(pipelineRes.status === 200, `Dashboard pipeline 200 OK (Got ${pipelineRes.status})`);

  // Unauthenticated dashboard access blocked
  const unauthDashRes = await makeRequest('GET', '/api/dashboard/stats');
  assert(
    unauthDashRes.status === 401,
    `Unauthenticated dashboard access blocked with 401 (Got ${unauthDashRes.status})`
  );

  // Test 13: Logout Flow
  console.log('\n--- 13. Logout & Cookie Invalidation ---');
  const logoutRes = await makeRequest('POST', '/api/auth/logout', null, { Cookie: adminCookie });
  assert(logoutRes.status === 200, `Logout returns 200 OK (Got ${logoutRes.status})`);
  const clearedCookie = logoutRes.cookies.find((c) => c.startsWith('nexora_token='));
  assert(
    clearedCookie && (clearedCookie.includes('Max-Age=0') || clearedCookie.includes('Expires=')),
    'Logout clears nexora_token cookie'
  );

  console.log('\n============================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
