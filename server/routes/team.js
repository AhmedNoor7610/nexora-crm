// ── Nexora CRM — Team Management Routes ──────────────────────
import { Router } from 'express';
import crypto from 'crypto';
import { authMiddleware, requireRole, requireOrgScope } from '../middleware/auth.js';
import { ROLES, users, listUsersByOrg, findUserById, safeUser, createUser, setInvitationToken } from '../db/store.js';
import { crmStore } from '../db/crmStore.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authMiddleware, requireOrgScope);

// ── GET /api/team ─────────────────────────────────────────────
// List org users with performance metrics. Owner/Admin see all; manager sees reps/viewers + self; rep/viewer sees self.
router.get('/', async (req, res, next) => {
  try {
    const { orgId, role, id: callerId } = req.user;
    const allUsers = listUsersByOrg(orgId);

    let visibleUsers = allUsers;
    if (role === 'manager') {
      visibleUsers = allUsers.filter(u => ['rep', 'viewer'].includes(u.role) || u.id === callerId);
    } else if (role === 'rep' || role === 'viewer') {
      visibleUsers = allUsers.filter(u => u.id === callerId);
    }

    const allDeals = await crmStore.getDeals({ orgId, limit: 1000 });
    const dealItems = allDeals.items || [];
    const allActivities = await crmStore.getActivities({ orgId, limit: 1000 });
    const actItems = allActivities.items || [];

    const withMetrics = visibleUsers.map(u => {
      const myDeals = dealItems.filter(d => d.ownerId === u.id);
      const wonDeals = myDeals.filter(d => d.stage === 'won');
      const myActs = actItems.filter(a => a.assignedTo === u.id);
      const doneActs = myActs.filter(a => a.status === 'completed');
      const pipelineValue = myDeals
        .filter(d => !['won', 'lost'].includes(d.stage))
        .reduce((sum, d) => sum + (d.amount || 0), 0);
      const wonValue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
      const winRate = myDeals.length > 0 ? Math.round((wonDeals.length / myDeals.length) * 100) : 0;

      return {
        ...u,
        metrics: {
          dealsTotal: myDeals.length,
          dealsWon: wonDeals.length,
          revenueWon: wonValue,
          pipelineValue,
          activitiesTotal: myActs.length,
          activitiesDone: doneActs.length,
          winRate,
        },
      };
    });

    res.json({ success: true, users: withMetrics, total: withMetrics.length });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/team/performance ─────────────────────────────────
router.get('/performance', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const allUsers = listUsersByOrg(orgId);
    const allDeals = await crmStore.getDeals({ orgId, limit: 1000 });
    const dealItems = allDeals.items || [];
    const allActivities = await crmStore.getActivities({ orgId, limit: 1000 });
    const actItems = allActivities.items || [];

    const performance = allUsers
      .filter(u => u.isActive)
      .map(u => {
        const myDeals = dealItems.filter(d => d.ownerId === u.id);
        const wonDeals = myDeals.filter(d => d.stage === 'won');
        const myActs = actItems.filter(a => a.assignedTo === u.id);
        const doneActs = myActs.filter(a => a.status === 'completed');
        const pipelineValue = myDeals
          .filter(d => !['won', 'lost'].includes(d.stage))
          .reduce((sum, d) => sum + (d.amount || 0), 0);
        const wonValue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
        const winRate = myDeals.length > 0 ? Math.round((wonDeals.length / myDeals.length) * 100) : 0;

        return {
          userId: u.id,
          name: u.name,
          avatar: u.avatar,
          role: u.role,
          roleTitle: u.roleTitle,
          department: u.department,
          dealsTotal: myDeals.length,
          dealsWon: wonDeals.length,
          revenueWon: wonValue,
          pipelineValue,
          activitiesTotal: myActs.length,
          activitiesDone: doneActs.length,
          winRate,
        };
      })
      .sort((a, b) => b.revenueWon - a.revenueWon);

    res.json({ success: true, performance });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/team/:userId/role ──────────────────────────────
router.patch('/:userId/role', requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role: newRole } = req.body;
    const caller = req.user;

    if (!newRole || !ROLES[newRole]) {
      return res.status(400).json({ error: 'Bad Request', message: `Invalid role: '${newRole}'` });
    }
    if (userId === caller.id) {
      return res.status(400).json({ error: 'Bad Request', message: 'You cannot change your own role.' });
    }

    const target = findUserById(userId);
    if (!target) return res.status(404).json({ error: 'Not Found', message: 'User not found.' });
    if (target.orgId !== caller.orgId) return res.status(403).json({ error: 'Forbidden', message: 'Cross-org operation denied.' });

    // Admin cannot touch owner accounts or promote to owner
    if (caller.role === 'admin') {
      if (target.role === 'owner') return res.status(403).json({ error: 'Forbidden', message: 'Admin cannot modify the organization owner.' });
      if (newRole === 'owner') return res.status(403).json({ error: 'Forbidden', message: 'Admin cannot promote a user to Owner.' });
    }

    const oldRole = target.role;
    target.role = newRole;
    users.set(target.id, target);

    await logAudit(req, {
      action: 'ROLE_CHANGE',
      entityType: 'user',
      entityId: target.id,
      entityName: target.name,
      details: { oldRole, newRole },
    });

    res.json({ success: true, message: `Role updated to '${newRole}'.`, user: safeUser(target) });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/team/:userId/status ───────────────────────────
router.patch('/:userId/status', requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const caller = req.user;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Bad Request', message: 'isActive must be a boolean.' });
    }
    if (userId === caller.id) {
      return res.status(400).json({ error: 'Bad Request', message: 'You cannot deactivate your own account.' });
    }

    const target = findUserById(userId);
    if (!target) return res.status(404).json({ error: 'Not Found', message: 'User not found.' });
    if (target.orgId !== caller.orgId) return res.status(403).json({ error: 'Forbidden', message: 'Cross-org operation denied.' });

    if (caller.role === 'admin' && target.role === 'owner') {
      return res.status(403).json({ error: 'Forbidden', message: 'Admin cannot deactivate the organization owner.' });
    }

    target.isActive = isActive;
    users.set(target.id, target);

    await logAudit(req, {
      action: 'STATUS_CHANGE',
      entityType: 'user',
      entityId: target.id,
      entityName: target.name,
      details: { isActive },
    });

    res.json({ success: true, message: `Account ${isActive ? 'activated' : 'deactivated'}.`, user: safeUser(target) });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/team/invite ─────────────────────────────────────
router.post('/invite', requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { name, email, role = 'rep', department = 'General', title = '', password } = req.body;
    const caller = req.user;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Bad Request', message: 'name, email, and password are required.' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Bad Request', message: 'Password must be at least 8 characters long.' });
    }
    if (!ROLES[role]) {
      return res.status(400).json({ error: 'Bad Request', message: `Invalid role: '${role}'` });
    }
    // Admin cannot create owners
    if (caller.role === 'admin' && role === 'owner') {
      return res.status(403).json({ error: 'Forbidden', message: 'Admin cannot create owner accounts.' });
    }

    // Check email uniqueness within org
    const existingUsers = listUsersByOrg(caller.orgId);
    const emailExists = existingUsers.some(u => u.email === email.trim().toLowerCase());
    if (emailExists) {
      return res.status(409).json({ error: 'Conflict', message: 'A user with that email already exists in this organization.' });
    }

    const newUser = createUser({ name, email, password, orgId: caller.orgId, role, department, title });
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    setInvitationToken(newUser.id, inviteToken, expiresAt);

    res.status(201).json({
      success: true,
      message: `Team member '${newUser.name}' invited successfully.`,
      user: safeUser(newUser),
      invitationToken: inviteToken,
      invitationLink: `/#accept-invitation?token=${inviteToken}`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

