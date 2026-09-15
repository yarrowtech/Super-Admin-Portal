const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true, index: true },
  policyVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PolicyVersion', required: true, index: true },
  version: { type: Number, required: true },
  acceptedAt: { type: Date, default: Date.now },
  ipAddress: { type: String, trim: true, default: '' },
  userAgent: { type: String, trim: true, default: '' },
}, { timestamps: true });
schema.index({ userId: 1, projectId: 1, policyVersionId: 1 }, { unique: true });
schema.index({ userId: 1, projectId: 1, policyId: 1, acceptedAt: -1 });
module.exports = mongoose.models.PolicyAcceptance || mongoose.model('PolicyAcceptance', schema);
