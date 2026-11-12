// ── Nexora CRM — Activity & Task MongoDB Model ───────────────
import mongoose from 'mongoose';

export const ACTIVITY_TYPES = ['task', 'call', 'meeting', 'email', 'note', 'reminder'];
export const ACTIVITY_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
export const ACTIVITY_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const ENTITY_TYPES = ['lead', 'contact', 'company', 'deal', 'none'];

const ActivitySchema = new mongoose.Schema(
  {
    orgId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ACTIVITY_TYPES,
      default: 'task',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ACTIVITY_STATUSES,
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ACTIVITY_PRIORITIES,
      default: 'medium',
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    reminderDate: {
      type: Date,
      default: null,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    entityType: {
      type: String,
      enum: ENTITY_TYPES,
      default: 'none',
      index: true,
    },
    entityId: {
      type: String,
      default: null,
      index: true,
    },
    entityName: {
      type: String,
      default: '',
    },
    assignedTo: {
      type: String,
      required: true,
      index: true,
    },
    assignedToName: {
      type: String,
      default: '',
    },
    creatorId: {
      type: String,
      required: true,
    },
    creatorName: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    completedBy: {
      type: String,
      default: null,
    },
    completedByName: {
      type: String,
      default: '',
    },
    outcome: {
      type: String,
      default: '',
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

ActivitySchema.index({ orgId: 1, status: 1, dueDate: 1 });
ActivitySchema.index({ orgId: 1, assignedTo: 1, status: 1 });
ActivitySchema.index({ orgId: 1, entityType: 1, entityId: 1 });

export const Activity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
