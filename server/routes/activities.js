// ── Nexora CRM — Activities & Tasks Routes ───────────────────
import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { crmStore } from '../db/crmStore.js';
import { authMiddleware, requireOrgScope } from '../middleware/auth.js';
import { emitNotification, emitActivityEvent } from '../socket.js';
import { findUserById } from '../db/store.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requireOrgScope);

// ── GET /api/activities/timeline ─────────────────────────────
router.get('/timeline', async (req, res, next) => {
  try {
    const { entityType, entityId, limit } = req.query;
    const timeline = await crmStore.getActivityTimeline(req.user.orgId, {
      entityType,
      entityId,
      limit: limit ? Number(limit) : 40,
    });
    res.json({ timeline });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/activities ──────────────────────────────────────
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation Error', errors: errors.array() });
      }

      const {
        entityType,
        entityId,
        type,
        status,
        priority,
        assignedTo,
        search,
        page = 1,
        limit = 20,
        sortBy = 'dueDate',
        sortOrder = 'asc',
      } = req.query;

      // Role check: sales reps default to their own tasks unless specified
      let effectiveAssignedTo = assignedTo;
      if (req.user.role === 'rep' && !assignedTo) {
        effectiveAssignedTo = req.user.id;
      }

      const result = await crmStore.getActivities({
        orgId: req.user.orgId,
        entityType,
        entityId,
        type,
        status,
        priority,
        assignedTo: effectiveAssignedTo,
        search,
        page: Number(page),
        limit: Number(limit),
        sortBy,
        sortOrder,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/activities/:id ──────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const activity = await crmStore.getActivityById(req.params.id, req.user.orgId);
    if (!activity) {
      return res.status(404).json({ error: 'Not Found', message: 'Activity not found' });
    }
    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/activities ─────────────────────────────────────
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Activity title is required'),
    body('type').optional().isIn(['task', 'call', 'meeting', 'email', 'note', 'reminder']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  ],
  async (req, res, next) => {
    try {
      if (req.user.role === 'viewer') {
        return res.status(403).json({ error: 'Forbidden', message: 'Viewers have read-only access and cannot create activities.' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation Error', errors: errors.array() });
      }

      const assignedToId = req.body.assignedTo || req.user.id;
      let assignedToName = req.body.assignedToName || req.user.name;

      if (assignedToId !== req.user.id && !req.body.assignedToName) {
        const assignee = findUserById(assignedToId);
        if (assignee) assignedToName = assignee.name;
      }

      const activityData = {
        ...req.body,
        orgId: req.user.orgId,
        assignedTo: assignedToId,
        assignedToName,
        creatorId: req.user.id,
        creatorName: req.user.name,
      };

      const newActivity = await crmStore.createActivity(activityData);

      // Real-time broadcast to organization
      emitActivityEvent(req.user.orgId, 'activity:created', newActivity);

      // If assigned to another user, create a notification & send real-time alert
      if (assignedToId !== req.user.id) {
        const notif = await crmStore.createNotification({
          orgId: req.user.orgId,
          userId: assignedToId,
          type: 'task_assigned',
          title: `New ${newActivity.type.toUpperCase()} Assigned`,
          message: `${req.user.name} assigned you: "${newActivity.title}"`,
          link: '#/tasks',
          entityType: newActivity.type,
          entityId: newActivity.id,
        });
        emitNotification(notif);
      }

      res.status(201).json({
        message: 'Activity created successfully',
        activity: newActivity,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/activities/:id ──────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Forbidden', message: 'Viewers have read-only access and cannot modify activities.' });
    }

    const existing = await crmStore.getActivityById(req.params.id, req.user.orgId);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Activity not found' });
    }

    // Authorization: Reps can only edit own assigned or created activities
    if (req.user.role === 'rep' && existing.assignedTo !== req.user.id && existing.creatorId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only modify activities assigned to or created by you.',
      });
    }

    const updated = await crmStore.updateActivity(req.params.id, req.user.orgId, req.body);
    emitActivityEvent(req.user.orgId, 'activity:updated', updated);

    res.json({
      message: 'Activity updated successfully',
      activity: updated,
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/activities/:id/complete ───────────────────────
router.patch('/:id/complete', async (req, res, next) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Forbidden', message: 'Viewers have read-only access and cannot complete activities.' });
    }

    const existing = await crmStore.getActivityById(req.params.id, req.user.orgId);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Activity not found' });
    }

    // Authorization: Reps can only complete own assigned or created activities
    if (req.user.role === 'rep' && existing.assignedTo !== req.user.id && existing.creatorId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update completion status for your assigned activities.',
      });
    }

    const updated = await crmStore.completeActivity(
      req.params.id,
      req.user.orgId,
      req.user.id,
      req.user.name
    );

    emitActivityEvent(req.user.orgId, 'task:completed', updated);

    res.json({
      message: `Activity marked as ${updated.status}`,
      activity: updated,
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/activities/:id ───────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    if (req.user.role === 'viewer') {
      return res.status(403).json({ error: 'Forbidden', message: 'Viewers have read-only access and cannot delete activities.' });
    }

    const existing = await crmStore.getActivityById(req.params.id, req.user.orgId);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Activity not found' });
    }

    // Authorization check
    if (
      req.user.role === 'rep' &&
      existing.creatorId !== req.user.id &&
      existing.assignedTo !== req.user.id
    ) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete activities created by or assigned to you.',
      });
    }

    await crmStore.deleteActivity(req.params.id, req.user.orgId);
    emitActivityEvent(req.user.orgId, 'activity:deleted', { id: req.params.id });

    res.json({ message: 'Activity deleted successfully', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

export default router;
