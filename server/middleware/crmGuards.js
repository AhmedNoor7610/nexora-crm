// ── Nexora CRM — CRM Guards & Ownership Controls ─────────────
import { validationResult } from 'express-validator';
import { hasPermission } from '../db/store.js';

// ── Validation Error Dispatcher ──────────────────────────────
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
}

// ── Multi-Tenant Ownership Scope Guard ───────────────────────
// Restricts read queries based on user's RBAC role:
// - Owner/Admin/Manager: view:all -> can see all records in their organization
// - Sales Rep/Viewer: view:own -> only see records assigned to them (ownerId === user.id)
export function applyOwnershipScope(req, _res, next) {
  const user = req.user;
  if (!user) return next();

  // If user does not have 'view:all' permission, restrict ownerId
  if (!hasPermission(user.role, 'view:all')) {
    req.ownershipFilter = user.id;
  } else {
    // If a manager or admin specifically requested an owner filter via query param ?ownerId=...
    req.ownershipFilter = req.query.ownerId || null;
  }
  next();
}

// ── Require Write Access Guard (Rejects Read-Only Viewers) ────
export function requireWriteAccess(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
  }

  if (user.role === 'viewer') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Viewers have read-only access and cannot create or modify records.',
    });
  }
  next();
}

// ── Record Mutation Ownership Guard ──────────────────────────
// Ensures users cannot edit/delete records owned by others unless they have elevated permissions
export function checkMutationAccess(action = 'edit') {
  return (req, res, next) => {
    const user = req.user;
    const record = req.targetRecord;

    if (!user || !record) {
      return res.status(404).json({ error: 'Not Found', message: 'Record not found' });
    }

    // Verify multi-tenant isolation
    if (record.orgId !== user.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied: Organization mismatch' });
    }

    // Viewers are strictly read-only
    if (user.role === 'viewer') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Viewers have read-only access and cannot modify records.',
      });
    }

    // Owner always has full access
    if (user.role === 'owner') return next();

    if (action === 'edit') {
      const canEditAll = hasPermission(user.role, 'edit:all');
      const canEditOwn = hasPermission(user.role, 'edit:own');
      const isOwner = record.ownerId === user.id;
      if (canEditAll || (canEditOwn && isOwner)) return next();

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Permission denied: You can only edit records assigned to you.',
      });
    }

    if (action === 'delete') {
      const canDeleteAll = hasPermission(user.role, 'delete:all');
      const canDeleteOwn = hasPermission(user.role, 'delete:own');
      const isOwner = record.ownerId === user.id;

      if (canDeleteAll || (canDeleteOwn && isOwner)) return next();

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Permission denied: Insufficient privileges to delete this record.',
      });
    }

    next();
  };
}
