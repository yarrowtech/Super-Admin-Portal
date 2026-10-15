const { Job, External, State } = require('../models/WorkspaceSync');
const records = require('./workspaceRecords.service');
const teacher = require('./edifyEightTeacher.service');
const materials = require('./edifyEightStudyMaterial.service');
const efnbmms = require('./efnbmmsAdminManagement.service');

const adapters = {
  'edifyeight-teachers': { projectId: 'EEC', resource: 'teacher', provider: teacher, fields: ['name', 'email', 'phone', 'department', 'bio', 'avatar', 'status', 'isTeacherVerified', 'legalTermsAccepted', 'biometricVerified'], writeFields: ['name', 'email', 'phone', 'department', 'bio', 'avatar', 'isTeacherVerified', 'legalTermsAccepted', 'biometricVerified'], readOne: (id) => teacher.getTeacherById(id),
    read: (query) => teacher.getAllTeachers(query), write: (id, data) => teacher.updateTeacher(id, data), permission: 'edifyeight:teachers:update' },
  'edifyeight-study-materials': { projectId: 'EEC', resource: 'study-material', provider: materials, fields: ['title', 'name', 'description', 'subject', 'class', 'board', 'category', 'grade', 'accessLevel', 'isFree', 'price', 'status'], writeFields: ['title', 'class', 'board', 'subject', 'category', 'accessLevel', 'isFree', 'price'],
    read: (query) => materials.getAllMaterials(query), readOne: async (id) => {
      const response = await materials.getAllMaterials();
      const { items } = unwrap(response, 'study-material');
      return { data: items.find((item) => String(item._id || item.id) === id) };
    }, write: (id, data) => materials.updateMaterial(id, data), permission: 'edifyeight:study-materials:update' },
  'efnbmms-admin-management': { projectId: 'EFNBMMS', resource: 'admin-management', provider: efnbmms, fields: ['businessName', 'email', 'mobile', 'isActive', 'totalRestaurants', 'totalStaff'],
    read: async () => { const response = await efnbmms.request('GET'); if (!response.ok) { const error = new Error('Provider request failed'); error.status = response.status; error.retryAfter = response.headers?.get('retry-after'); throw error; } return response; } },
};
const fail = (statusCode, message) => { const error = new Error(message); error.statusCode = statusCode; throw error; };
const getAdapter = (user, integrationId, write = false, outbound = false) => {
  const adapter = adapters[integrationId];
  if (!adapter) fail(404, 'Integration not found');
  const filter = records.scope(user, adapter.projectId, write);
  if (outbound && !['admin', 'super_admin', 'superadmin'].includes(String(user.role).toLowerCase()) &&
    !records.authorizedProjects(user).find((project) => project.code === adapter.projectId)?.permissions.includes(adapter.permission)) fail(403, 'Provider update permission required');
  return { adapter, filter: { ...filter, integrationId } };
};
const configured = (adapter) => {
  if (!adapter.provider.getBaseUrl() || !adapter.provider.getServiceToken()) fail(409, 'Provider URL or server-side credential is missing');
  let url;
  try { url = new URL(adapter.provider.getBaseUrl()); } catch { fail(409, 'Invalid configured provider URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search) fail(409, 'Provider URL must use HTTP(S) without embedded credentials or query parameters');
};
const timeout = async (promise) => {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => { const error = new Error('Provider timeout'); error.status = 504; reject(error); }, 30000); })]); }
  finally { clearTimeout(timer); }
};
const safeError = (error) => error.statusCode && !error.status ? error.message : `Provider operation failed (${Number(error.status || error.statusCode) || 502})`;
const unwrap = (response, resource) => {
  if (response?.success === false) fail(502, 'Provider returned unsuccessful response');
  const body = response?.data ?? response;
  if (body?.success === false) fail(502, 'Provider returned unsuccessful response');
  const content = body?.data ?? body;
  const items = Array.isArray(content) ? content : content?.items || content?.[resource === 'teacher' ? 'teachers' : 'materials'];
  if (!Array.isArray(items)) fail(502, 'Provider list contract is not recognized; mapping is required');
  const pagination = content?.pagination || body?.pagination || response?.pagination;
  if ((pagination?.nextCursor || content?.nextCursor || content?.next || body?.next) && !pagination?.totalPages) fail(409, 'Cursor pagination requires a verified provider adapter');
  const totalPages = Number(pagination?.totalPages || 1);
  if (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > 100) fail(502, 'Provider pagination exceeds supported bounds');
  if (Number(pagination?.total || content?.total || body?.total || items.length) > items.length && !pagination?.totalPages) fail(409, 'Provider pagination requires a verified adapter');
  return { items, totalPages };
};
const testConnection = async (user, integrationId) => {
  const { adapter, filter } = getAdapter(user, integrationId, true);
  records.databaseReady(); configured(adapter);
  try {
    const response = await timeout(adapter.read({ page: 1, limit: 1 }));
    unwrap(response, adapter.resource);
    await State.findOneAndUpdate(filter, { $set: { status: 'connected', checkedAt: new Date(), error: null }, $setOnInsert: filter }, { upsert: true, new: true });
    return { integrationId, status: 'connected', checkedAt: new Date(), verification: 'Authenticated read succeeded; write and pagination contracts require their own verification' };
  } catch (error) {
    await State.findOneAndUpdate(filter, { $set: { status: 'failed', checkedAt: new Date(), error: safeError(error) }, $setOnInsert: filter }, { upsert: true });
    fail(502, safeError(error));
  }
};
const enqueue = async (user, integrationId, body = {}) => {
  if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some((key) => !['direction', 'resourceId', 'payload'].includes(key))) fail(400, 'Invalid sync request');
  const direction = body.direction || 'inbound';
  if (!['inbound', 'outbound'].includes(direction)) fail(400, 'Invalid direction');
  const { adapter, filter } = getAdapter(user, integrationId, true, direction === 'outbound');
  records.databaseReady(); configured(adapter);
  let baseRevision;
  if (await State.exists({ ...filter, enabled: false })) fail(409, 'Integration is disabled');
  if (direction === 'outbound') {
    if (!adapter.write) fail(409, 'Provider write operation is not supported by the existing adapter');
    if (typeof body.resourceId !== 'string' || body.resourceId.length > 200) fail(400, 'External resource ID required');
    if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload) || !Object.keys(body.payload).length || Object.keys(body.payload).some((key) => !adapter.writeFields.includes(key))) fail(400, 'Unsupported provider update fields');
    if (JSON.stringify(body.payload).length > 10000 || Object.values(body.payload).some((value) => !['string', 'number', 'boolean'].includes(typeof value))) fail(400, 'Invalid provider update values');
    const snapshot = await External.findOne({ ...filter, externalRecordId: body.resourceId, present: { $ne: false } }).lean();
    if (!snapshot) fail(404, 'Synchronize the external record before updating it');
    baseRevision = snapshot.revision;
    if (adapter.resource === 'study-material') body = { ...body, payload: {
      ...Object.fromEntries(adapter.writeFields.filter((field) => snapshot.data[field] !== undefined).map((field) => [field, snapshot.data[field]])), ...body.payload,
    } };
  }
  const activeKey = `${filter.organizationId}:${filter.projectId}:${integrationId}:${direction}:${body.resourceId || ''}`;
  const existing = await Job.findOne({ activeKey }).select('+payload').lean();
  if (existing) {
    if (direction === 'outbound' && JSON.stringify(existing.payload) !== JSON.stringify(body.payload)) fail(409, 'Another update for this record is pending');
    const { payload, ...publicJob } = existing; void payload;
    return publicJob;
  }
  try {
    const job = await Job.create({ ...filter, direction, activeKey, requestedBy: user._id || user.id, resourceId: body.resourceId, baseRevision, payload: body.payload });
    return Job.findById(job._id).lean();
  } catch (error) { if (error.code === 11000) return enqueue(user, integrationId, body); throw error; }
};
const processOne = async () => {
  records.databaseReady();
  // A lease recovers jobs after process termination. PUT updates are idempotent;
  // create/delete operations are deliberately excluded from automatic retries.
  const now = new Date();
  const job = await Job.findOneAndUpdate({ $or: [{ status: 'queued', availableAt: { $lte: now } }, { status: 'running', leaseUntil: { $lt: now } }] }, {
    $set: { status: 'running', leaseUntil: new Date(Date.now() + 120000) }, $inc: { attempts: 1 },
  }, { new: true, sort: { createdAt: 1 } }).select('+payload').lean();
  if (!job) return null;
  const filter = { organizationId: job.organizationId, projectId: job.projectId, integrationId: job.integrationId };
  const adapter = adapters[job.integrationId];
  try {
    const user = await require('../models/auth/User').findById(job.requestedBy).lean();
    if (!user || user.isActive === false || ['inactive', 'blocked', 'suspended'].includes(user.accountStatus)) fail(403, 'Requester access revoked');
    const authorized = getAdapter(user, job.integrationId, true, job.direction === 'outbound');
    if (authorized.filter.projectId !== job.projectId || authorized.filter.organizationId !== job.organizationId) fail(403, 'Sync job ownership mismatch');
    configured(adapter);
    if (await State.exists({ ...filter, enabled: false })) fail(409, 'Integration is disabled');
    let processed = 0;
    if (job.direction === 'outbound') {
      const snapshot = await External.findOne({ ...filter, externalRecordId: job.resourceId, present: { $ne: false } }).lean();
      if (!snapshot) fail(404, 'External record mapping no longer exists');
      let alreadyApplied = Boolean(job.remoteAppliedAt);
      if (!alreadyApplied && adapter.readOne && job.baseRevision) {
        const response = await timeout(adapter.readOne(job.resourceId));
        const remote = response?.data?.data || response?.data;
        const revision = String(remote?.updatedAt || remote?.version || '');
        if (!remote) fail(404, 'Provider record no longer exists');
        if (revision && revision !== job.baseRevision) {
          alreadyApplied = Object.entries(job.payload).every(([field, value]) => remote[field] === value);
          if (!alreadyApplied) fail(409, 'Provider record changed; synchronize before updating');
        }
      }
      if (!alreadyApplied) await timeout(adapter.write(job.resourceId, job.payload));
      await Job.updateOne({ _id: job._id, status: 'running', attempts: job.attempts }, { $set: { remoteAppliedAt: new Date() } });
      // Do not publish optimistic provider data. The following inbound job
      // obtains the provider's authoritative version.
      await enqueue(user, job.integrationId, { direction: 'inbound' });
      processed = 1;
    } else {
      let pages = 1;
      const seen = new Set();
      for (let page = 1; page <= pages; page += 1) {
        await Job.updateOne({ _id: job._id, status: 'running', attempts: job.attempts }, { $set: { leaseUntil: new Date(Date.now() + 120000) } });
        const response = await timeout(adapter.read({ page, limit: 100 }));
        const parsed = unwrap(response, adapter.resource); pages = parsed.totalPages;
        if (parsed.items.length > 1000) fail(502, 'Provider page too large');
        for (const item of parsed.items) {
          if (!item || typeof item !== 'object' || Array.isArray(item)) fail(502, 'Invalid external record');
          const value = item._id || item.id || item.teacherId || item.materialId;
          if (!value || typeof value === 'object') fail(502, 'Stable external ID missing');
          const externalRecordId = String(value);
          if (externalRecordId.length > 200 || seen.has(externalRecordId)) fail(502, 'Provider returned duplicate or invalid IDs');
          seen.add(externalRecordId);
          const data = Object.fromEntries(adapter.fields.filter((field) => item[field] !== undefined && ['string', 'number', 'boolean'].includes(typeof item[field])).map((field) => [field, item[field]]));
          const name = String(item.name || item.businessName || item.title || item.fullName || [item.firstName, item.lastName].filter(Boolean).join(' ') || externalRecordId).slice(0, 200);
          await External.updateOne({ ...filter, externalRecordId }, { $set: { data, name, present: true, lastSyncedAt: new Date(), lastJobId: job._id, revision: String(item.updatedAt || item.version || '') }, $setOnInsert: { ...filter, externalRecordId, resource: adapter.resource } }, { upsert: true });
          processed += 1;
        }
      }
      await External.updateMany({ ...filter, externalRecordId: { $nin: [...seen] } }, { $set: { present: false, lastSyncedAt: new Date(), lastJobId: job._id } });
    }
    await State.findOneAndUpdate(filter, { $set: { status: 'connected', [job.direction === 'inbound' ? 'lastInboundAt' : 'lastOutboundAt']: new Date(), error: null }, $setOnInsert: filter }, { upsert: true });
    await Job.updateOne({ _id: job._id, status: 'running', attempts: job.attempts }, { $set: { status: 'succeeded', completedAt: new Date(), processed, error: null }, $unset: { activeKey: 1, leaseUntil: 1, payload: 1 } });
  } catch (error) {
    const status = Number(error.status || error.statusCode) || 502;
    const retryable = [429, 500, 502, 503, 504].includes(status);
    const retry = retryable && job.attempts < 3;
    const retryAfter = Number.isFinite(Number(error.retryAfter)) ? Number(error.retryAfter) * 1000 : Date.parse(error.retryAfter) - Date.now();
    const delay = Math.min(86400000, Math.max(30000 * job.attempts, Number.isFinite(retryAfter) ? retryAfter : 0));
    if (!retry) await State.findOneAndUpdate(filter, { $set: { status: 'failed', error: safeError(error) }, $setOnInsert: filter }, { upsert: true });
    await Job.updateOne({ _id: job._id, status: 'running', attempts: job.attempts }, { $set: { status: retry ? 'queued' : 'failed', error: safeError(error), retryable, availableAt: new Date(Date.now() + delay) }, $unset: { leaseUntil: 1, ...(retry ? {} : { activeKey: 1 }) } });
  }
  return Job.findById(job._id).lean();
};
const jobDetail = async (user, jobId) => {
  if (!require('mongoose').isObjectIdOrHexString(jobId)) fail(400, 'Invalid job ID');
  records.databaseReady();
  const job = await Job.findOne({ ...records.queryScope(user), _id: jobId }).lean();
  if (!job) fail(404, 'Sync job not found');
  return job;
};
const retry = async (user, jobId) => {
  const job = await jobDetail(user, jobId);
  getAdapter(user, job.integrationId, true, job.direction === 'outbound');
  if (job.status !== 'failed' || !job.retryable) fail(409, 'Job is not eligible for retry');
  const activeKey = `${job.organizationId}:${job.projectId}:${job.integrationId}:${job.direction}:${job.resourceId || ''}`;
  try {
    const updated = await Job.findOneAndUpdate({ _id: job._id, status: 'failed' }, { $set: { activeKey, status: 'queued', attempts: 0, availableAt: new Date(), error: null } }, { new: true }).lean();
    if (!updated) fail(409, 'Job was already retried');
    return updated;
  } catch (error) { if (error.code === 11000) fail(409, 'A matching sync job is already active'); throw error; }
};
module.exports = { adapters, getAdapter, testConnection, enqueue, processOne, jobDetail, retry, unwrap };
