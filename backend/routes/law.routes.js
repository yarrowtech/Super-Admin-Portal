// backend/routes/dept/law.routes.js
const express = require('express');
const router = express.Router();
const lawController = require('../controllers/department/law.controller');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

// All routes require authentication and LAW role
router.use(authenticate);
router.use(authorize(ROLES.LAW, ROLES.ADMIN));
router.use(authorizePortalAccess('law'));

// Law/Legal specific routes
router.get('/dashboard', lawController.getDashboard);
router.get('/records', lawController.getRecords);
router.post('/records', lawController.createRecord);
router.put('/records/:id', lawController.updateRecord);
router.delete('/records/:id', lawController.deleteRecord);
router.get('/contracts', lawController.getContracts);
router.get('/compliance', lawController.getCompliance);

module.exports = router;
