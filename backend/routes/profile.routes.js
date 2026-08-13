const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth/auth.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { updateProfileValidation, validate } = require('../middlewares/validate.middleware');
const { ROLES } = require('../config/roles');

router.use(authenticate);
router.use(authorize(
  ROLES.HR,
  ROLES.IT_MANAGER, ROLES.IT_ADMIN, ROLES.IT_EMPLOYEE, ROLES.IT_HR,
  ROLES.FINANCE_MANAGER, ROLES.FINANCE_EMPLOYEE,
  ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE,
  ROLES.MEDIA_HEAD, ROLES.MEDIA_SALES, ROLES.MEDIA_MARKETING,
  ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CEO,
  ROLES.FREELANCER
));

router.get('/me', authController.getMe);
router.patch('/update', updateProfileValidation, validate, authController.updateProfile);
router.post('/upload-resume', uploadSingle('resume'), authController.uploadResume);
router.post('/avatar', uploadSingle('avatar'), authController.uploadAvatar);
router.post('/document', uploadSingle('file'), authController.uploadProfileDocument);

module.exports = router;

