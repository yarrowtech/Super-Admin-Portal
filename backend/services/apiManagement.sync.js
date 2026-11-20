const crypto = require('crypto');
const { ProjectApi, Portal, Endpoint, Connection, SyncJob, Event } = require('../models/ApiManagement');
const security = require('./apiManagement.security');
let timer;
async function run(jobId) {
  const leaseId = crypto.randomUUID();
  const job = await SyncJob.findOneAndUpdate({ _id: jobId, enabled: true,
    $or: [{ lockedUntil: { $lte: new Date() } }, { lockedUntil: null }],
  }, { lockedUntil: new Date(Date.now() + 60000), leaseId, status: 'Running' }, { new: true });
  if (!job) security.fail('Sync disabled or already running', 409);
  const filter = { _id: job._id, leaseId, enabled: true };
  try {
    const connection = await Connection.findById(job.connectionId);
    if (!connection || connection.status !== 'Connected') security.fail('Sync connection is inactive', 403);
    const api = await ProjectApi.findById(connection.apiId).select('+credential');
    const portal = await Portal.findById(connection.portalId);
    const endpoints = await Endpoint.find({ apiId: connection.apiId });
    const endpoint = endpoints.find(e => String(e._id) === String(job.endpointId));
    const grant = connection.grants.find(g => String(g.endpointId) === String(job.endpointId));
    const { digest, validateGrants } = require('../routes/apiManagement.routes');
    await validateGrants(connection.apiId, connection.grants);
    if (!api || !api.enabled || !portal?.enabled || !endpoint || endpoint.method !== 'GET' || !grant || !grant.operations.includes('sync')) security.fail('Explicit synchronization permission required', 403);
    const fingerprint = digest(api, connection, endpoints);
    if (fingerprint !== connection.testedDigest) security.fail('Retest configuration before syncing', 403);
    await Event.create({ kind: 'request', connectionId: connection._id, endpointId: endpoint._id, action: 'sync.attempt', status: 102 });
    const cache = security.projectResponse(await security.request(api, endpoint), endpoint, grant.fields);
    const freshConnection = await Connection.findById(connection._id);
    const freshApi = await ProjectApi.findById(api._id);
    const freshEndpoints = await Endpoint.find({ apiId: api._id });
    const freshPortal = await Portal.findById(portal._id);
    if (freshConnection?.status !== 'Connected' || !freshApi?.enabled || !freshPortal?.enabled || digest(freshApi, freshConnection, freshEndpoints) !== fingerprint) security.fail('Configuration changed during synchronization', 409);
    await SyncJob.updateOne(filter, { cache, cacheDigest: fingerprint, lastSyncedAt: new Date(), status: 'Synced', failures: 0, lockedUntil: null, leaseId: null, nextRunAt: new Date(Date.now() + job.intervalMinutes * 60000) });
    await Event.create({ kind: 'request', connectionId: connection._id, endpointId: endpoint._id, action: 'sync.complete', status: 200 });
  } catch (error) {
    const failures = job.failures + 1;
    await SyncJob.updateOne(filter, { status: 'Error', failures, lockedUntil: null, leaseId: null,
      nextRunAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(failures, 6))) });
    await Event.create({ kind: 'request', connectionId: job.connectionId, endpointId: job.endpointId, action: 'sync.failed', status: error.status || 502 });
    throw error;
  }
  return SyncJob.findById(job._id).lean();
}
async function tick() {
  const jobs = await SyncJob.find({ enabled: true, nextRunAt: { $lte: new Date() }, $or: [{ lockedUntil: null }, { lockedUntil: { $lte: new Date() } }] }).limit(10).select('_id').lean();
  await Promise.allSettled(jobs.map(job => run(job._id)));
}
module.exports = { run, tick,
  start() { if (!timer) { timer = setInterval(() => tick().catch(() => {}), 30000); timer.unref(); } },
  stop() { clearInterval(timer); timer = null; },
};
