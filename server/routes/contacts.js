// ── Nexora CRM — Contacts Routes ─────────────────────────────
import { Router } from 'express';
import { body, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth.js';
import { applyOwnershipScope, checkMutationAccess, handleValidationErrors, requireWriteAccess } from '../middleware/crmGuards.js';
import { crmStore, memoryContacts } from '../db/crmStore.js';

const router = Router();
router.use(authMiddleware);

// Preload target contact for mutation access guards
async function preloadContact(req, res, next) {
  try {
    const contact = await crmStore.getContactById(req.params.id, req.user.orgId);
    if (!contact) {
      return res.status(404).json({ error: 'Not Found', message: 'Contact not found in this workspace' });
    }
    req.targetRecord = contact;
    next();
  } catch (err) {
    next(err);
  }
}

// ── GET /api/contacts/stats ──────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const orgId = req.user.orgId;
    const data = await crmStore.getContacts({ orgId, limit: 10000 });
    const all = data.items || [];
    const stats = {
      total: all.length,
      customers: all.filter(c => c.lifecycleStage === 'Customer' || c.status === 'Customer').length,
      opportunities: all.filter(c => c.lifecycleStage === 'Opportunity').length,
      leads: all.filter(c => c.lifecycleStage === 'Lead' || c.lifecycleStage === 'MQL' || c.lifecycleStage === 'SQL').length,
    };
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/contacts ────────────────────────────────────────
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
      const lifecycleStage = req.query.lifecycleStage || '';
      const companyId = req.query.companyId || '';
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder || 'desc';

      const result = await crmStore.getContacts({
        orgId: req.user.orgId,
        ownerId: req.ownershipFilter,
        search,
        status,
        lifecycleStage,
        companyId,
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

// ── GET /api/contacts/:id ────────────────────────────────────
router.get('/:id', preloadContact, (req, res) => {
  res.json({ success: true, contact: req.targetRecord });
});

// ── POST /api/contacts ───────────────────────────────────────
router.post(
  '/',
  requireWriteAccess,
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('lifecycleStage').optional().isIn(['Subscriber', 'Lead', 'MQL', 'SQL', 'Opportunity', 'Customer', 'Evangelist']),
    body('status').optional().isIn(['Active', 'Inactive', 'Lead', 'Customer']),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone = '',
        companyId = null,
        companyName = '',
        title = '',
        department = 'General',
        status = 'Active',
        lifecycleStage = 'Lead',
        leadSource = 'Direct',
        notes = '',
        tags = [],
        address = {},
        ownerId = null,
        ownerName = null,
      } = req.body;

      // If companyName given without companyId, associate or find
      let resolvedCompanyId = companyId;
      let resolvedCompanyName = companyName;

      if (!resolvedCompanyId && companyName) {
        const comp = await crmStore.findOrCreateCompany(req.user.orgId, companyName, req.user.id, req.user.name);
        resolvedCompanyId = comp.id;
        resolvedCompanyName = comp.name;
      }

      const contactData = {
        orgId: req.user.orgId,
        ownerId: ownerId || req.user.id,
        ownerName: ownerName || req.user.name,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        companyId: resolvedCompanyId,
        companyName: resolvedCompanyName.trim(),
        title: title.trim(),
        department: department.trim(),
        status,
        lifecycleStage,
        leadSource,
        notes: notes.trim(),
        tags: Array.isArray(tags) ? tags : [],
        address: typeof address === 'object' ? address : {},
      };

      const newContact = await crmStore.createContact(contactData);

      // Increment company contactsCount if linked
      if (resolvedCompanyId) {
        const comp = await crmStore.getCompanyById(resolvedCompanyId, req.user.orgId);
        if (comp) {
          await crmStore.updateCompany(resolvedCompanyId, req.user.orgId, {
            contactsCount: (comp.contactsCount || 0) + 1,
          });
        }
      }

      res.status(201).json({
        success: true,
        message: 'Contact created successfully',
        contact: newContact,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/contacts/:id ────────────────────────────────────
router.put(
  '/:id',
  preloadContact,
  checkMutationAccess('edit'),
  [
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('lifecycleStage').optional().isIn(['Subscriber', 'Lead', 'MQL', 'SQL', 'Opportunity', 'Customer', 'Evangelist']),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const allowed = ['firstName', 'lastName', 'email', 'phone', 'companyId', 'companyName', 'title', 'department', 'status', 'lifecycleStage', 'leadSource', 'notes', 'tags', 'address', 'ownerId', 'ownerName'];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      const updated = await crmStore.updateContact(req.params.id, req.user.orgId, updates);
      res.json({
        success: true,
        message: 'Contact updated successfully',
        contact: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/contacts/:id ─────────────────────────────────
router.delete('/:id', preloadContact, checkMutationAccess('delete'), async (req, res, next) => {
  try {
    await crmStore.deleteContact(req.params.id, req.user.orgId);
    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
