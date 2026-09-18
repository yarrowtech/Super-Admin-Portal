const mongoose = require('mongoose');

const apiClientSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  clientId: { type: String, required: true, trim: true, unique: true, index: true },
  label: { type: String, trim: true, default: '' },
  secretHash: { type: String, required: true, select: false },
  status: { type: String, enum: ['ACTIVE', 'REVOKED', 'EXPIRED'], default: 'ACTIVE', index: true },
  lastUsedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null, index: true },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

apiClientSchema.index({ projectId: 1, status: 1 });

module.exports = mongoose.models.ApiClient || mongoose.model('ApiClient', apiClientSchema);
