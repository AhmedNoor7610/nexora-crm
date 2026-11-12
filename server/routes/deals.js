// ── Nexora CRM — Deals & Kanban Pipeline Routes ──────────────
import { Router } from 'express';
import { body, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth.js';
import { applyOwnershipScope, checkMutationAccess, handleValidationErrors, requireWriteAccess } from '../middleware/crmGuards.js';
import { logAudit } from '../middleware/audit.js';
import { crmStore } from '../db/crmStore.js';
import { STAGE_CONFIG } from '../models/Deal.js';

const router = Router();
router.use(authMiddleware);

// Preload deal for mutation authorization guards
async function preloadDeal(req, res, next) {
  try {
    const deal = await crmStore.getDealById(req.params.id, req.user.orgId);
    if (!deal) {
      return res.status(404).json({ error: 'Not Found', message: 'Deal not found in this workspace' });
    }
    req.targetRecord = deal;
    next();
  } catch (err) {
    next(err);
  }
}

// ── GET /api/deals/pipeline ──────────────────────────────────
// Returns Kanban board columns and pipeline valuation metrics
router.get('/pipeline', applyOwnershipScope, async (req, res, next) => {
  try {
    const pipelineData = await crmStore.getDealsPipeline({
      orgId: req.user.orgId,
      ownerId: req.ownershipFilter,
    });
    res.json(pipelineData);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/deals ───────────────────────────────────────────
// List deals with search, filter, and pagination
router.get(
  '/',
  applyOwnershipScope,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('stage').optional().isIn(Object.keys(STAGE_CONFIG)),
    query('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const stage = req.query.stage || '';
      const priority = req.query.priority || '';
      const search = req.query.search || req.query.q || '';
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder || 'desc';

      const result = await crmStore.getDeals({
        orgId: req.user.orgId,
        ownerId: req.ownershipFilter,
        stage,
        priority,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/deals/:id ───────────────────────────────────────
router.get('/:id', preloadDeal, (req, res) => {
  res.json({ success: true, deal: req.targetRecord });
});

// ── POST /api/deals ──────────────────────────────────────────
router.post(
  '/',
  requireWriteAccess,
  [
    body('name').trim().notEmpty().withMessage('Deal name is required'),
    body('amount').isNumeric().withMessage('Deal amount must be a number'),
    body('stage').optional().isIn(Object.keys(STAGE_CONFIG)).withMessage('Invalid stage'),
    body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']),
    body('probability').optional().isInt({ min: 0, max: 100 }),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const {
        name,
        amount,
        companyId = null,
        companyName = '',
        contactId = null,
        contactName = '',
        stage = 'qualification',
        probability = null,
        expectedCloseDate = null,
        priority = 'Medium',
        notes = '',
        tags = [],
        ownerId = null,
        ownerName = null,
      } = req.body;

      // If companyName provided without companyId, resolve or create
      let resolvedCompanyId = companyId;
      let resolvedCompanyName = companyName;

      if (!resolvedCompanyId && companyName) {
        const comp = await crmStore.findOrCreateCompany(req.user.orgId, companyName, req.user.id, req.user.name);
        resolvedCompanyId = comp.id;
        resolvedCompanyName = comp.name;
      }

      const dealData = {
        orgId: req.user.orgId,
        ownerId: ownerId || req.user.id,
        ownerName: ownerName || req.user.name,
        name: name.trim(),
        amount: Number(amount) || 0,
        companyId: resolvedCompanyId,
        companyName: resolvedCompanyName.trim(),
        contactId,
        contactName: contactName.trim(),
        stage,
        priority,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: notes.trim(),
        tags: Array.isArray(tags) ? tags : [],
      };

      if (probability !== null) {
        dealData.probability = Number(probability);
      }

      const newDeal = await crmStore.createDeal(dealData);
      await logAudit(req, {
        action: 'CREATE',
        entityType: 'deal',
        entityId: newDeal.id,
        entityName: newDeal.title,
        details: { amount: newDeal.amount, stage: newDeal.stage, companyName: newDeal.companyName },
      });
      res.status(201).json({
        success: true,
        message: 'Deal created successfully',
        deal: newDeal,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/deals/:id ───────────────────────────────────────
router.put(
  '/:id',
  preloadDeal,
  checkMutationAccess('edit'),
  [
    body('name').optional().trim().notEmpty().withMessage('Deal name cannot be empty'),
    body('amount').optional().isNumeric().withMessage('Deal amount must be a number'),
    body('stage').optional().isIn(Object.keys(STAGE_CONFIG)),
    body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const allowed = ['name', 'amount', 'companyId', 'companyName', 'contactId', 'contactName', 'stage', 'probability', 'expectedCloseDate', 'priority', 'notes', 'tags', 'ownerId', 'ownerName'];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      const updated = await crmStore.updateDeal(req.params.id, req.user.orgId, updates);
      res.json({
        success: true,
        message: 'Deal updated successfully',
        deal: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /api/deals/:id/stage ───────────────────────────────
// Dedicated Drag & Drop Stage Transition Handler with Stage History Tracking
router.patch(
  '/:id/stage',
  preloadDeal,
  checkMutationAccess('edit'),
  [
    body('stage').isIn(Object.keys(STAGE_CONFIG)).withMessage('Valid pipeline stage is required'),
    body('note').optional().trim(),
    body('lostReason').optional().trim(),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { stage, note = '', lostReason = '' } = req.body;

      const updatedDeal = await crmStore.transitionDealStage({
        dealId: req.params.id,
        orgId: req.user.orgId,
        newStage: stage,
        userId: req.user.id,
        userName: req.user.name,
        note,
        lostReason,
      });

      await logAudit(req, {
        action: 'STAGE_CHANGE',
        entityType: 'deal',
        entityId: updatedDeal.id,
        entityName: updatedDeal.title,
        details: { newStage: stage, amount: updatedDeal.amount, probability: updatedDeal.probability, lostReason },
      });

      res.json({
        success: true,
        message: `Deal moved to ${STAGE_CONFIG[stage]?.label || stage}`,
        deal: updatedDeal,
      });
    } catch (err) {
      res.status(400).json({ error: 'Transition Error', message: err.message });
    }
  }
);

// ── DELETE /api/deals/:id ────────────────────────────────────
router.delete('/:id', preloadDeal, checkMutationAccess('delete'), async (req, res, next) => {
  try {
    await logAudit(req, {
      action: 'DELETE',
      entityType: 'deal',
      entityId: req.params.id,
      entityName: req.targetRecord?.title || 'Deal',
      details: { amount: req.targetRecord?.amount, stage: req.targetRecord?.stage },
    });
    await crmStore.deleteDeal(req.params.id, req.user.orgId);
    res.json({ success: true, message: 'Deal deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
