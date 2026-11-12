// ── Nexora CRM — Email Integration & Communications Routes ─────
import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware, requireOrgScope } from '../middleware/auth.js';
import { handleValidationErrors, requireWriteAccess } from '../middleware/crmGuards.js';
import { crmStore } from '../db/crmStore.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();
router.use(authMiddleware, requireOrgScope);

// Pre-configured email templates
const EMAIL_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Introduction & Welcome',
    subject: 'Welcome to {{company}} — Next steps with Nexora',
    body: 'Hi {{name}},\n\nThank you for connecting with us! I am reaching out to introduce myself and learn more about your goals at {{company}}.\n\nWhen would be a good time for a brief 10-minute discovery chat this week?\n\nBest regards,\n{{senderName}}',
  },
  {
    id: 'followup_proposal',
    name: 'Proposal Follow-up',
    subject: 'Following up on our proposal for {{company}}',
    body: 'Hi {{name}},\n\nI hope your week is off to a great start. I wanted to follow up on the proposal we shared for {{dealTitle}}.\n\nHave you had a chance to review the details with your team? Let me know if you have any questions.\n\nWarm regards,\n{{senderName}}',
  },
  {
    id: 'meeting_recap',
    name: 'Meeting Recap & Action Items',
    subject: 'Recap: Our meeting today regarding {{company}}',
    body: 'Hi {{name}},\n\nThank you for your time today! Here is a summary of our discussion:\n\n- Reviewed primary operational priorities\n- Outlined expected deployment milestones\n\nNext Steps: We will follow up with technical documentation by Friday.\n\nBest,\n{{senderName}}',
  },
  {
    id: 'demo_invite',
    name: 'Live Demo Invitation',
    subject: 'Exclusive Demo: See Nexora in action for {{company}}',
    body: 'Hi {{name}},\n\nI would love to give you a personalized walkthrough of how our pipeline automation can accelerate revenue growth for {{company}}.\n\nAre you available for a 20-minute demo on Thursday?\n\nCheers,\n{{senderName}}',
  },
];

// Helper: replace {{placeholders}}
function interpolate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

// ── GET /api/emails/templates ─────────────────────────────────
router.get('/templates', (_req, res) => {
  res.json({
    success: true,
    templates: EMAIL_TEMPLATES,
  });
});

// ── GET /api/emails ───────────────────────────────────────────
// List email communications scoped to org and optional entity
router.get('/', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const { entityType, entityId, limit = 50, page = 1 } = req.query;

    const result = await crmStore.getEmails({
      orgId,
      entityType,
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

// ── GET /api/emails/:id ───────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const email = await crmStore.getEmailById(req.params.id, req.user.orgId);
    if (!email) {
      return res.status(404).json({ error: 'Not Found', message: 'Email communication not found' });
    }
    res.json({ success: true, email });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/emails/send ─────────────────────────────────────
// Send email from profile, record history, and auto-log CRM activity
router.post(
  '/send',
  requireWriteAccess,
  [
    body('recipientEmail').isEmail().normalizeEmail().withMessage('Valid recipient email address is required'),
    body('subject').trim().isLength({ min: 1, max: 200 }).withMessage('Email subject is required'),
    body('body').trim().isLength({ min: 1 }).withMessage('Email body content is required'),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const {
        recipientEmail,
        recipientName = '',
        entityType = 'lead',
        entityId = '',
        entityName = '',
        subject,
        body: rawBody,
        templateId = null,
        company = '',
        dealTitle = '',
      } = req.body;

      const caller = req.user;

      // Variable interpolation
      const vars = {
        name: recipientName || 'there',
        company: company || entityName || 'your team',
        dealTitle: dealTitle || 'your project',
        senderName: caller.name || 'Nexora Team',
        senderCompany: caller.organization?.name || 'Nexora CRM',
      };

      const finalSubject = interpolate(subject, vars);
      const finalBody = interpolate(rawBody, vars);

      // Simulation/SMTP transmission handling
      const isFailed = recipientEmail.includes('fail@example.com') || recipientEmail.includes('bounce@test.io');
      const status = isFailed ? 'failed' : 'sent';
      const failureReason = isFailed ? 'Recipient inbox rejected delivery (Simulated bounce/test condition)' : null;

      // 1. Store Email Record
      const emailRecord = await crmStore.createEmail({
        orgId: caller.orgId,
        senderId: caller.id,
        senderName: caller.name,
        senderEmail: caller.email,
        recipientEmail,
        recipientName,
        entityType,
        entityId,
        entityName,
        subject: finalSubject,
        body: finalBody,
        templateId,
        status,
        failureReason,
        sentAt: new Date().toISOString(),
      });

      // 2. Connect with CRM Activities Timeline (if successful)
      if (status === 'sent') {
        await crmStore.createActivity({
          orgId: caller.orgId,
          title: `Email: ${finalSubject}`,
          type: 'email',
          status: 'completed',
          priority: 'medium',
          entityType: entityType || 'lead',
          entityId: entityId ? String(entityId) : '',
          assignedTo: caller.id,
          assignedToName: caller.name,
          notes: `Sent to: ${recipientEmail}\n\n${finalBody.slice(0, 300)}${finalBody.length > 300 ? '...' : ''}`,
          completedAt: new Date().toISOString(),
        });
      }

      // 3. Record Audit Log
      await logAudit(req, {
        action: 'EMAIL_SENT',
        entityType: 'email',
        entityId: emailRecord.id,
        entityName: finalSubject,
        details: { recipientEmail, entityType, entityId, status, templateId },
      });

      res.status(isFailed ? 422 : 201).json({
        success: !isFailed,
        message: isFailed ? `Email failed: ${failureReason}` : 'Email dispatched and recorded to customer activity timeline.',
        email: emailRecord,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

