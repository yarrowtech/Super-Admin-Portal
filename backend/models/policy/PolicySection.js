const mongoose = require('mongoose');

const policySectionSchema = new mongoose.Schema({
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', default: null, index: true },
  policyVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PolicyVersion', required: true, index: true },
  key: { type: String, required: true, trim: true, lowercase: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '' },
  order: { type: Number, required: true, min: 0 },
  enabled: { type: Boolean, default: true },
}, { timestamps: true });
policySectionSchema.index({ policyVersionId: 1, key: 1 }, { unique: true });
policySectionSchema.index({ policyVersionId: 1, order: 1 });
policySectionSchema.index({ policyId: 1, order: 1 });
module.exports = mongoose.models.PolicySection || mongoose.model('PolicySection', policySectionSchema);
