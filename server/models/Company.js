// ── Nexora CRM — Company MongoDB Model ────────────────────────
import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema(
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
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
    },
    website: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      enum: [
        'Technology & SaaS',
        'Financial Services',
        'Healthcare & Life Sciences',
        'Manufacturing & Logistics',
        'Professional Services',
        'E-Commerce & Retail',
        'Media & Entertainment',
        'Energy & Utilities',
        'Other',
      ],
      default: 'Technology & SaaS',
    },
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
      default: '11-50',
    },
    annualRevenue: {
      type: Number,
      default: 0,
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Prospect', 'Active Client', 'Partner', 'Churned', 'Inactive'],
      default: 'Prospect',
      index: true,
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: 'United States' },
    },
    description: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    contactsCount: {
      type: Number,
      default: 0,
    },
    dealsValue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for multi-tenant queries & search
CompanySchema.index({ orgId: 1, name: 1 });
CompanySchema.index({ orgId: 1, industry: 1 });
CompanySchema.index({ orgId: 1, status: 1 });
CompanySchema.index({ orgId: 1, ownerId: 1 });

export const Company = mongoose.models.Company || mongoose.model('Company', CompanySchema);
export default Company;
