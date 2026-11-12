// ── Nexora CRM — Notifications API Routes ────────────────────
import express from 'express';
import { crmStore } from '../db/crmStore.js';
import { authMiddleware, requireOrgScope } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requireOrgScope);

// ── GET /api/notifications ───────────────────────────────────
// Organization- and user-scoped!
router.get('/', async (req, res, next) => {
  try {
    const { limit = 30, unreadOnly } = req.query;
    const result = await crmStore.getNotifications(req.user.orgId, req.user.id, {
      limit: Number(limit),
      unreadOnly: unreadOnly === 'true' || unreadOnly === true,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/notifications/count ─────────────────────────────
router.get('/count', async (req, res, next) => {
  try {
    const unreadCount = await crmStore.getUnreadNotificationsCount(req.user.orgId, req.user.id);
    res.json({ unreadCount });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/notifications/:id/read ────────────────────────
router.patch('/:id/read', async (req, res, next) => {
  try {
    const updated = await crmStore.markNotificationRead(req.params.id, req.user.orgId, req.user.id);
    if (!updated) {
      return res.status(404).json({ error: 'Not Found', message: 'Notification not found or access denied' });
    }
    const unreadCount = await crmStore.getUnreadNotificationsCount(req.user.orgId, req.user.id);
    res.json({ notification: updated, unreadCount });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/notifications/read-all ────────────────────────
router.patch('/read-all', async (req, res, next) => {
  try {
    await crmStore.markAllNotificationsRead(req.user.orgId, req.user.id);
    res.json({ message: 'All notifications marked as read', unreadCount: 0 });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/notifications/:id ────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await crmStore.deleteNotification(req.params.id, req.user.orgId, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: 'Notification not found or access denied' });
    }
    const unreadCount = await crmStore.getUnreadNotificationsCount(req.user.orgId, req.user.id);
    res.json({ message: 'Notification deleted', unreadCount });
  } catch (err) {
    next(err);
  }
});

export default router;
