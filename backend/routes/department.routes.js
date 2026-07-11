const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const itController = require('../controllers/department/it.controller');
const mediaController = require('../controllers/department/media.controller');
const lawController = require('../controllers/department/law.controller');
const salesController = require('../controllers/department/sales.controller');
const otherDepartmentController = require('../controllers/department/otherDepartment.controller');
const salesRoutes = require('./sales.routes');

const router = express.Router();

router.use(authenticate);
router.use('/media', (req, res, next) => {
  if (req.log?.child) {
    req.log = req.log.child({ module: 'media', portal: 'media', routeSource: 'department' });
  }
  next();
});

router.get('/it/dashboard', itController.getDashboard);
router.get('/media/dashboard', mediaController.getDashboard);
router.get('/law/dashboard', lawController.getDashboard);
router.get('/sales/dashboard', salesController.getDashboard);
router.use('/sales', salesRoutes);
router.get('/other/dashboard', otherDepartmentController.getDashboard);

module.exports = router;
