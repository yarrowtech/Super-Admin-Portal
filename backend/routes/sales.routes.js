const express = require('express');
const router = express.Router();
const salesController = require('../controllers/department/sales.controller');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { uploadJpegImages } = require('../middlewares/upload.middleware');
const { ROLES } = require('../config/roles');

router.use(authenticate);
router.use(authorize(ROLES.SALES, ROLES.ADMIN));
router.use(authorizePortalAccess('sales'));

router.get('/dashboard', salesController.getDashboard);
router.get('/queries', salesController.listQueries);
router.post('/queries', uploadJpegImages('images', 8), salesController.createQuery);
router.put('/queries/:id', salesController.updateQuery);
router.delete('/queries/:id', salesController.deleteQuery);

router.get('/questions', salesController.listQuestions);
router.post('/questions', salesController.createQuestion);
router.put('/questions/:id', salesController.updateQuestion);
router.delete('/questions/:id', salesController.deleteQuestion);

module.exports = router;

