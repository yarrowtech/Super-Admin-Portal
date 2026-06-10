const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String, trim: true, default: '' },
    action: { type: String, required: true, trim: true },
    resourceType: { type: String, trim: true, default: '' },
    resourceId: { type: String, trim: true, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    riskFlag: { type: String, enum: ['none', 'low', 'medium', 'high'], default: 'none' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.models.FinanceAuditLog || mongoose.model('FinanceAuditLog', auditLogSchema);
