// ── Nexora CRM — Leads Routes & Safe Conversion ──────────────
import { Router } from 'express';
import { body, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth.js';
import { applyOwnershipScope, checkMutationAccess, handleValidationErrors, requireWriteAccess } from '../middleware/crmGuards.js';
import { crmStore, memoryLeads } from '../db/crmStore.js';

const router = Router();
router.use(authMiddleware);

// Middleware to preload target lead for mutation guards
async function preloadLead(req, res, next) {
  try {
    const lead = await crmStore.getLeadById(req.params.id, req.user.orgId);
    if (!lead) {
      return res.status(404).json({ error: 'Not Found', message: 'Lead not found in this workspace' });
    }
    req.targetRecord = lead;
    next();
  } catch (err) {
    next(err);
  }
}

// ── GET /api/leads/stats ─────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const orgId = req.user.orgId;
    const data = await crmStore.getLeads({ orgId, limit: 10000 });
    const all = data.items || [];
    const stats = {
      total: all.length,
      new: all.filter(l => l.status === 'New').length,
      contacted: all.filter(l => l.status === 'Contacted').length,
      qualified: all.filter(l => l.status === 'Qualified').length,
      converted: all.filter(l => l.status === 'Converted').length,
      pipelineValue: all.reduce((acc, l) => acc + (Number(l.value) || 0), 0),
    };
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/leads ───────────────────────────────────────────
router.get(
  '/',
  applyOwnershipScope,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || req.query.q || '';
      const status = req.query.status || '';
      const source = req.query.source || '';
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder || 'desc';

      const result = await crmStore.getLeads({
        orgId: req.user.orgId,
        ownerId: req.ownershipFilter,
        search,
        status,
        source,
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

// ── GET /api/leads/:id ───────────────────────────────────────
router.get('/:id', preloadLead, (req, res) => {
  res.json({ success: true, lead: req.targetRecord });
});

// ── POST /api/leads ──────────────────────────────────────────
router.post(
  '/',
  requireWriteAccess,
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('company').trim().notEmpty().withMessage('Company name is required'),
    body('status').optional().isIn(['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted']),
    body('source').optional().isIn(['Website', 'Referral', 'LinkedIn', 'Cold Outreach', 'Inbound', 'Webinar', 'Event', 'Partner', 'Other']),
    body('value').optional().isNumeric().withMessage('Value must be a numeric deal amount'),
    body('score').optional().isInt({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100'),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone = '',
        company,
        title = '',
        source = 'Website',
        status = 'New',
        value = 0,
        score = 50,
        notes = '',
        tags = [],
        ownerId = null,
        ownerName = null,
      } = req.body;

      const leadData = {
        orgId: req.user.orgId,
        ownerId: ownerId || req.user.id,
        ownerName: ownerName || req.user.name,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        company: company.trim(),
        title: title.trim(),
        source,
        status,
        value: Number(value) || 0,
        score: Number(score) || 50,
        notes: notes.trim(),
        tags: Array.isArray(tags) ? tags : [],
      };

      const newLead = await crmStore.createLead(leadData);
      res.status(201).json({
        success: true,
        message: 'Lead created successfully',
        lead: newLead,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/leads/:id ───────────────────────────────────────
router.put(
  '/:id',
  preloadLead,
  checkMutationAccess('edit'),
  [
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('company').optional().trim().notEmpty().withMessage('Company name cannot be empty'),
    body('status').optional().isIn(['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted']),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const allowed = ['firstName', 'lastName', 'email', 'phone', 'company', 'title', 'source', 'status', 'value', 'score', 'notes', 'tags', 'ownerId', 'ownerName'];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      const updated = await crmStore.updateLead(req.params.id, req.user.orgId, updates);
      res.json({
        success: true,
        message: 'Lead updated successfully',
        lead: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/leads/:id ────────────────────────────────────
router.delete('/:id', preloadLead, checkMutationAccess('delete'), async (req, res, next) => {
  try {
    await crmStore.deleteLead(req.params.id, req.user.orgId);
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/leads/:id/convert (SAFE LEAD CONVERSION) ───────
router.post(
  '/:id/convert',
  preloadLead,
  checkMutationAccess('edit'),
  [
    body('dealAmount').optional().isNumeric().withMessage('Deal amount must be a number'),
    body('dealName').optional().trim(),
    body('companyName').optional().trim(),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { companyId, companyName, dealName, dealAmount } = req.body;

      const result = await crmStore.convertLead({
        leadId: req.params.id,
        orgId: req.user.orgId,
        userId: req.user.id,
        userName: req.user.name,
        companyId: companyId || null,
        companyName: companyName || '',
        dealName: dealName || '',
        dealAmount: dealAmount || 0,
      });

      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ error: 'Conversion Error', message: err.message });
    }
  }
);

export default router;
