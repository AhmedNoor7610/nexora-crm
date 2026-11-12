// ── Nexora CRM — Companies Routes ────────────────────────────
import { Router } from 'express';
import { body, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth.js';
import { applyOwnershipScope, checkMutationAccess, handleValidationErrors, requireWriteAccess } from '../middleware/crmGuards.js';
import { crmStore, memoryCompanies, memoryContacts, memoryLeads } from '../db/crmStore.js';

const router = Router();
router.use(authMiddleware);

// Preload company for mutation access guards
async function preloadCompany(req, res, next) {
  try {
    const comp = await crmStore.getCompanyById(req.params.id, req.user.orgId);
    if (!comp) {
      return res.status(404).json({ error: 'Not Found', message: 'Company not found in this workspace' });
    }
    req.targetRecord = comp;
    next();
  } catch (err) {
    next(err);
  }
}

// ── GET /api/companies/stats ─────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const orgId = req.user.orgId;
    const data = await crmStore.getCompanies({ orgId, limit: 10000 });
    const all = data.items || [];
    const stats = {
      total: all.length,
      clients: all.filter(c => c.status === 'Active Client').length,
      prospects: all.filter(c => c.status === 'Prospect').length,
      totalPipelineValue: all.reduce((acc, c) => acc + (Number(c.dealsValue) || 0), 0),
    };
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/companies ───────────────────────────────────────
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
      const industry = req.query.industry || '';
      const size = req.query.size || '';
      const status = req.query.status || '';
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder || 'desc';

      const result = await crmStore.getCompanies({
        orgId: req.user.orgId,
        ownerId: req.ownershipFilter,
        search,
        industry,
        size,
        status,
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

// ── GET /api/companies/:id ───────────────────────────────────
router.get('/:id', preloadCompany, (req, res) => {
  const company = req.targetRecord;
  // Attach related contacts and leads
  const relatedContacts = Array.from(memoryContacts.values()).filter(
    c => c.orgId === req.user.orgId && (c.companyId === company.id || c.companyName?.toLowerCase() === company.name.toLowerCase())
  );
  const relatedLeads = Array.from(memoryLeads.values()).filter(
    l => l.orgId === req.user.orgId && l.company?.toLowerCase() === company.name.toLowerCase()
  );

  res.json({
    success: true,
    company: {
      ...company,
      contacts: relatedContacts,
      leads: relatedLeads,
    },
  });
});

// ── POST /api/companies ──────────────────────────────────────
router.post(
  '/',
  requireWriteAccess,
  [
    body('name').trim().notEmpty().withMessage('Company name is required'),
    body('domain').optional().trim(),
    body('industry').optional().trim(),
    body('size').optional().isIn(['1-10', '11-50', '51-200', '201-500', '500+']),
    body('status').optional().isIn(['Prospect', 'Active Client', 'Partner', 'Churned', 'Inactive']),
    body('annualRevenue').optional().isNumeric(),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const {
        name,
        domain = '',
        website = '',
        industry = 'Technology & SaaS',
        size = '11-50',
        annualRevenue = 0,
        phone = '',
        status = 'Prospect',
        address = {},
        description = '',
        tags = [],
        ownerId = null,
        ownerName = null,
      } = req.body;

      const compData = {
        orgId: req.user.orgId,
        ownerId: ownerId || req.user.id,
        ownerName: ownerName || req.user.name,
        name: name.trim(),
        domain: domain.trim().toLowerCase(),
        website: website.trim(),
        industry,
        size,
        annualRevenue: Number(annualRevenue) || 0,
        phone: phone.trim(),
        status,
        address: typeof address === 'object' ? address : {},
        description: description.trim(),
        tags: Array.isArray(tags) ? tags : [],
        contactsCount: 0,
        dealsValue: 0,
      };

      const newCompany = await crmStore.createCompany(compData);
      res.status(201).json({
        success: true,
        message: 'Company created successfully',
        company: newCompany,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/companies/:id ───────────────────────────────────
router.put(
  '/:id',
  preloadCompany,
  checkMutationAccess('edit'),
  [
    body('name').optional().trim().notEmpty().withMessage('Company name cannot be empty'),
    body('size').optional().isIn(['1-10', '11-50', '51-200', '201-500', '500+']),
    body('status').optional().isIn(['Prospect', 'Active Client', 'Partner', 'Churned', 'Inactive']),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const allowed = ['name', 'domain', 'website', 'industry', 'size', 'annualRevenue', 'phone', 'status', 'address', 'description', 'tags', 'ownerId', 'ownerName'];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      const updated = await crmStore.updateCompany(req.params.id, req.user.orgId, updates);
      res.json({
        success: true,
        message: 'Company updated successfully',
        company: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/companies/:id ────────────────────────────────
router.delete('/:id', preloadCompany, checkMutationAccess('delete'), async (req, res, next) => {
  try {
    await crmStore.deleteCompany(req.params.id, req.user.orgId);
    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
