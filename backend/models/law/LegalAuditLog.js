const mongoose = require('mongoose');

const legalAuditLogSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LegalDocument',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: { type: String, required: true, trim: true, lowercase: true, index: true },
    remarks: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

legalAuditLogSchema.index({ documentId: 1, timestamp: -1 });

module.exports =
  mongoose.models.LegalAuditLog || mongoose.model('LegalAuditLog', legalAuditLogSchema);
