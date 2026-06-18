const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');
const { createEfnbmmsProxyService } = require('../services/efnbmmsProxy.service');
const { createProxyController } = require('../controllers/efnbmmsProxy.controller');

const service = createEfnbmmsProxyService({
  label: 'EFNBMMS admin API',
  baseUrlKeys: ['EFNBMMS_ADMIN_API_URL', 'EFMBMMS_ADMIN_API_URL'],
  tokenKeys: ['EFNBMMS_API_TOKEN', 'EFMBMMS_API_TOKEN', 'SUPER_ADMIN_PORTAL_SERVICE_TOKEN'],
});

const router = express.Router();
const proxyAdminApi = createProxyController(service, 'EFNBMMS admin API');

router.use(authenticate);
router.use(authorize(ROLES.SUPER_ADMIN));
router.all('*', proxyAdminApi);

module.exports = router;
