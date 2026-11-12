// ── Nexora CRM — Complete Leads, Contacts & Companies Test Suite ───
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
  console.log('\n================================================================');
  console.log('🧪 Testing Leads, Contacts & Companies Modules + Safe Conversion');
  console.log('================================================================\n');

  // Authenticate as Owner (Alexandra Reid)
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@nexora.io',
    password: 'nexora123',
  });
  const ownerCookie = extractCookie(loginRes.cookies);
  assert(Boolean(ownerCookie), 'Owner session cookie obtained');

  // Authenticate as Sales Rep (Priya Sharma)
  const repLoginRes = await makeRequest('POST', '/api/auth/login', {
    email: 'priya@nexora.io',
    password: 'nexora123',
  });
  const repCookie = extractCookie(repLoginRes.cookies);
  assert(Boolean(repCookie), 'Sales Rep session cookie obtained');

  // ── 1. LEADS MODULE TESTS ────────────────────────────────────
  console.log('\n--- 1. Leads Module (CRUD, Search, Filters, Pagination) ---');
  
  // List Leads (Owner sees all)
  const leadsRes = await makeRequest('GET', '/api/leads?page=1&limit=10', null, { Cookie: ownerCookie });
  assert(leadsRes.status === 200, `GET /api/leads returns 200 (Got ${leadsRes.status})`);
  assert(Array.isArray(leadsRes.body.items), 'Leads array returned');
  assert(leadsRes.body.pagination?.total > 0, `Total leads returned: ${leadsRes.body.pagination?.total}`);

  // Search Leads
  const searchRes = await makeRequest('GET', '/api/leads?search=Apex', null, { Cookie: ownerCookie });
  assert(searchRes.status === 200, 'Search /api/leads?search=Apex returns 200');
  assert(searchRes.body.items.some(l => l.company.includes('Apex')), 'Search matches Apex Cloud Systems');

  // Filter Leads by Status
  const statusRes = await makeRequest('GET', '/api/leads?status=New', null, { Cookie: ownerCookie });
  assert(statusRes.status === 200, 'Filter /api/leads?status=New returns 200');
  assert(statusRes.body.items.every(l => l.status === 'New'), 'All filtered leads have status New');

  // Ownership Control: Sales Rep only sees assigned leads (view:own)
  const repLeadsRes = await makeRequest('GET', '/api/leads', null, { Cookie: repCookie });
  assert(repLeadsRes.status === 200, 'Sales Rep GET /api/leads returns 200');
  assert(repLeadsRes.body.items.every(l => l.ownerId === 'user-003'), 'Sales Rep only sees assigned leads (ownership control verified)');

  // Create New Lead
  const newLeadPayload = {
    firstName: 'Nathan',
    lastName: 'Drake',
    email: 'nathan@unchartedtech.com',
    phone: '+1 (555) 987-6543',
    company: 'Uncharted Exploration Tech',
    title: 'Chief Exploration Officer',
    source: 'Website',
    status: 'New',
    value: 75000,
    score: 88,
    notes: 'High intent prospect from webinar.',
  };
  const createLeadRes = await makeRequest('POST', '/api/leads', newLeadPayload, { Cookie: ownerCookie });
  assert(createLeadRes.status === 201, `Create lead returns 201 Created (Got ${createLeadRes.status})`);
  const createdLeadId = createLeadRes.body.lead?.id;
  assert(Boolean(createdLeadId), `Lead created with ID: ${createdLeadId}`);

  // Update Lead
  const updateLeadRes = await makeRequest(
    'PUT',
    `/api/leads/${createdLeadId}`,
    { status: 'Qualified', value: 85000 },
    { Cookie: ownerCookie }
  );
  assert(updateLeadRes.status === 200, 'Update lead returns 200');
  assert(updateLeadRes.body.lead?.status === 'Qualified', 'Lead status updated to Qualified');
  assert(updateLeadRes.body.lead?.value === 85000, 'Lead value updated to 85000');

  // ── 2. SAFE LEAD CONVERSION TEST ─────────────────────────────
  console.log('\n--- 2. Safe Lead Conversion Flow ---');
  const convertRes = await makeRequest(
    'POST',
    `/api/leads/${createdLeadId}/convert`,
    {
      companyName: 'Uncharted Exploration Tech',
      dealName: 'Uncharted Enterprise Cloud Deal',
      dealAmount: 85000,
    },
    { Cookie: ownerCookie }
  );
  assert(convertRes.status === 200, `Lead converted safely with 200 OK (Got ${convertRes.status})`);
  assert(convertRes.body.success === true, 'Conversion success response flag true');
  assert(Boolean(convertRes.body.contact?.id), `New Contact created: ${convertRes.body.contact?.fullName} (${convertRes.body.contact?.id})`);
  assert(Boolean(convertRes.body.company?.id), `Company linked/created: ${convertRes.body.company?.name} (${convertRes.body.company?.id})`);
  assert(convertRes.body.lead?.converted === true, 'Lead marked converted: true');
  assert(convertRes.body.lead?.status === 'Converted', 'Lead status set to Converted');
  assert(convertRes.body.lead?.conversion?.contactId === convertRes.body.contact?.id, 'Conversion audit references new contact ID');

  // Attempt duplicate conversion on already converted lead -> must fail safely!
  const dupConvertRes = await makeRequest(
    'POST',
    `/api/leads/${createdLeadId}/convert`,
    {},
    { Cookie: ownerCookie }
  );
  assert(dupConvertRes.status === 400, `Duplicate conversion rejected with 400 (Got ${dupConvertRes.status})`);
  assert(dupConvertRes.body.message.includes('already been converted'), 'Proper error message for duplicate conversion');

  // ── 3. CONTACTS MODULE TESTS ─────────────────────────────────
  console.log('\n--- 3. Contacts Module (CRUD, Relations, Lifecycle Stages) ---');
  const contactsRes = await makeRequest('GET', '/api/contacts?page=1&limit=10', null, { Cookie: ownerCookie });
  assert(contactsRes.status === 200, `GET /api/contacts returns 200 (Got ${contactsRes.status})`);
  assert(Array.isArray(contactsRes.body.items), 'Contacts array returned');
  assert(contactsRes.body.pagination?.total > 0, `Total contacts count: ${contactsRes.body.pagination?.total}`);

  // Create Contact
  const newContactRes = await makeRequest(
    'POST',
    '/api/contacts',
    {
      firstName: 'Elena',
      lastName: 'Fisher',
      email: 'elena.f@unchartedtech.com',
      phone: '+1 (555) 123-4567',
      companyName: 'Uncharted Exploration Tech',
      title: 'Managing Editor & Media Lead',
      lifecycleStage: 'SQL',
      status: 'Active',
    },
    { Cookie: ownerCookie }
  );
  assert(newContactRes.status === 201, `Create contact returns 201 Created (Got ${newContactRes.status})`);
  const contactId = newContactRes.body.contact?.id;

  // Get Contact by ID
  const getContactRes = await makeRequest('GET', `/api/contacts/${contactId}`, null, { Cookie: ownerCookie });
  assert(getContactRes.status === 200, 'GET /api/contacts/:id returns 200');
  assert(getContactRes.body.contact?.email === 'elena.f@unchartedtech.com', 'Contact details match');

  // Update Contact
  const updateContactRes = await makeRequest(
    'PUT',
    `/api/contacts/${contactId}`,
    { lifecycleStage: 'Customer', status: 'Customer' },
    { Cookie: ownerCookie }
  );
  assert(updateContactRes.status === 200, 'Update contact returns 200');
  assert(updateContactRes.body.contact?.lifecycleStage === 'Customer', 'Lifecycle stage updated to Customer');

  // ── 4. COMPANIES MODULE TESTS ────────────────────────────────
  console.log('\n--- 4. Companies Module (CRUD, Industry & Size, Relations) ---');
  const companiesRes = await makeRequest('GET', '/api/companies?page=1&limit=10', null, { Cookie: ownerCookie });
  assert(companiesRes.status === 200, `GET /api/companies returns 200 (Got ${companiesRes.status})`);
  assert(Array.isArray(companiesRes.body.items), 'Companies array returned');
  assert(companiesRes.body.pagination?.total > 0, `Total companies count: ${companiesRes.body.pagination?.total}`);

  // Filter Companies by Industry
  const industryRes = await makeRequest('GET', '/api/companies?industry=Financial Services', null, { Cookie: ownerCookie });
  assert(industryRes.status === 200, 'Filter /api/companies?industry=... returns 200');
  assert(industryRes.body.items.some(c => c.name.includes('Stripe')), 'Filtered companies include Stripe');

  // Get Company by ID with related contacts
  const singleCompRes = await makeRequest('GET', '/api/companies/comp-001', null, { Cookie: ownerCookie });
  assert(singleCompRes.status === 200, 'GET /api/companies/comp-001 returns 200');
  assert(singleCompRes.body.company?.name === 'Stripe Payments Inc.', 'Company name matches Stripe');
  assert(Array.isArray(singleCompRes.body.company?.contacts), 'Related contacts array attached to company');
  assert(singleCompRes.body.company.contacts.length >= 2, 'Stripe has at least 2 linked contacts');

  // Create Company
  const newCompRes = await makeRequest(
    'POST',
    '/api/companies',
    {
      name: 'Quantum Cyber Systems',
      domain: 'quantumcyber.io',
      industry: 'Technology & SaaS',
      size: '51-200',
      status: 'Prospect',
      annualRevenue: 35000000,
    },
    { Cookie: ownerCookie }
  );
  assert(newCompRes.status === 201, `Create company returns 201 Created (Got ${newCompRes.status})`);
  const newCompId = newCompRes.body.company?.id;

  // Update Company
  const updateCompRes = await makeRequest(
    'PUT',
    `/api/companies/${newCompId}`,
    { status: 'Active Client' },
    { Cookie: ownerCookie }
  );
  assert(updateCompRes.status === 200, 'Update company returns 200');
  assert(updateCompRes.body.company?.status === 'Active Client', 'Company status updated to Active Client');

  // ── 5. PRESERVED PHASE 1 & PHASE 2 FUNCTIONALITY ────────────
  console.log('\n--- 5. Non-Regression Verification ---');
  const dashStatsRes = await makeRequest('GET', '/api/dashboard/stats', null, { Cookie: ownerCookie });
  assert(dashStatsRes.status === 200, 'Dashboard stats still functional (Got 200)');
  assert(Array.isArray(dashStatsRes.body), 'Dashboard stats array returned');

  const meRes = await makeRequest('GET', '/api/auth/me', null, { Cookie: ownerCookie });
  assert(meRes.status === 200, 'Auth /api/auth/me still functional (Got 200)');
  assert(meRes.body.user?.role === 'owner', 'Authenticated user is owner');

  console.log('\n================================================================');
  console.log(`📊 CRM Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test suite failure:', err);
  process.exit(1);
});
