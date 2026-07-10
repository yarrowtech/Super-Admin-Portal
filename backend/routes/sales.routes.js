const express = require('express');
const router = express.Router();
const salesController = require('../controllers/department/sales.controller');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { uploadMany } = require('../middlewares/upload.middleware');
const { ROLES } = require('../config/roles');

router.use(authenticate);
router.use(authorize(ROLES.SALES, ROLES.ADMIN));
router.use(authorizePortalAccess('sales'));

router.get('/dashboard', salesController.getDashboard);
router.get('/queries', salesController.listQueries);
router.post('/queries', uploadMany('images', 8), salesController.createQuery);

module.exports = router;

