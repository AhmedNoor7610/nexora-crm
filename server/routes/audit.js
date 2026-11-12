// ── Nexora CRM — Audit Log Routes ─────────────────────────────
import { Router } from 'express';
import { authMiddleware, requireRole, requireOrgScope } from '../middleware/auth.js';
import { crmStore } from '../db/crmStore.js';

const router = Router();
router.use(authMiddleware, requireOrgScope);

// ── GET /api/audit-logs ───────────────────────────────────────
// Retrieves organization audit trail. Restricted to Owners and Managers.
router.get('/', requireRole('owner', 'admin', 'manager'), async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const { entityType, action, entityId, limit = 50, page = 1 } = req.query;

    const result = await crmStore.getAuditLogs({
      orgId,
      entityType,
      action,
      entityId,
      limit: parseInt(limit, 10) || 50,
      page: parseInt(page, 10) || 1,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

