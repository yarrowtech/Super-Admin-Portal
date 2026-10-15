const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/organizationWorkspace.controller');

const router = express.Router();

router.use(authenticate);

const records = require('../controllers/workspaceRecords.controller');
const sync = require('../controllers/workspaceSync.controller');
for (const [path, kind] of [['services', 'service'], ['products', 'product'], ['customers', 'customer'], ['support/tickets', 'ticket'], ['plans', 'plan']]) {
  router.get(`/projects/:projectId/${path}`, records.list(kind));
  router.post(`/projects/:projectId/${path}`, records.create(kind));
  router.get(`/${path}/:resourceId`, records.detail(kind));
  router.patch(`/${path}/:resourceId`, records.update(kind));
}
router.get('/subscriptions', records.list('subscription'));
router.post('/subscriptions', records.create('subscription'));
router.get('/subscriptions/:resourceId', records.detail('subscription'));
router.post('/subscriptions/:resourceId/cancel', records.cancel);
router.patch('/subscriptions/:resourceId', records.update('subscription'));
router.get('/products/:resourceId/subscriptions', records.productList('subscription'));
router.get('/products/:resourceId/plans', records.productList('plan'));
router.get('/products/:resourceId/workspace', records.productWorkspace);
router.get('/products/:resourceId/users', records.productUsers);
router.post('/products/:resourceId/users', records.addProductUser);
router.get('/projects/:projectId/analytics', records.analytics);
router.get('/projects/:projectId/users', records.users);
router.get('/projects/:projectId/audit-logs', records.audit);

router.get('/organizations', controller.getOrganizations);
router.get('/organizations/:organizationId', controller.getOrganization);
router.get('/organizations/:organizationId/projects', controller.getOrganizationProjects);
router.get('/projects', controller.getProjects);
router.get('/projects/:projectId', controller.getProject);
router.get('/projects/:projectId/workspace', controller.getProjectWorkspace);
router.get('/projects/:projectId/modules', controller.getProjectModules);
router.get('/projects/:projectId/members', records.users);
router.patch('/projects/:projectId', controller.updateWorkspace);
router.patch('/projects/:projectId/workspace', controller.updateWorkspace);
router.get('/projects/:projectId/integrations', controller.getProjectIntegrations);
router.post('/projects/:projectId/integrations', sync.configure);

router.get('/integrations/:integrationId', controller.getIntegration);
router.patch('/integrations/:integrationId', sync.configure);
router.post('/integrations/:integrationId/test-connection', sync.test);
router.post('/integrations/:integrationId/authorize', sync.test);
router.get('/integrations/:integrationId/status', sync.status);
router.get('/integrations/:integrationId/capabilities', controller.getIntegrationCapabilities);
router.post('/integrations/:integrationId/sync', sync.sync);
router.get('/integrations/:integrationId/sync-jobs', sync.list());
router.get('/integrations/:integrationId/records', sync.list(true));
router.get('/sync-jobs/:jobId', sync.detail);
router.post('/sync-jobs/:jobId/retry', sync.retry);

router.get('/yarrowtech/workspace', controller.getYarrowtechWorkspace);
router.get('/sync-jobs', sync.list());
router.get('/sync-history', sync.list());

module.exports = router;
