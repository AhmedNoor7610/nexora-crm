// ── Nexora CRM — Audit Log Model ──────────────────────────────
import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    orgId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      default: 'System',
    },
    userRole: {
      type: String,
      default: 'user',
    },
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE',
        'UPDATE',
        'DELETE',
        'STAGE_CHANGE',
        'VALUE_CHANGE',
        'ROLE_CHANGE',
        'STATUS_CHANGE',
        'LEAD_CONVERTED',
        'PASSWORD_RESET',
        'INVITATION_ACCEPTED',
        'ATTACHMENT_UPLOADED',
        'ATTACHMENT_DELETED',
        'EMAIL_SENT',
      ],
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ['deal', 'lead', 'contact', 'company', 'user', 'activity', 'attachment', 'email', 'auth'],
      index: true,
    },
    entityId: {
      type: String,
      index: true,
    },
    entityName: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

AuditLogSchema.index({ orgId: 1, createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;

