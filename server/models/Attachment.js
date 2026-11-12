// ── Nexora CRM — Document & Attachment Model ──────────────────
import mongoose from 'mongoose';

const AttachmentSchema = new mongoose.Schema(
  {
    orgId: {
      type: String,
      required: true,
      index: true,
    },
    uploadedBy: {
      userId: { type: String, required: true },
      name: { type: String, default: '' },
      role: { type: String, default: 'user' },
    },
    entityType: {
      type: String,
      required: true,
      enum: ['lead', 'contact', 'company', 'deal'],
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      default: '',
    },
    fileData: {
      type: String, // Base64 or content storage for dual-mode persistence
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

AttachmentSchema.index({ orgId: 1, entityType: 1, entityId: 1 });

export const Attachment = mongoose.models.Attachment || mongoose.model('Attachment', AttachmentSchema);
export default Attachment;

