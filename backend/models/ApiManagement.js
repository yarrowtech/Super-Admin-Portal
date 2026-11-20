const mongoose = require('mongoose');
const { Schema } = mongoose;
const model = (name, fields, indexes = []) => {
  const schema = new Schema(fields, { timestamps: true, strict: 'throw' });
  indexes.forEach(([keys, options]) => schema.index(keys, options));
  return mongoose.models[name] || mongoose.model(name, schema);
};
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name, required: true });
const grant = new Schema({
  endpointId: ref('ManagedApiEndpoint'), fields: [{ type: String }],
  operations: [{ type: String, enum: ['read', 'create', 'update', 'sync'] }],
}, { _id: false, strict: 'throw' });
module.exports = {
  ProjectApi: model('ManagedProjectApi', {
    projectId: { ...ref('Project'), unique: true }, name: { type: String, required: true },
    namespace: { type: String, required: true, unique: true }, baseUrl: { type: String, default: '' },
    enabled: { type: Boolean, default: false }, version: { type: String, default: 'v1' },
    credential: { type: String, select: false }, credentialConfigured: { type: Boolean, default: false },
    credentialRotatedAt: Date, lastFetchedAt: Date,
    environmentManaged: { type: Boolean, default: false },
    environmentIntegrationId: { type: String, default: '' },
    environmentIntegrationIds: [{ type: String }],
  }, [[{ environmentIntegrationIds: 1 }, { unique: true, partialFilterExpression: { 'environmentIntegrationIds.0': { $exists: true } } }]]),
  Endpoint: model('ManagedApiEndpoint', {
    apiId: ref('ManagedProjectApi'), name: { type: String, required: true },
    providerIntegrationId: { type: String, default: '' },
    module: { type: String, required: true }, dataset: { type: String, required: true },
    path: { type: String, required: true }, method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH'], required: true },
    operation: { type: String, enum: ['read', 'create', 'update', 'sync'], required: true },
    fields: [{ type: String }], sharedFields: [{ type: String }],
    shared: { type: Boolean, default: false },
    requestSchema: { type: Schema.Types.Mixed, default: {} }, responseSchema: { type: Schema.Types.Mixed, default: {} },
    recordsPath: { type: String, default: '' },
  }, [[{ apiId: 1, path: 1, method: 1 }, { unique: true }]]),
  Portal: model('ManagedApiPortal', {
    name: { type: String, required: true }, slug: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true },
    mcpEnabled: { type: Boolean, default: false },
    tokenHash: { type: String, select: false }, credentialRotatedAt: Date,
  }),
  Connection: model('ManagedApiConnection', {
    apiId: ref('ManagedProjectApi'), portalId: ref('ManagedApiPortal'), grants: [grant],
    status: { type: String, enum: ['Pending', 'Connected', 'Not Connected', 'Error', 'Disabled'], default: 'Pending' },
    testedAt: Date, testedDigest: String, lastFetchedAt: Date,
  }, [[{ apiId: 1, portalId: 1 }, { unique: true }]]),
  SyncJob: model('ManagedApiSyncJob', {
    connectionId: ref('ManagedApiConnection'), endpointId: ref('ManagedApiEndpoint'),
    enabled: { type: Boolean, default: false }, intervalMinutes: { type: Number, min: 1, max: 43200, default: 60 },
    nextRunAt: Date, lockedUntil: Date, leaseId: String, lastSyncedAt: Date,
    failures: { type: Number, default: 0 }, status: { type: String, default: 'Pending' },
    cache: { type: Schema.Types.Mixed, select: false }, cacheDigest: String,
    webhookHash: { type: String, select: false },
  }, [[{ connectionId: 1, endpointId: 1 }, { unique: true }], [{ enabled: 1, nextRunAt: 1, lockedUntil: 1 }, {}]]),
  SyncReceipt: model('ManagedApiSyncReceipt', {
    jobId: ref('ManagedApiSyncJob'), eventId: { type: String, required: true }, expiresAt: { type: Date, required: true },
  }, [[{ jobId: 1, eventId: 1 }, { unique: true }], [{ expiresAt: 1 }, { expireAfterSeconds: 0 }]]),
  Event: model('ManagedApiEvent', {
    kind: { type: String, enum: ['request', 'audit', 'test'], required: true },
    actor: String, apiId: Schema.Types.ObjectId, portalId: Schema.Types.ObjectId,
    connectionId: Schema.Types.ObjectId, endpointId: Schema.Types.ObjectId,
    action: String, status: Number, durationMs: Number,
  }, [[{ createdAt: -1, kind: 1 }, {}]]),
};
