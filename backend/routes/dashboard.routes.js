const express = require('express');
const router = express.Router();
const controller = require('../controllers/common/dashboardWorkflow.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

router.use(authenticate);

router.get('/workflow/me', controller.getMyDashboardWorkflow);
router.get('/workflow/all', authorize(ROLES.ADMIN), controller.getAllDashboardWorkflows);

module.exports = router;

