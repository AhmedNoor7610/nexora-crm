// ── Nexora CRM — Email Communication Model ────────────────────
import mongoose from 'mongoose';

const EmailSchema = new mongoose.Schema(
  {
    orgId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      default: '',
    },
    senderEmail: {
      type: String,
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      index: true,
    },
    recipientName: {
      type: String,
      default: '',
    },
    entityType: {
      type: String,
      enum: ['lead', 'contact', 'deal', 'general'],
      default: 'lead',
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
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    templateId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'delivered', 'failed'],
      default: 'sent',
      index: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

EmailSchema.index({ orgId: 1, createdAt: -1 });

export const Email = mongoose.models.Email || mongoose.model('Email', EmailSchema);
export default Email;

