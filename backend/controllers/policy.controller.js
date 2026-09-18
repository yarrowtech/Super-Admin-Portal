const policy = require('../services/policy.service');
const PolicyVersion = require('../models/policy/PolicyVersion');
const PolicyProjectAssignment = require('../models/policy/PolicyProjectAssignment');
const PolicyAcceptance = require('../models/policy/PolicyAcceptance');
const PolicyAuditLog = require('../models/policy/PolicyAuditLog');
const Project = require('../models/common/Project');
const mongoose = require('mongoose');

const send = (res, status, data) => res.status(status).json({ success: true, data });
const run = (handler) => async (req, res, next) => {
  try {
    return await handler(req, res);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, code: error.code || 'VALIDATION_ERROR', error: error.message });
    if (error?.name === 'ValidationError' || error?.name === 'CastError') {
      return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', error: 'Invalid policy request' });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, code: 'CONFLICT', error: 'A policy with this unique value already exists' });
    }
    return next(error);
  }
};
const actor = (req) => req.user.id || req.user._id;

exports.list = run(async (req, res) => send(res, 200, await policy.listPolicies(req.query, req.user)));
exports.get = run(async (req, res) => send(res, 200, await policy.getPolicy(req.params.policyId)));
exports.create = run(async (req, res) => send(res, 201, await policy.createPolicy(req.body, actor(req), req.user)));
exports.update = run(async (req, res) => send(res, 200, await policy.updatePolicy(req.params.policyId, req.body, actor(req))));
exports.remove = run(async (req, res) => send(res, 200, await policy.deletePolicy(req.params.policyId, actor(req))));
exports.versions = run(async (req, res) => { await policy.getPolicy(req.params.policyId); const { page, limit } = policy.page(req.query); const filter = { policyId: req.params.policyId }; const [items, total] = await Promise.all([PolicyVersion.find(filter).sort({ versionNumber: -1 }).skip((page - 1) * limit).limit(limit).lean(), PolicyVersion.countDocuments(filter)]); send(res, 200, { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } }); });
exports.version = run(async (req, res) => { await policy.getPolicy(req.params.policyId); if (!mongoose.Types.ObjectId.isValid(req.params.versionId)) return res.status(404).json({ success: false, code: 'POLICY_VERSION_NOT_FOUND', error: 'Policy version not found' }); const item = await PolicyVersion.findOne({ _id: req.params.versionId, policyId: req.params.policyId }).lean(); if (!item) return res.status(404).json({ success: false, code: 'POLICY_VERSION_NOT_FOUND', error: 'Policy version not found' }); send(res, 200, item); });
exports.createVersion = run(async (req, res) => send(res, 201, await policy.createVersion(req.params.policyId, req.body, actor(req))));
exports.replaceSections = run(async (req, res) => send(res, 200, await policy.replaceSections(req.params.policyId, req.body, actor(req))));
exports.uploadDocuments = run(async (req, res) => send(res, 201, await policy.uploadDocuments(req.params.policyId, req.files, actor(req))));
exports.transition = (state) => run(async (req, res) => send(res, 200, await policy.transition(req.params.policyId, state, actor(req))));
exports.assignments = run(async (req, res) => send(res, 200, await PolicyProjectAssignment.find({ policyId: req.params.policyId }).populate('projectId', 'name projectCode').lean()));
exports.setAssignments = run(async (req, res) => send(res, 200, await policy.setAssignments(req.params.policyId, req.body.projectIds, actor(req))));
exports.projectPolicies = run(async (req, res) => send(res, 200, await policy.applicablePolicies(req.user, req.params.projectId)));
// PolicyGate polls this for every project a user might be viewing, including
// ones they aren't assigned to — that's not a security violation, it just
// means "nothing to show", so it returns an empty result instead of 403.
exports.requirements = run(async (req, res) => {
  try {
    return send(res, 200, await policy.applicablePolicies(req.user, req.params.projectId));
  } catch (error) {
    if (error.code === 'PROJECT_ACCESS_DENIED' || error.code === 'PROJECT_NOT_FOUND') return send(res, 200, { projectId: req.params.projectId, items: [], outstanding: [] });
    throw error;
  }
});
exports.accept = run(async (req, res) => send(res, 200, await policy.acceptPolicy(req.user, req.params.policyId, req.body.projectId, req.ip, req.get('user-agent'))));
exports.myAcceptances = run(async (req, res) => { const { page, limit } = policy.page(req.query); const filter = { userId: actor(req) }; const [items, total] = await Promise.all([PolicyAcceptance.find(filter).sort({ acceptedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), PolicyAcceptance.countDocuments(filter)]); send(res, 200, { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } }); });
exports.adminAcceptances = run(async (req, res) => { const { page, limit } = policy.page(req.query); const [items, total] = await Promise.all([PolicyAcceptance.find({}).sort({ acceptedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), PolicyAcceptance.countDocuments({})]); send(res, 200, { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } }); });
exports.audit = run(async (req, res) => send(res, 200, await PolicyAuditLog.find({ policyId: req.params.policyId }).sort({ createdAt: -1 }).limit(100).lean()));
exports.projectAudit = run(async (req, res) => { await policy.assertProjectAccess(req.user, req.params.projectId); send(res, 200, await PolicyAuditLog.find({ projectId: req.params.projectId }).sort({ createdAt: -1 }).limit(100).lean()); });
exports.projects = run(async (req, res) => {
  const { page, limit } = policy.page(req.query);
  const filter = { archivedAt: null };
  const privileged = ['super_admin', 'admin'].includes(req.user.role);
  if (!privileged) {
    const ids = (Array.isArray(req.user.assignedProjects) ? req.user.assignedProjects : [])
      .map((item) => item?.projectId || item).map(String).filter(mongoose.Types.ObjectId.isValid);
    filter._id = { $in: ids };
  }
  if (req.query.search) filter.$or = ['name', 'projectCode', 'description'].map((field) => ({ [field]: new RegExp(String(req.query.search).slice(0, 100), 'i') }));
  const [items, total] = await Promise.all([Project.find(filter).select('name projectCode description status priority updatedAt').sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Project.countDocuments(filter)]);
  send(res, 200, { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
});
exports.project = run(async (req, res) => { const id = await policy.assertProjectAccess(req.user, req.params.projectId); const item = await Project.findById(id).select('name projectCode description status priority updatedAt').lean(); send(res, 200, item); });

exports.efnbmmsContext = run(async (req, res) => {
  const project = await policy.ensureEfnbmmsProject();
  send(res, 200, { project });
});

exports.listApiClients = run(async (req, res) => send(res, 200, await policy.listApiClients(req.query)));
exports.createApiClient = run(async (req, res) => send(res, 201, await policy.createApiClient(req.body, actor(req))));
exports.updateApiClient = run(async (req, res) => send(res, 200, await policy.updateApiClient(req.params.clientId, req.body, actor(req))));
exports.revokeApiClient = run(async (req, res) => send(res, 200, await policy.revokeApiClient(req.params.clientId, actor(req))));
exports.rotateApiClientSecret = run(async (req, res) => send(res, 200, await policy.rotateApiClientSecret(req.params.clientId, actor(req))));
exports.deleteApiClient = run(async (req, res) => send(res, 200, await policy.deleteApiClient(req.params.clientId, actor(req))));

exports.token = run(async (req, res) => send(res, 200, await policy.issueClientToken(req.body, req.id || req.headers['x-request-id'])));
exports.consumerList = run(async (req, res) => send(res, 200, await policy.listPublishedForClient(req.policyClient, req.query, req.id || req.headers['x-request-id'])));
exports.consumerGet = run(async (req, res) => send(res, 200, await policy.getPublishedForClient(req.policyClient, req.params.policyId, false, req.id || req.headers['x-request-id'])));
exports.consumerGetByCode = run(async (req, res) => send(res, 200, await policy.getPublishedForClient(req.policyClient, req.params.policyCode, true, req.id || req.headers['x-request-id'])));
exports.consumerVersions = run(async (req, res) => send(res, 200, await policy.publishedVersionsForClient(req.policyClient, req.params.policyId, req.query, req.id || req.headers['x-request-id'])));
