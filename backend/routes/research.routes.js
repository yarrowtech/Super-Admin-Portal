const express = require('express');
const router = express.Router();
const otherDepartmentController = require('../controllers/department/otherDepartment.controller');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

router.use(authenticate);
router.use(authorize(ROLES.RESEARCH_OPERATOR, ROLES.ADMIN));
router.use(authorizePortalAccess('research'));

router.get('/dashboard', otherDepartmentController.getDashboard);

module.exports = router;

