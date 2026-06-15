const express = require('express');
const controllers = require('../../controllers/admin');

const router = express.Router();

// Admin module workbench APIs (Departments/Security/Reports/Workflows)
router.get('/departments', controllers.modules.getDepartmentsOverview);
router.get('/security', controllers.modules.getSecurityOverview);
router.put('/security/settings/:id', controllers.modules.updateSecuritySetting);
router.get('/reports', controllers.modules.getReportsOverview);
router.post('/reports', controllers.modules.createCustomReport);
router.get('/workflows', controllers.modules.listWorkflows);
router.post('/workflows', controllers.modules.createWorkflow);
router.put('/workflows/:id', controllers.modules.updateWorkflow);
router.delete('/workflows/:id', controllers.modules.deleteWorkflow);

module.exports = router;

