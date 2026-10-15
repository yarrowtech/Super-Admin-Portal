const mongoose = require('mongoose');
const scope = {
  organizationId: { type: String, required: true, immutable: true },
  projectId: { type: String, enum: ['YARROWTECH'], required: true, immutable: true },
};
const history = [{ action: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now }, fields: [String] }];
const details = new mongoose.Schema({
  ...scope, resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkspaceRecord', required: true, immutable: true },
  category: { type: String, trim: true, maxlength: 100 }, productCode: { type: String, trim: true, maxlength: 100 },
  releaseVersion: { type: String, trim: true, maxlength: 100 }, notificationsEnabled: { type: Boolean, default: true },
  history,
}, { timestamps: true, bufferCommands: false, strict: 'throw' });
details.index({ organizationId: 1, projectId: 1, resourceId: 1 }, { unique: true });
details.index({ organizationId: 1, projectId: 1, productCode: 1 }, { unique: true, partialFilterExpression: { productCode: { $type: 'string' } } });
const delivery = new mongoose.Schema({
  ...scope,
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkspaceRecord', required: true, immutable: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkspaceRecord', required: true, immutable: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, maxlength: 5000, default: '' },
  status: { type: String, enum: ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'], default: 'planning' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  teamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dueAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', immutable: true },
  creationKey: { type: String, maxlength: 100, immutable: true },
  creationHash: { type: String, immutable: true, select: false },
  tasks: [{ title: { type: String, required: true, maxlength: 200 }, status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' } }],
  history,
}, { timestamps: true, bufferCommands: false, strict: 'throw' });
delivery.index({ organizationId: 1, projectId: 1, serviceId: 1, createdAt: -1 });
delivery.index({ organizationId: 1, projectId: 1, createdBy: 1, creationKey: 1 }, { unique: true, partialFilterExpression: { creationKey: { $type: 'string' } } });
const payment = new mongoose.Schema({
  ...scope,
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkspaceRecord', required: true, immutable: true },
  integrationId: { type: String, required: true, immutable: true },
  externalTransactionId: { type: String, required: true, immutable: true },
  status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], required: true },
  amountMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  currency: { type: String, required: true, match: /^[A-Z]{3}$/ },
  providerOccurredAt: Date,
}, { timestamps: true, bufferCommands: false, strict: 'throw' });
payment.index({ organizationId: 1, projectId: 1, integrationId: 1, externalTransactionId: 1 }, { unique: true });
payment.index({ organizationId: 1, projectId: 1, subscriptionId: 1, createdAt: -1 });
module.exports = { Details: mongoose.model('YarrowtechResourceDetails', details), Delivery: mongoose.model('YarrowtechServiceProject', delivery), Payment: mongoose.model('YarrowtechPayment', payment) };
