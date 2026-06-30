const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');
const { createEfnbmmsProxyService } = require('../services/efnbmmsProxy.service');
const { createProxyController } = require('../controllers/efnbmmsProxy.controller');

const service = createEfnbmmsProxyService({
  label: 'EFNBMMS admin-management API',
  baseUrlKeys: ['EFNBMMS_ADMIN_MANAGEMENT_API_URL', 'EFMBMMS_ADMIN_MANAGEMENT_API_URL'],
  tokenKeys: ['EFNBMMS_API_TOKEN', 'EFMBMMS_API_TOKEN'],
});

const router = express.Router();
const proxyAdminManagementApi = createProxyController(service, 'EFNBMMS admin-management API');

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN));

router.all('*', proxyAdminManagementApi);

module.exports = router;
