const mongoose = require('mongoose');

const apiClientScopeSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiClient', required: true, index: true },
  scope: { type: String, required: true, trim: true },
}, { timestamps: true });

apiClientScopeSchema.index({ clientId: 1, scope: 1 }, { unique: true });

module.exports = mongoose.models.ApiClientScope || mongoose.model('ApiClientScope', apiClientScopeSchema);
