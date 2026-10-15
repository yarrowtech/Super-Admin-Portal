const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  organizationId: { type: String, required: true, immutable: true },
  brandId: { type: String, required: true, immutable: true },
  projectId: { type: String, required: true, immutable: true },
  kind: { type: String, required: true, immutable: true, enum: ['service', 'product', 'customer', 'subscription', 'plan', 'ticket'] },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 5000 },
  status: { type: String, default: 'active', enum: ['active', 'inactive', 'cancelled', 'open', 'in_progress', 'resolved', 'closed'] },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkspaceRecord', immutable: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkspaceRecord', immutable: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkspaceRecord', immutable: true },
  amountMinor: { type: Number, min: 0, validate: Number.isSafeInteger },
  currency: { type: String, match: /^[A-Z]{3}$/ },
  billingInterval: { type: String, enum: ['monthly', 'yearly', 'one_time'] },
  startsAt: Date,
  endsAt: Date,
  cancelledAt: Date,
  archivedAt: Date,
  email: { type: String, trim: true, maxlength: 254 },
  phone: { type: String, trim: true, maxlength: 40 },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'] },
  creationKey: { type: String, immutable: true, maxlength: 100 },
  creationHash: { type: String, immutable: true },
  history: [{
    action: { type: String, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    fields: [String],
  }],
  source: { type: String, default: 'internal', immutable: true },
  integrationId: { type: String, immutable: true },
  externalRecordId: { type: String, immutable: true },
  lastSyncedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', immutable: true },
}, { timestamps: true, strict: 'throw', bufferCommands: false });

schema.index({ organizationId: 1, projectId: 1, kind: 1, createdAt: -1 });
schema.index({ organizationId: 1, projectId: 1, productId: 1, kind: 1 });
schema.index({ organizationId: 1, projectId: 1, kind: 1, createdBy: 1, creationKey: 1 }, {
  unique: true, partialFilterExpression: { creationKey: { $type: 'string' } },
});
schema.index({ organizationId: 1, projectId: 1, integrationId: 1, kind: 1, externalRecordId: 1 }, {
  unique: true,
  partialFilterExpression: { externalRecordId: { $type: 'string' }, integrationId: { $type: 'string' } },
});

module.exports = mongoose.model('WorkspaceRecord', schema);
