const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth/auth.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { updateProfileValidation, validate } = require('../middlewares/validate.middleware');
const { ROLES } = require('../config/roles');

router.use(authenticate);
router.use(authorize(ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.FINANCE, ROLES.IT, ROLES.LAW, ROLES.MEDIA, ROLES.SALES, ROLES.RESEARCH_OPERATOR, ROLES.ADMIN, ROLES.CEO));

router.get('/me', authController.getMe);
router.patch('/update', updateProfileValidation, validate, authController.updateProfile);
router.post('/upload-resume', uploadSingle('resume'), authController.uploadResume);
router.post('/avatar', uploadSingle('avatar'), authController.uploadAvatar);

module.exports = router;

