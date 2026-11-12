// ── Nexora CRM — Document & Attachment Management Routes ──────
import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware, requireOrgScope } from '../middleware/auth.js';
import { handleValidationErrors, requireWriteAccess } from '../middleware/crmGuards.js';
import { crmStore } from '../db/crmStore.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authMiddleware, requireOrgScope);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg', '.txt', '.zip'];

// ── GET /api/attachments ──────────────────────────────────────
// Query attachments by entityType and entityId
router.get('/', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const { entityType, entityId } = req.query;

    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'Bad Request', message: 'entityType and entityId query parameters are required' });
    }

    const attachments = await crmStore.getAttachments({
      orgId,
      entityType,
      entityId,
    });

    res.json({
      success: true,
      attachments,
      count: attachments.length,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/attachments/:id/download ─────────────────────────
// Secure download with organization authorization
router.get('/:id/download', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const attachment = await crmStore.getAttachmentById(req.params.id, orgId);

    if (!attachment) {
      return res.status(404).json({ error: 'Not Found', message: 'Attachment not found or access denied.' });
    }

    const buffer = Buffer.from(attachment.fileData || '', 'base64');
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/attachments/upload ──────────────────────────────
// Secure document upload attached to CRM entities
router.post(
  '/upload',
  requireWriteAccess,
  [
    body('entityType').isIn(['lead', 'contact', 'company', 'deal']).withMessage('Valid entityType required (lead, contact, company, deal)'),
    body('entityId').notEmpty().withMessage('entityId is required'),
    body('fileName').trim().isLength({ min: 1, max: 255 }).withMessage('Valid fileName is required'),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { entityType, entityId, fileName, fileSize = 0, mimeType = 'application/octet-stream', fileData = '' } = req.body;
      const caller = req.user;

      // Validate extension
      const ext = ('.' + fileName.split('.').pop()).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return res.status(400).json({
          error: 'Unsupported File Type',
          message: `File format '${ext}' is not permitted. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
        });
      }

      // Validate size
      if (fileSize > MAX_FILE_SIZE) {
        return res.status(400).json({
          error: 'File Too Large',
          message: `File size exceeds the 10MB limit (provided: ${(fileSize / (1024 * 1024)).toFixed(2)}MB)`,
        });
      }

      // Create attachment
      const newAttachment = await crmStore.createAttachment({
        orgId: caller.orgId,
        uploadedBy: {
          userId: caller.id,
          name: caller.name,
          role: caller.role,
        },
        entityType,
        entityId: String(entityId),
        fileName,
        fileSize: Number(fileSize),
        mimeType,
        fileData: fileData || Buffer.from('Simulated content for ' + fileName).toString('base64'),
      });

      // Connect with CRM Activities timeline
      await crmStore.createActivity({
        orgId: caller.orgId,
        title: `Attached file: ${fileName}`,
        type: 'note',
        status: 'completed',
        priority: 'low',
        entityType,
        entityId: String(entityId),
        assignedTo: caller.id,
        assignedToName: caller.name,
        notes: `Uploaded attachment: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)`,
        completedAt: new Date().toISOString(),
      });

      // Audit Log
      await logAudit(req, {
        action: 'ATTACHMENT_UPLOADED',
        entityType: 'attachment',
        entityId: newAttachment.id,
        entityName: fileName,
        details: { entityType, entityId, fileSize, mimeType },
      });

      const { fileData: _, ...safeAttachment } = newAttachment;

      res.status(201).json({
        success: true,
        message: `Attachment '${fileName}' uploaded successfully.`,
        attachment: safeAttachment,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/attachments/:id ───────────────────────────────
// Delete attachment with role authorization check
router.delete('/:id', requireWriteAccess, async (req, res, next) => {
  try {
    const { orgId, role, id: callerId } = req.user;
    const attachment = await crmStore.getAttachmentById(req.params.id, orgId);

    if (!attachment) {
      return res.status(404).json({ error: 'Not Found', message: 'Attachment not found.' });
    }

    // Reps can only delete their own attachments; managers/owners can delete any
    if (role === 'rep' && attachment.uploadedBy?.userId !== callerId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You can only delete attachments that you uploaded.' });
    }

    await crmStore.deleteAttachment(req.params.id, orgId);

    await logAudit(req, {
      action: 'ATTACHMENT_DELETED',
      entityType: 'attachment',
      entityId: req.params.id,
      entityName: attachment.fileName,
      details: { entityType: attachment.entityType, entityId: attachment.entityId },
    });

    res.json({ success: true, message: `Attachment '${attachment.fileName}' deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

export default router;

