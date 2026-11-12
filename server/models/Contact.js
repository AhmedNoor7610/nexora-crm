// ── Nexora CRM — Contact MongoDB Model ────────────────────────
import mongoose from 'mongoose';

const ContactSchema = new mongoose.Schema(
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
    title: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: String,
      trim: true,
      default: 'General',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Lead', 'Customer'],
      default: 'Active',
      index: true,
    },
    lifecycleStage: {
      type: String,
      enum: ['Subscriber', 'Lead', 'MQL', 'SQL', 'Opportunity', 'Customer', 'Evangelist'],
      default: 'Lead',
      index: true,
    },
    leadSource: {
      type: String,
      default: 'Direct',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: 'United States' },
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
    lastContactedAt: {
      type: Date,
      default: null,
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
ContactSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Compound indexes for multi-tenant queries & search
ContactSchema.index({ orgId: 1, email: 1 });
ContactSchema.index({ orgId: 1, companyId: 1 });
ContactSchema.index({ orgId: 1, lifecycleStage: 1 });
ContactSchema.index({ orgId: 1, ownerId: 1 });

export const Contact = mongoose.models.Contact || mongoose.model('Contact', ContactSchema);
export default Contact;
