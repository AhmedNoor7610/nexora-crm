// ── Nexora CRM — Lead MongoDB Model ───────────────────────────
import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema(
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
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: [
        'Website',
        'Referral',
        'LinkedIn',
        'Cold Outreach',
        'Inbound',
        'Webinar',
        'Event',
        'Partner',
        'Other',
      ],
      default: 'Website',
      index: true,
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted'],
      default: 'New',
      index: true,
    },
    value: {
      type: Number,
      default: 0, // Estimated deal value in USD
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    notes: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    converted: {
      type: Boolean,
      default: false,
      index: true,
    },
    conversion: {
      convertedAt: { type: Date, default: null },
      convertedBy: { type: String, default: null },
      convertedByName: { type: String, default: null },
      contactId: { type: String, default: null },
      companyId: { type: String, default: null },
      dealId: { type: String, default: null },
      dealName: { type: String, default: null },
      dealAmount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.fullName = `${ret.firstName || ''} ${ret.lastName || ''}`.trim();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual for full name
LeadSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Compound indexes for multi-tenant queries & search
LeadSchema.index({ orgId: 1, status: 1 });
LeadSchema.index({ orgId: 1, source: 1 });
LeadSchema.index({ orgId: 1, ownerId: 1 });
LeadSchema.index({ orgId: 1, converted: 1 });

export const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
export default Lead;
