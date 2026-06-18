const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');
const controller = require('../controllers/efnbmms.controller');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.SUPER_ADMIN));

router.all('*', controller.proxyAdminManagement);

module.exports = router;
