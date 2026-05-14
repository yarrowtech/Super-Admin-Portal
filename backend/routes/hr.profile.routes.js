const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hr/hrDashboard.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

router.use(authenticate);
router.use(authorize(ROLES.HR, ROLES.ADMIN));

router.get('/users', hrController.getUserProfiles);
router.get('/user/:id', hrController.getUserProfileById);
router.post('/note/:userId', (req, res, next) => {
  req.params.id = req.params.userId;
  return hrController.addUserInternalNote(req, res, next);
});

module.exports = router;

