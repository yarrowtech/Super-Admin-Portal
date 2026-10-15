const mongoose = require('mongoose');
const scope = {
  organizationId: { type: String, required: true, immutable: true },
  projectId: { type: String, required: true, immutable: true },
  integrationId: { type: String, required: true, immutable: true },
};
const job = new mongoose.Schema({
  ...scope,
  direction: { type: String, enum: ['inbound', 'outbound'], required: true },
  status: { type: String, enum: ['queued', 'running', 'succeeded', 'failed'], default: 'queued' },
  activeKey: String,
  resourceId: String,
  baseRevision: String,
  remoteAppliedAt: Date,
  payload: { type: mongoose.Schema.Types.Mixed, select: false },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attempts: { type: Number, default: 0 },
  availableAt: { type: Date, default: Date.now },
  leaseUntil: Date,
  completedAt: Date,
  processed: { type: Number, default: 0 },
  error: String,
  retryable: { type: Boolean, default: false },
}, { timestamps: true, bufferCommands: false });
job.index({ organizationId: 1, projectId: 1, createdAt: -1 });
job.index({ status: 1, availableAt: 1 });
job.index({ activeKey: 1 }, { unique: true, partialFilterExpression: { activeKey: { $type: 'string' } } });
const external = new mongoose.Schema({
  ...scope,
  externalRecordId: { type: String, required: true, immutable: true },
  resource: { type: String, required: true, immutable: true },
  name: String,
  present: { type: Boolean, default: true },
  data: mongoose.Schema.Types.Mixed,
  revision: String,
  lastSyncedAt: Date,
  lastJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkspaceSyncJob' },
}, { timestamps: true, bufferCommands: false });
external.index({ organizationId: 1, projectId: 1, integrationId: 1, externalRecordId: 1 }, { unique: true });
const state = new mongoose.Schema({
  ...scope,
  status: { type: String, enum: ['connected', 'failed', 'unverified', 'blocked'], default: 'unverified', required: true },
  nextPollAt: Date,
  enabled: { type: Boolean, default: true },
  displayName: { type: String, maxlength: 200 },
  history: [{ action: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now }, fields: [String] }],
  checkedAt: Date,
  connectionCheck: { type: new mongoose.Schema({
    baseUrl: String,
    connectionStatus: { type: String, enum: ['healthy', 'unhealthy', 'unexpected_response', 'http_error', 'timeout', 'unreachable'] },
    reachable: Boolean,
    healthy: Boolean,
    httpStatus: Number,
    connectionMessage: String,
    checkedAt: Date,
  }, { _id: false }), default: undefined },
  lastInboundAt: Date,
  lastOutboundAt: Date,
  error: String,
}, { timestamps: true, bufferCommands: false });
state.index({ organizationId: 1, projectId: 1, integrationId: 1 }, { unique: true });
module.exports = {
  Job: mongoose.model('WorkspaceSyncJob', job),
  External: mongoose.model('WorkspaceExternalRecord', external),
  State: mongoose.model('WorkspaceIntegrationState', state),
};
