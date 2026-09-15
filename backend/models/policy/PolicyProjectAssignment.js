const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  required: { type: Boolean, default: true },
  enabled: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
schema.index({ policyId: 1, projectId: 1 }, { unique: true });
module.exports = mongoose.models.PolicyProjectAssignment || mongoose.model('PolicyProjectAssignment', schema);
