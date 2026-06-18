const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');
const { createEfnbmmsProxyService } = require('../services/efnbmmsProxy.service');
const { createProxyController } = require('../controllers/efnbmmsProxy.controller');

const service = createEfnbmmsProxyService({
  label: 'EFNBMMS manager API',
  baseUrlKeys: ['EFNBMMS_MANAGER_API_URL', 'EFMBMMS_MANAGER_API_URL'],
  tokenKeys: ['EFNBMMS_API_TOKEN', 'EFMBMMS_API_TOKEN', 'SUPER_ADMIN_PORTAL_SERVICE_TOKEN'],
});

const router = express.Router();
const proxyManagerApi = createProxyController(service, 'EFNBMMS manager API');

router.use(authenticate);
router.use(authorize(ROLES.SUPER_ADMIN));
router.all('*', proxyManagerApi);

module.exports = router;
