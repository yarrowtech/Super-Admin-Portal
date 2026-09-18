const mongoose = require('mongoose');

const policyDocumentSchema = new mongoose.Schema({
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true, index: true },
  versionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PolicyVersion', default: null, index: true },
  fileName: { type: String, required: true, trim: true },
  storageReference: { type: String, required: true },
  mimeType: { type: String, required: true, trim: true },
  fileSize: { type: Number, required: true, min: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  provider: { type: String, trim: true, default: 'inline' },
}, { timestamps: { createdAt: 'uploadedAt', updatedAt: 'updatedAt' } });

policyDocumentSchema.index({ policyId: 1, uploadedAt: -1 });
policyDocumentSchema.index({ versionId: 1, uploadedAt: -1 });

module.exports = mongoose.models.PolicyDocument || mongoose.model('PolicyDocument', policyDocumentSchema);
