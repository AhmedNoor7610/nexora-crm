// ── Nexora CRM — Deal MongoDB Model ────────────────────────────
import mongoose from 'mongoose';

export const STAGE_CONFIG = {
  qualification: { key: 'qualification', label: 'Qualification', probability: 20, color: '#38bdf8' },
  proposal:      { key: 'proposal',      label: 'Proposal / Demo', probability: 40, color: '#a78bfa' },
  negotiation:   { key: 'negotiation',   label: 'Negotiation',   probability: 70, color: '#f59e0b' },
  closing:       { key: 'closing',       label: 'Closing',       probability: 90, color: '#ec4899' },
  won:           { key: 'won',           label: 'Closed Won',    probability: 100, color: '#10b981' },
  lost:          { key: 'lost',          label: 'Closed Lost',   probability: 0,   color: '#f43f5e' },
};

const StageHistorySchema = new mongoose.Schema(
  {
    fromStage: { type: String, required: true },
    toStage: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String, required: true },
    changedByName: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const DealSchema = new mongoose.Schema(
  {
    orgId: {
      type: String,
      required: true,
      index: true,
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    ownerName: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      required: [true, 'Deal name is required'],
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Deal amount is required'],
      min: [0, 'Amount cannot be negative'],
      default: 0,
    },
    companyId: {
      type: String,
      default: null,
      index: true,
    },
    companyName: {
      type: String,
      default: '',
      trim: true,
    },
    contactId: {
      type: String,
      default: null,
      index: true,
    },
    contactName: {
      type: String,
      default: '',
      trim: true,
    },
    stage: {
      type: String,
      enum: ['qualification', 'proposal', 'negotiation', 'closing', 'won', 'lost'],
      default: 'qualification',
      index: true,
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 20,
    },
    expectedCloseDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days default
    },
    actualCloseDate: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    stageHistory: {
      type: [StageHistorySchema],
      default: [],
    },
    lostReason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    currency: {
      type: String,
      default: 'USD',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.weightedAmount = Math.round((ret.amount * ret.probability) / 100);
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for multi-tenant queries & pipeline performance
DealSchema.index({ orgId: 1, stage: 1 });
DealSchema.index({ orgId: 1, ownerId: 1 });
DealSchema.index({ orgId: 1, companyId: 1 });
DealSchema.index({ orgId: 1, expectedCloseDate: 1 });

export const Deal = mongoose.models.Deal || mongoose.model('Deal', DealSchema);
export default Deal;
