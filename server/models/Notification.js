// ── Nexora CRM — Notification MongoDB Model ───────────────────
import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = [
  'task_reminder',
  'task_assigned',
  'deal_won',
  'deal_stage',
  'lead_assigned',
  'activity_due',
  'system',
];

const NotificationSchema = new mongoose.Schema(
  {
    orgId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      default: null, // null indicates org-wide notification
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: 'system',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    link: {
      type: String,
      default: '',
    },
    entityType: {
      type: String,
      default: 'none',
    },
    entityId: {
      type: String,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

NotificationSchema.index({ orgId: 1, userId: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
