// ── Nexora CRM — Activities, Tasks, Reminders & Socket.IO Test Suite ──
import { io as ioClient } from 'socket.io-client';

const BASE_URL = 'http://localhost:3001';
let passed = 0;
let failed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}${details ? ' — ' + details : ''}`);
    failed++;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}

async function runTests() {
  console.log('\n================================================================');
  console.log('🧪 Testing Activities, Tasks, Reminders, Notifications & Socket.IO');
  console.log('================================================================\n');

  // ── 1. Setup Authenticated Sessions ─────────────────────────
  const ownerLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@nexora.io', password: 'nexora123' }),
  });
  assert(ownerLogin.status === 200, 'Owner login successful', `Got ${ownerLogin.status}`);
  const ownerToken = ownerLogin.data.token;
  const ownerHeaders = { Authorization: `Bearer ${ownerToken}` };

  const repLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'priya@nexora.io', password: 'nexora123' }),
  });
  assert(repLogin.status === 200, 'Sales Rep login successful', `Got ${repLogin.status}`);
  const repToken = repLogin.data.token;
  const repHeaders = { Authorization: `Bearer ${repToken}` };

  // Create user in another organization to test cross-tenant isolation
  const otherReg = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'External Tenant User',
      email: `other-tenant-${Date.now()}@acme-corp.com`,
      password: 'Password123!',
      organizationName: 'Acme External Corp',
    }),
  });
  assert(otherReg.status === 201, 'External tenant registered', `Got ${otherReg.status}`);
  const otherHeaders = { Authorization: `Bearer ${otherReg.data.token}` };

  // ── 2. Activities & Tasks CRUD ──────────────────────────────
  console.log('\n--- 1. Activities & Tasks CRUD & Filtering ---');
  const activitiesRes = await request('/api/activities', { headers: ownerHeaders });
  assert(activitiesRes.status === 200, 'GET /api/activities returns 200', `Got ${activitiesRes.status}`);
  assert(Array.isArray(activitiesRes.data.items), 'Activities items array returned');
  assert(activitiesRes.data.items.length >= 7, `Seeded activities count verified: ${activitiesRes.data.items.length}`);

  // Filter by status: pending
  const pendingRes = await request('/api/activities?status=pending', { headers: ownerHeaders });
  assert(pendingRes.status === 200, 'Filter /api/activities?status=pending returns 200');
  assert(pendingRes.data.items.every(a => a.status === 'pending'), 'All filtered activities have status pending');

  // Filter by priority: urgent
  const urgentRes = await request('/api/activities?priority=urgent', { headers: ownerHeaders });
  assert(urgentRes.status === 200, 'Filter /api/activities?priority=urgent returns 200');
  assert(urgentRes.data.items.every(a => a.priority === 'urgent'), 'All filtered activities have priority urgent');

  // Create new Task linked to Deal
  const newTaskRes = await request('/api/activities', {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({
      title: 'Conduct Final Security Architecture Review',
      type: 'task',
      priority: 'high',
      status: 'pending',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      entityType: 'deal',
      entityId: 'deal-001',
      entityName: 'Stripe — Enterprise Cloud Expansion',
      description: 'Review AWS VPC peering and KMS encryption specifications',
    }),
  });
  assert(newTaskRes.status === 201, 'POST /api/activities returns 201 Created', `Got ${newTaskRes.status}`);
  const createdTaskId = newTaskRes.data.activity.id;
  assert(Boolean(createdTaskId), `Task created with ID: ${createdTaskId}`);
  assert(newTaskRes.data.activity.entityName === 'Stripe — Enterprise Cloud Expansion', 'Task linked to deal verified');

  // Quick Toggle Complete Task
  const completeRes = await request(`/api/activities/${createdTaskId}/complete`, {
    method: 'PATCH',
    headers: ownerHeaders,
  });
  assert(completeRes.status === 200, 'PATCH /api/activities/:id/complete returns 200');
  assert(completeRes.data.activity.status === 'completed', 'Activity status updated to completed');
  assert(Boolean(completeRes.data.activity.completedAt), 'completedAt timestamp populated');

  // Toggle back to pending
  const uncompleteRes = await request(`/api/activities/${createdTaskId}/complete`, {
    method: 'PATCH',
    headers: ownerHeaders,
  });
  assert(uncompleteRes.status === 200, 'Toggling back to pending returns 200');
  assert(uncompleteRes.data.activity.status === 'pending', 'Activity status reverted to pending');
  assert(uncompleteRes.data.activity.completedAt === null, 'completedAt cleared when pending');

  // ── 3. Activity Timeline ────────────────────────────────────
  console.log('\n--- 2. Activity Timeline ---');
  const timelineRes = await request('/api/activities/timeline', { headers: ownerHeaders });
  assert(timelineRes.status === 200, 'GET /api/activities/timeline returns 200');
  assert(Array.isArray(timelineRes.data.timeline), 'Timeline array returned');
  assert(timelineRes.data.timeline.length >= 7, `Timeline contains ${timelineRes.data.timeline.length} events`);

  // Entity-scoped timeline
  const dealTimeline = await request('/api/activities/timeline?entityType=deal&entityId=deal-001', {
    headers: ownerHeaders,
  });
  assert(dealTimeline.status === 200, 'Entity timeline for deal-001 returns 200');
  assert(dealTimeline.data.timeline.every(t => t.entityId === 'deal-001'), 'All timeline items belong to deal-001');

  // ── 4. Notifications & Scoping Controls ─────────────────────
  console.log('\n--- 3. Organization- and User-Scoped Notifications ---');
  const ownerNotifs = await request('/api/notifications', { headers: ownerHeaders });
  assert(ownerNotifs.status === 200, 'GET /api/notifications for Owner returns 200');
  assert(Array.isArray(ownerNotifs.data.notifications), 'Notifications array returned');
  assert(typeof ownerNotifs.data.unreadCount === 'number', `Owner has valid unreadCount metric: ${ownerNotifs.data.unreadCount}`);

  // Verify Rep User-Scoping: Rep sees only their own notifications or org-wide announcements
  const repNotifs = await request('/api/notifications', { headers: repHeaders });
  assert(repNotifs.status === 200, 'GET /api/notifications for Rep returns 200');
  const repAllowed = repNotifs.data.notifications.every(
    n => n.userId === 'user-003' || n.userId === null
  );
  assert(repAllowed, 'Sales Rep only sees notifications scoped to their userId or org broadcast');

  const repSeesOwnerPrivate = repNotifs.data.notifications.some(n => n.id === 'notif-001' || n.id === 'notif-002');
  assert(!repSeesOwnerPrivate, 'Sales Rep cannot see Owner-private notifications (Security verified)');

  // Verify Cross-Tenant Isolation: other organization gets zero notifications from org-001
  const otherNotifs = await request('/api/notifications', { headers: otherHeaders });
  assert(otherNotifs.status === 200, 'External tenant GET /api/notifications returns 200');
  assert(otherNotifs.data.notifications.length === 0, 'External tenant receives 0 notifications from org-001 (Multi-tenant isolation verified)');

  // Mark single notification as read
  const unreadTarget = ownerNotifs.data.notifications[0];
  if (unreadTarget) {
    const markReadRes = await request(`/api/notifications/${unreadTarget.id}/read`, {
      method: 'PATCH',
      headers: ownerHeaders,
    });
    assert(markReadRes.status === 200, 'PATCH /api/notifications/:id/read returns 200');
    assert(markReadRes.data.notification.read === true, 'Notification marked as read: true');
  }

  // Mark all notifications as read
  const readAllRes = await request('/api/notifications/read-all', {
    method: 'PATCH',
    headers: ownerHeaders,
  });
  assert(readAllRes.status === 200, 'PATCH /api/notifications/read-all returns 200');
  assert(readAllRes.data.unreadCount === 0, 'Unread count is 0 after mark-all-read');

  // ── 5. Real-Time Socket.IO Tests ────────────────────────────
  console.log('\n--- 4. Real-Time Socket.IO Handshake, Rooms & Emission ---');

  // Connect Owner socket client
  const ownerSocket = ioClient(BASE_URL, {
    auth: { token: ownerToken },
    transports: ['websocket', 'polling'],
  });

  const repSocket = ioClient(BASE_URL, {
    auth: { token: repToken },
    transports: ['websocket', 'polling'],
  });

  // Wait for connections
  const ownerConnected = await new Promise((resolve) => {
    ownerSocket.on('connected', (data) => resolve(data));
    setTimeout(() => resolve(null), 3000);
  });
  assert(Boolean(ownerConnected), 'Owner Socket.IO client authenticated successfully');
  assert(ownerConnected?.orgId === 'org-001', 'Socket authenticated in org-001');

  const repConnected = await new Promise((resolve) => {
    repSocket.on('connected', (data) => resolve(data));
    setTimeout(() => resolve(null), 3000);
  });
  assert(Boolean(repConnected), 'Sales Rep Socket.IO client authenticated successfully');

  // Test Real-Time Event Delivery: Owner assigns a task to Rep
  // Rep should receive 'notification:new' event in real time!
  console.log('\n--- 5. End-to-End Real-Time Notification Delivery ---');

  const repReceivedPromise = new Promise((resolve) => {
    repSocket.on('notification:new', (notif) => {
      resolve(notif);
    });
    setTimeout(() => resolve(null), 4000);
  });

  // Owner creates activity assigned to user-003 (Rep Priya Sharma)
  const assignTaskRes = await request('/api/activities', {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({
      title: 'Review Redlined Contract with Solaria Energy',
      type: 'task',
      priority: 'urgent',
      assignedTo: 'user-003',
      assignedToName: 'Priya Sharma',
      dueDate: new Date(Date.now() + 7200000).toISOString(),
      description: 'Please approve the liability terms requested by Carlos Santana',
    }),
  });
  assert(assignTaskRes.status === 201, 'Owner assigned task to Sales Rep with 201 Created');

  const receivedNotif = await repReceivedPromise;
  assert(Boolean(receivedNotif), 'Sales Rep received real-time Socket.IO notification');
  assert(receivedNotif?.type === 'task_assigned', 'Notification type is task_assigned');
  assert(receivedNotif?.userId === 'user-003', 'Notification correctly scoped to rep userId');
  assert(receivedNotif?.title.includes('TASK'), `Notification title verified: "${receivedNotif?.title}"`);

  // Disconnect sockets cleanly
  ownerSocket.disconnect();
  repSocket.disconnect();

  // ── 6. Non-Regression Verification ──────────────────────────
  console.log('\n--- 6. Non-Regression Verification (Deals, Leads & Auth) ---');
  const dealsCheck = await request('/api/deals/pipeline', { headers: ownerHeaders });
  assert(dealsCheck.status === 200, 'Deals pipeline API operational (Got 200)');

  const leadsCheck = await request('/api/leads', { headers: ownerHeaders });
  assert(leadsCheck.status === 200, 'Leads API operational (Got 200)');

  const authCheck = await request('/api/auth/me', { headers: ownerHeaders });
  assert(authCheck.status === 200, 'Auth session /me operational (Got 200)');

  console.log('\n================================================================');
  console.log(`📊 Activities & Notifications Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
