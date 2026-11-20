const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middlewares/auth.middleware');
const Project = require('../models/common/Project');
const PortalAccess = require('../models/superAdmin/PortalAccess');
const { ProjectApi, Endpoint, Portal, Connection, Event, SyncJob, SyncReceipt } = require('../models/ApiManagement');
const security = require('../services/apiManagement.security');
const environment = require('../services/apiManagement.environment');
const { fail, hash, fields, path, shape } = security;
const router = express.Router();
const gateway = express.Router();
const webhooks = express.Router();
const id = z.string().regex(/^[a-f\d]{24}$/i);
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const audit = (req, action, refs = {}) => Event.create({ kind: 'audit', actor: String(req.user?.id || req.user?._id || ''), action, ...refs });
const get = async (Model, value, select) => {
  id.parse(value);
  const doc = await Model.findById(value).select(select || '');
  if (!doc) fail('Resource not found', 404);
  return doc;
};
const digest = (api, connection, endpoints) => hash(JSON.stringify({
  baseUrl: api.baseUrl, enabled: api.enabled, rotated: api.credentialRotatedAt,
  environment: environment.fingerprint(api),
  grants: connection.grants, endpoints: endpoints.map(e => ({ id: e.id, updatedAt: e.updatedAt, environment: environment.fingerprint(api, e.providerIntegrationId) })).sort((a,b) => a.id.localeCompare(b.id)),
}));
async function validateGrants(apiId, grants) {
  if (!grants.length) fail('Select at least one endpoint');
  if (new Set(grants.map(g => String(g.endpointId))).size !== grants.length) fail('Duplicate endpoint grants');
  const endpoints = await Endpoint.find({ apiId });
  for (const grant of grants) {
    const endpoint = endpoints.find(e => String(e._id) === String(grant.endpointId));
    if (!endpoint || !endpoint.shared || !grant.fields.length || !grant.operations.length ||
      grant.fields.some(f => !endpoint.sharedFields.includes(f)) || grant.operations.some(op => op !== endpoint.operation)) fail('Grant exceeds project sharing policy');
  }
  return endpoints;
}
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(authenticate);
router.use((req, res, next) => {
  if (!['super_admin', 'admin'].includes(req.user?.role)) return res.status(403).json({ error: 'Administrator access required' });
  if (!['GET', 'HEAD'].includes(req.method) && req.user.role !== 'super_admin') return res.status(403).json({ error: 'Super Admin access required' });
  next();
});
router.get('/state', wrap(async (req, res) => {
  const [apis, endpoints, portals, connections, events, projects, portalOptions, syncJobs] = await Promise.all([
    ProjectApi.find().lean(), Endpoint.find().lean(), Portal.find().lean(), Connection.find().lean(),
    Event.find().sort({ createdAt: -1 }).limit(100).lean(), Project.find().select('name projectCode').lean(),
    PortalAccess.distinct('portal'),
    SyncJob.find().lean(),
  ]);
  const existingIntegrations = environment.inventory(projects, apis);
  for (const api of apis) {
    const configuration = environment.gatewayConfiguration(api);
    if (configuration) { api.baseUrl = configuration.baseUrl; api.credentialConfigured = Boolean(configuration.bearer && configuration.token); }
    api.environmentKeys = api.environmentIntegrationId ? undefined : environment.keysForApi(api);
  }
  res.json({ apis, endpoints, portals, connections, events, projects, portalOptions, syncJobs, existingIntegrations,
    capabilities: { live: true, push: true, scheduledSync: true, webhooks: true, mcp: true, encryptionReady: /^[a-f\d]{64}$/i.test(process.env.API_MANAGEMENT_ENCRYPTION_KEY || '') } });
}));
router.post('/existing-integrations/:integrationId/import', wrap(async (req, res) => {
  const { projectId } = z.object({ projectId: id }).strict().parse(req.body);
  const definition = environment.byId(req.params.integrationId);
  const project = await get(Project, projectId);
  if (!environment.ownsProject(definition, project)) fail('This existing API belongs to a different project', 403);
  const owner = await ProjectApi.findOne({ environmentIntegrationIds: definition.id });
  if (owner && String(owner.projectId) !== projectId) fail('Existing API is already assigned to another project', 409);
  let api = await ProjectApi.findOne({ projectId });
  if (!api) {
    api = new ProjectApi({ projectId, name: `${project.name} API`, namespace: `${(project.projectCode || project.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}-${crypto.randomUUID()}` });
  }
  await audit(req, 'project-api.import-existing', { apiId: api._id });
  if (!api.environmentIntegrationIds.includes(definition.id)) api.environmentIntegrationIds.push(definition.id);
  // Preserve an already configured primary API. Additional existing adapters
  // remain visible and controllable without replacing its upstream connection.
  if (!api.baseUrl && !api.environmentManaged && !api.environmentIntegrationId) {
    api.environmentIntegrationId = definition.id;
    const config = environment.gatewayConfiguration(api);
    api.baseUrl = config.baseUrl; api.credentialConfigured = Boolean(config.bearer && config.token);
    api.environmentManaged = true;
  }
  await api.save(); res.json(api);
}));
router.patch('/existing-integrations/:integrationId', wrap(async (req, res) => {
  const { projectId, settings, revision } = z.object({ projectId: id, settings: z.record(z.string(), z.string().max(4096)), revision: z.string().regex(/^[a-f\d]{64}$/) }).strict().parse(req.body);
  if (!Object.keys(settings).length) fail('No settings were changed');
  const definition = environment.byId(req.params.integrationId);
  const project = await get(Project, projectId);
  const api = await ProjectApi.findOne({ projectId, environmentIntegrationIds: definition.id });
  if (!api || !environment.ownsProject(definition, project)) fail('Register this API with its owning project first', 403);
  await audit(req, 'project-api.environment-update', { apiId: api._id });
  environment.updateExisting(definition.id, settings, revision);
  res.json({ success: true, savedTo: 'backend/.env', runtimeUpdated: true });
}));
router.post('/apis', wrap(async (req, res) => {
  const body = z.object({ projectId: id }).strict().parse(req.body);
  const project = await get(Project, body.projectId);
  const namespace = `${(project.projectCode || project.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}-${crypto.randomUUID()}`;
  const api = new ProjectApi({ projectId: project._id, name: `${project.name} API`, namespace });
  await audit(req, 'project-api.register', { apiId: api._id });
  await api.save();
  res.status(201).json(api);
}));
router.patch('/apis/:id', wrap(async (req, res) => {
  const body = z.object({ baseUrl: z.string().max(2000).transform(security.baseUrl).optional(), enabled: z.boolean().optional() }).strict().parse(req.body);
  const api = await get(ProjectApi, req.params.id, '+credential');
  await audit(req, 'project-api.configure', { apiId: api._id });
  if (body.baseUrl !== undefined) {
    const preservedToken = !api.environmentManaged && !api.environmentIntegrationId && api.credential ? security.decrypt(api.credential) : undefined;
    environment.writeApi(api, { url: body.baseUrl, ...(preservedToken ? { token: preservedToken } : {}) }); api.environmentManaged = true;
  }
  api.set(body); await api.save(); const response = api.toObject(); delete response.credential; res.json(response);
}));
router.post('/apis/:id/credential', wrap(async (req, res) => {
  const { token } = z.object({ token: z.string().min(16).max(4096).regex(/^[\x21-\x7e]+$/) }).strict().parse(req.body);
  const api = await get(ProjectApi, req.params.id);
  const credential = security.encrypt(token);
  await audit(req, 'project-api.credential-rotate', { apiId: api._id });
  environment.writeApi(api, { token, ...(!api.environmentManaged && !api.environmentIntegrationId && api.baseUrl ? { url: api.baseUrl } : {}) });
  await ProjectApi.updateOne({ _id: api._id }, { credential, credentialConfigured: true, credentialRotatedAt: new Date(), environmentManaged: true });
  res.json({ success: true });
}));
const endpointBody = z.object({
  apiId: id, name: z.string().min(1).max(150), module: z.string().min(1).max(100), dataset: z.string().min(1).max(100),
  providerIntegrationId: z.string().max(100).optional().default(''),
  path, method: z.enum(['GET', 'POST', 'PUT', 'PATCH']), operation: z.enum(['read', 'create', 'update', 'sync']),
  fields, sharedFields: fields.or(z.array(security.field).length(0)), shared: z.boolean(), requestSchema: shape, responseSchema: shape,
  recordsPath: z.string().max(100).regex(/^(?:[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*)?$/),
}).strict().superRefine((b, ctx) => {
  if ((b.shared && !b.sharedFields.length) || b.sharedFields.some(f => !b.fields.includes(f)) || b.fields.some(f => !b.responseSchema[f]) ||
    ((b.operation === 'read' || b.operation === 'sync') !== (b.method === 'GET')) ||
    (b.operation === 'create' && b.method !== 'POST') || (b.operation === 'update' && !['PUT', 'PATCH'].includes(b.method)) ||
    (b.method !== 'GET' && b.sharedFields.some(f => !b.requestSchema[f]))) ctx.addIssue({ code: 'custom', message: 'Fields, schemas, method and operation must agree' });
});
router.post('/sync-jobs', wrap(async (req, res) => {
  const body = z.object({ connectionId: id, endpointId: id, enabled: z.boolean(), intervalMinutes: z.number().int().min(1).max(43200) }).strict().parse(req.body);
  const connection = await get(Connection, body.connectionId);
  const endpoint = await get(Endpoint, body.endpointId);
  const grant = connection.grants.find(g => String(g.endpointId) === body.endpointId);
  if (String(connection.apiId) !== String(endpoint.apiId) || endpoint.method !== 'GET' || endpoint.operation !== 'sync' || !grant?.operations.includes('sync')) fail('Select an endpoint with explicit sync permission');
  await audit(req, 'sync.configure', { connectionId: connection._id, endpointId: endpoint._id });
  res.json(await SyncJob.findOneAndUpdate({ connectionId: connection._id, endpointId: endpoint._id }, { $set: { ...body, nextRunAt: new Date(), lockedUntil: null, leaseId: null, cacheDigest: null }, $unset: { cache: 1 } }, { new: true, upsert: true, runValidators: true }));
}));
router.post('/sync-jobs/:id/run', wrap(async (req, res) => {
  const job = await get(SyncJob, req.params.id); await audit(req, 'sync.run', { connectionId: job.connectionId });
  res.json(await require('../services/apiManagement.sync').run(job._id));
}));
router.post('/sync-jobs/:id/webhook-credential', wrap(async (req, res) => {
  const job = await get(SyncJob, req.params.id); const token = crypto.randomBytes(32).toString('base64url');
  await audit(req, 'webhook.credential-rotate', { connectionId: job.connectionId });
  job.webhookHash = hash(token); await job.save(); res.json({ token });
}));
router.post('/endpoints', wrap(async (req, res) => {
  const body = endpointBody.parse(req.body); const api = await get(ProjectApi, body.apiId);
  if (body.providerIntegrationId) environment.gatewayConfiguration(api, body.providerIntegrationId);
  await audit(req, 'endpoint.register', { apiId: body.apiId });
  res.status(201).json(await Endpoint.create(body));
}));
router.put('/endpoints/:id', wrap(async (req, res) => {
  const body = endpointBody.parse(req.body); const endpoint = await get(Endpoint, req.params.id);
  if (String(endpoint.apiId) !== body.apiId) fail('Endpoint ownership cannot change');
  if (body.providerIntegrationId) environment.gatewayConfiguration(await get(ProjectApi, body.apiId), body.providerIntegrationId);
  await audit(req, 'endpoint.configure', { apiId: endpoint.apiId, endpointId: endpoint._id });
  endpoint.set(body); await endpoint.save(); res.json(endpoint);
}));
router.post('/portals', wrap(async (req, res) => {
  const body = z.object({ name: z.string().min(1).max(100), slug: z.string().regex(/^[a-z][a-z0-9-]{1,70}$/) }).strict().parse(req.body);
  await audit(req, 'portal.register'); res.status(201).json(await Portal.create(body));
}));
// Portal client credentials are hashed and displayed once, never returned by list APIs.
router.post('/portals/:id/rotate', wrap(async (req, res) => {
  const portal = await get(Portal, req.params.id); const token = crypto.randomBytes(32).toString('base64url');
  await audit(req, 'portal.credential-rotate', { portalId: portal._id });
  portal.tokenHash = hash(token); portal.credentialRotatedAt = new Date(); await portal.save();
  res.json({ token, warning: 'Copy to the portal server secret store. This value will not be shown again.' });
}));
router.patch('/portals/:id', wrap(async (req, res) => {
  const body = z.object({ enabled: z.boolean().optional(), mcpEnabled: z.boolean().optional() }).strict().parse(req.body);
  const portal = await get(Portal, req.params.id); await audit(req, 'portal.configure', { portalId: portal._id });
  portal.set(body); await portal.save(); res.json({ success: true });
}));
const connectionBody = z.object({ apiId: id, portalId: id, grants: z.array(z.object({ endpointId: id, fields, operations: z.array(z.enum(['read', 'create', 'update', 'sync'])).min(1) }).strict()).min(1).max(100) }).strict();
router.post('/connections', wrap(async (req, res) => {
  const body = connectionBody.parse(req.body);
  await get(ProjectApi, body.apiId); await get(Portal, body.portalId); await validateGrants(body.apiId, body.grants);
  await audit(req, 'connection.configure', { apiId: body.apiId, portalId: body.portalId });
  const connection = await Connection.findOneAndUpdate({ apiId: body.apiId, portalId: body.portalId }, { $set: { ...body, status: 'Pending', testedAt: null, testedDigest: null } }, { upsert: true, new: true, runValidators: true });
  res.json(connection);
}));
router.post('/connections/:id/test', wrap(async (req, res) => {
  const connection = await get(Connection, req.params.id);
  const api = await get(ProjectApi, String(connection.apiId), '+credential');
  const portal = await get(Portal, String(connection.portalId), '+tokenHash');
  const endpoints = await validateGrants(api._id, connection.grants);
  const providerConfiguration = environment.gatewayConfiguration(api);
  if (!api.enabled || !(providerConfiguration?.baseUrl || api.baseUrl) || !(providerConfiguration ? providerConfiguration.bearer && providerConfiguration.token : api.credentialConfigured) || !portal.enabled || !portal.tokenHash) fail('Enable and configure provider and portal credentials before testing');
  const readGrants = connection.grants.filter(g => endpoints.find(e => e.id === String(g.endpointId))?.method === 'GET');
  if (!readGrants.length) fail('Register a permitted GET endpoint for a non-mutating connection test');
  try {
    for (const grant of readGrants) {
      const endpoint = endpoints.find(e => e.id === String(grant.endpointId));
      security.projectResponse(await security.request(api, endpoint), endpoint, grant.fields);
    }
    connection.testedAt = new Date(); connection.testedDigest = digest(api, connection, endpoints); connection.status = 'Not Connected';
    await connection.save(); await audit(req, 'connection.test-success', { connectionId: connection._id });
    res.json({ success: true, testedAt: connection.testedAt });
  } catch (error) {
    connection.status = 'Error'; connection.testedDigest = null; await connection.save();
    await audit(req, 'connection.test-failed', { connectionId: connection._id }); throw error;
  }
}));
router.post('/connections/:id/status', wrap(async (req, res) => {
  const { active } = z.object({ active: z.boolean() }).strict().parse(req.body);
  const connection = await get(Connection, req.params.id);
  if (active) {
    const api = await get(ProjectApi, String(connection.apiId));
    const portal = await get(Portal, String(connection.portalId));
    const endpoints = await validateGrants(api._id, connection.grants);
    if (!api.enabled || !portal.enabled || !connection.testedDigest || connection.testedDigest !== digest(api, connection, endpoints)) fail('Test the current configuration before activation');
  }
  await audit(req, active ? 'connection.activate' : 'connection.disable', { connectionId: connection._id });
  connection.status = active ? 'Connected' : 'Disabled'; await connection.save(); res.json(connection);
}));
router.get('/apis/:id/documentation', wrap(async (req, res) => {
  const api = await get(ProjectApi, req.params.id); const endpoints = await Endpoint.find({ apiId: api._id }).lean();
  res.json({ openapi: '3.1.0', info: { title: api.name, version: api.version },
    servers: [{ url: `/api/v1/projects/${api.namespace}` }],
    security: [{ portalBearer: [] }], components: { securitySchemes: { portalBearer: { type: 'http', scheme: 'bearer' } } },
    paths: Object.fromEntries(endpoints.map(e => [`/${e._id}`, { [e.method.toLowerCase()]: {
      summary: e.name, 'x-module': e.module, 'x-dataset': e.dataset, 'x-operation': e.operation,
      'x-sharing-enabled': e.shared, 'x-shared-fields': e.sharedFields,
      description: 'Requires an active portal connection and explicit endpoint, operation and field grants.',
      ...(e.method !== 'GET' ? { requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, properties: Object.fromEntries(Object.entries(e.requestSchema).map(([k,v]) => [k, { type: v }])) } } } } } : {}),
      responses: { 200: { description: 'Authorized fields only', content: { 'application/json': { schema: { type: 'object', properties: { data: { oneOf: [{ type: 'object', properties: Object.fromEntries(e.sharedFields.map(k => [k, { type: e.responseSchema[k] }])) }, { type: 'array', items: { type: 'object', properties: Object.fromEntries(e.sharedFields.map(k => [k, { type: e.responseSchema[k] }])) } }] } } } } } } },
    } }])) });
}));
// Existing Policy/YarrowTech project routes share this prefix. Only claim the
// UUID-suffixed namespaces created by this registry; pass all other routes on.
gateway.use((req, res, next) => {
  if (!/^\/[a-z0-9-]+-[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\//i.test(req.path)) return next('router');
  res.set('Cache-Control', 'no-store'); next();
});
gateway.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
async function executeGateway(req) {
  const started = Date.now(); let context = {}; let status = 500;
  try {
    const match = /^\/([a-z0-9-]+)\/([a-f\d]{24})(\/cache)?$/i.exec(req.path);
    if (!match) fail('Endpoint not found', 404);
    if (Object.keys(req.query).length) fail('Query parameters are not registered for this endpoint');
    const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '')?.[1];
    if (!token) fail('Portal server credential required', 401);
    const portal = await Portal.findOne({ tokenHash: hash(token), enabled: true });
    if (!portal) fail('Invalid portal credential', 401);
    const api = await ProjectApi.findOne({ namespace: match[1], enabled: true }).select('+credential');
    if (!api) fail('Project API unavailable', 404);
    context = { apiId: api._id, portalId: portal._id };
    const connection = await Connection.findOne({ apiId: api._id, portalId: portal._id, status: 'Connected' });
    if (!connection) fail('Connection not authorized', 403);
    context.connectionId = connection._id;
    const endpoints = await validateGrants(api._id, connection.grants);
    if (connection.testedDigest !== digest(api, connection, endpoints)) fail('Connection configuration changed; retest required', 403);
    const endpoint = endpoints.find(e => e.id === match[2]);
    const grant = connection.grants.find(g => String(g.endpointId) === match[2]);
    if (!endpoint || !grant || req.method !== endpoint.method || !grant.operations.includes(endpoint.operation)) fail('Endpoint operation not authorized', 403);
    context.endpointId = endpoint._id;
    let body;
    if (req.method !== 'GET') {
      if (!req.body || Object.keys(req.body).some(k => !grant.fields.includes(k))) fail('Unapproved request field', 403);
      body = security.validateRecord(req.body, endpoint.requestSchema, grant.fields, 400);
      if (!Object.keys(body).length) fail('Empty update rejected');
    }
    if (match[3]) {
      if (req.method !== 'GET' || !grant.operations.includes('sync')) fail('Synchronization access required', 403);
      const job = await SyncJob.findOne({ connectionId: connection._id, endpointId: endpoint._id, enabled: true }).select('+cache');
      if (!job?.lastSyncedAt || job.cacheDigest !== connection.testedDigest) fail('Synchronized snapshot unavailable', 409);
      await Event.create({ kind: 'request', ...context, action: 'cache.read', status: 200, durationMs: Date.now() - started });
      return { data: job.cache, synchronizedAt: job.lastSyncedAt };
    }
    // Persist intent before any upstream side effect; logging failure fails closed.
    await Event.create({ kind: 'request', ...context, action: 'gateway.attempt', status: 102 });
    const result = security.projectResponse(await security.request(api, endpoint, body), endpoint, grant.fields);
    await Connection.updateOne({ _id: connection._id }, { lastFetchedAt: new Date() });
    await ProjectApi.updateOne({ _id: api._id }, { lastFetchedAt: new Date() });
    status = 200;
    await Event.create({ kind: 'request', ...context, action: 'gateway.complete', status, durationMs: Date.now() - started });
    return { data: result };
  } catch (error) {
    status = error.status || 400;
    await Event.create({ kind: 'request', ...context, action: 'gateway.failed', status, durationMs: Date.now() - started });
    throw error;
  }
}
gateway.use(wrap(async (req, res) => res.json(await executeGateway(req))));
webhooks.use(rateLimit({ windowMs: 60000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }));
webhooks.post('/:id', wrap(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const jobId = id.parse(req.params.id);
  const { eventId } = z.object({ eventId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/) }).strict().parse(req.body);
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '')?.[1];
  if (!token) fail('Webhook credential required', 401);
  const job = await SyncJob.findOne({ _id: jobId, enabled: true, webhookHash: hash(token) });
  if (!job) fail('Invalid webhook credential', 401);
  try { await SyncReceipt.create({ jobId, eventId, expiresAt: new Date(Date.now() + 7 * 86400000) }); }
  catch (error) { if (error.code === 11000) return res.json({ duplicate: true }); throw error; }
  try {
    await require('../services/apiManagement.sync').run(jobId);
    res.json({ success: true });
  } catch (error) { await SyncReceipt.deleteOne({ jobId, eventId }); throw error; }
}));
const errors = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error instanceof z.ZodError ? 400 : error.code === 11000 ? 409 : error.status || 500;
  res.status(status).json({ error: error instanceof z.ZodError ? 'Invalid configuration: ' + error.issues.map(i => i.path.join('.') + ' ' + i.message).join('; ') : status === 409 ? 'This registration already exists' : status >= 500 ? 'API Management request failed. Check provider availability and infrastructure configuration.' : error.message });
};
router.use(errors); gateway.use(errors); webhooks.use(errors);
module.exports = { router, gateway, webhooks, validateGrants, digest, endpointBody, executeGateway };
