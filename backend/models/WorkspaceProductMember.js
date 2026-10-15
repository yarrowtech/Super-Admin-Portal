const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  organizationId: { type: String, required: true, immutable: true }, projectId: { type: String, required: true, immutable: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkspaceRecord', required: true, immutable: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  role: { type: String, enum: ['member', 'operator', 'manager'], default: 'member' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  history: [{ action: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now }, fields: [String] }],
}, { timestamps: true, bufferCommands: false, strict: 'throw' });
schema.index({ organizationId: 1, projectId: 1, productId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model('WorkspaceProductMember', schema);
