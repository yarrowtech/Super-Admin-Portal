const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePolicyPermission: permit } = require('../middlewares/policyAuthorization.middleware');
const { uploadMany } = require('../middlewares/upload.middleware');
const controller = require('../controllers/policy.controller');
const router = express.Router();
router.use(authenticate);
router.get('/efnbmms/context', controller.efnbmmsContext);
router.get('/projects', controller.projects);
router.get('/projects/:projectId', controller.project);
router.get('/projects/:projectId/policies', permit('policy.read'), controller.projectPolicies);
router.get('/projects/:projectId/policies/active', controller.projectPolicies);
router.get('/projects/:projectId/policy-requirements', controller.requirements);
router.get('/projects/:projectId/policy-audit', permit('policy.audit.read'), controller.projectAudit);
router.get('/users/me/policy-acceptances', controller.myAcceptances);
router.get('/admin/policy-acceptances', permit('policy.acceptance.read'), controller.adminAcceptances);
router.get('/policies', permit('policy.read'), controller.list);
router.post('/policies', permit('policy.create'), controller.create);
router.get('/policies/:policyId', permit('policy.read'), controller.get);
router.patch('/policies/:policyId', permit('policy.update'), controller.update);
router.delete('/policies/:policyId', permit('policy.delete'), controller.remove);
router.get('/policies/:policyId/versions', permit('policy.read'), controller.versions);
router.get('/policies/:policyId/versions/:versionId', permit('policy.read'), controller.version);
router.post('/policies/:policyId/versions', permit('policy.update'), controller.createVersion);
router.put('/policies/:policyId/sections', permit('policy.update'), controller.replaceSections);
router.post('/policies/:policyId/documents', permit('policy.update'), uploadMany('files', 10), controller.uploadDocuments);
router.post('/policies/:policyId/submit-review', permit('policy.review'), controller.transition('IN_REVIEW'));
router.post('/policies/:policyId/approve', permit('policy.approve'), controller.transition('APPROVED'));
router.post('/policies/:policyId/publish', permit('policy.publish'), controller.transition('PUBLISHED'));
router.post('/policies/:policyId/archive', permit('policy.archive'), controller.transition('ARCHIVED'));
router.get('/policies/:policyId/projects', permit('policy.assignment.read'), controller.assignments);
router.put('/policies/:policyId/projects', permit('policy.assignment.manage'), controller.setAssignments);
router.post('/policies/:policyId/accept', controller.accept);
router.get('/policies/:policyId/audit-log', permit('policy.audit.read'), controller.audit);

// EFNBMMS consumer API client management (client_id/client_secret provisioning
// for projects that will call the public /auth/token + policy consumer API).
router.get('/api-clients', permit('policy.assignment.manage'), controller.listApiClients);
router.post('/api-clients', permit('policy.assignment.manage'), controller.createApiClient);
router.patch('/api-clients/:clientId', permit('policy.assignment.manage'), controller.updateApiClient);
router.delete('/api-clients/:clientId', permit('policy.assignment.manage'), controller.deleteApiClient);
router.post('/api-clients/:clientId/revoke', permit('policy.assignment.manage'), controller.revokeApiClient);
router.post('/api-clients/:clientId/rotate-secret', permit('policy.assignment.manage'), controller.rotateApiClientSecret);

module.exports = router;
