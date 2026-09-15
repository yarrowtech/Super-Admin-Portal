const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', default: null, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
  version: { type: Number, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
schema.index({ policyId: 1, createdAt: -1 });
schema.index({ projectId: 1, createdAt: -1 });
module.exports = mongoose.models.PolicyAuditLog || mongoose.model('PolicyAuditLog', schema);
