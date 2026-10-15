const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  organizationId: { type: String, required: true, immutable: true },
  projectId: { type: String, required: true, immutable: true },
  brandId: { type: String, required: true, immutable: true },
  canonicalProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  displayName: { type: String, trim: true, maxlength: 200 },
  description: { type: String, maxlength: 5000 },
  modules: [{ type: String, enum: ['overview', 'services', 'products', 'subscriptions', 'crm', 'integrations'] }],
  history: [{ action: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } }],
}, { timestamps: true, bufferCommands: false, strict: 'throw' });
schema.index({ organizationId: 1, projectId: 1 }, { unique: true });
module.exports = mongoose.model('WorkspaceConfiguration', schema);
