const mongoose = require('mongoose');

const policyVersionSchema = new mongoose.Schema({
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true, index: true },
  versionNumber: { type: Number, required: true, min: 1 },
  title: { type: String, required: true, trim: true },
  summary: { type: String, trim: true, default: '' },
  changeSummary: { type: String, trim: true, default: '' },
  // Sanitized rich-text HTML. The API never returns this as executable markup.
  content: { type: String, default: '' },
  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT', index: true },
  effectiveDate: { type: Date, default: null },
  publishedAt: { type: Date, default: null },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

policyVersionSchema.index({ policyId: 1, versionNumber: 1 }, { unique: true });
policyVersionSchema.index({ policyId: 1, status: 1, effectiveDate: 1 });
module.exports = mongoose.models.PolicyVersion || mongoose.model('PolicyVersion', policyVersionSchema);
