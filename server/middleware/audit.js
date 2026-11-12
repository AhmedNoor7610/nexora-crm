// ── Nexora CRM — Centralized Audit Logger ─────────────────────
import { crmStore } from '../db/crmStore.js';

export async function logAudit(req, { action, entityType, entityId, entityName, details }) {
  try {
    const user = req?.user || {};
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';

    return await crmStore.createAuditLog({
      orgId: user.orgId || 'org-001',
      userId: user.id || 'system',
      userName: user.name || 'System User',
      userRole: user.role || 'user',
      action,
      entityType,
      entityId,
      entityName,
      details: details || {},
      ipAddress: ip,
    });
  } catch (err) {
    console.error('Audit logging error:', err.message);
    return null;
  }
}

