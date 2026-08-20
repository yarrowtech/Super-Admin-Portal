const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const projectAccessController = require('../controllers/projectAccess.controller');

router.get('/my-projects', authenticate, projectAccessController.getMyProjects);
router.get('/workspace', authenticate, projectAccessController.getWorkspaceCatalog);
router.get('/workspace/catalog', authenticate, projectAccessController.getWorkspaceCatalog);
router.get('/project-permissions', authenticate, projectAccessController.getProjectPermissions);
router.get('/project-roles', authenticate, projectAccessController.getProjectRoles);
router.post('/project-access/:projectCode', authenticate, projectAccessController.generateProjectAccessToken);
router.post('/sso/generate-token', authenticate, projectAccessController.generateProjectAccessToken);
router.post('/sso/verify-token', projectAccessController.verifyProjectAccessToken);

module.exports = router;
