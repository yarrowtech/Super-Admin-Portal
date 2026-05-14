const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');
const smartHrController = require('../controllers/hr/smartHr.controller');

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.HR));

router.get('/hr/overview', smartHrController.getAnalyticsOverview);
router.get('/hr/predictive-alerts', smartHrController.getPredictiveAlerts);

module.exports = router;
