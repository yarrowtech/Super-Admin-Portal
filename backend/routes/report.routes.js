const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');
const reportsController = require('../controllers/common/reports.controller');
const smartHrController = require('../controllers/hr/smartHr.controller');

router.use(authenticate);
router.get('/', reportsController.getReports);
router.get('/hr/overview', authorize(ROLES.ADMIN, ROLES.HR), smartHrController.getHrReports);

module.exports = router;
