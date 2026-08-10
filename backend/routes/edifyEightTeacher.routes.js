const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { requireProjectTeacherPermission } = require('../middlewares/projectTeacherPermission.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { ROLES } = require('../config/roles');
const controller = require('../controllers/outsourcing/edifyEightTeacher.controller');
const materialController = require('../controllers/outsourcing/edifyEightStudyMaterial.controller');

const router = express.Router();
const allowedRoles = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR, ROLES.FREELANCER];

router.use(authenticate);
router.use(authorize(...allowedRoles));

router.get('/teachers/stats', requireProjectTeacherPermission('EEC', 'edifyeight:teachers:read'), controller.getTeacherStats);
router.get('/teachers', requireProjectTeacherPermission('EEC', 'edifyeight:teachers:read'), controller.listTeachers);
router.get('/teachers/:teacherId', requireProjectTeacherPermission('EEC', 'edifyeight:teachers:read'), controller.getTeacher);
router.post('/teachers', requireProjectTeacherPermission('EEC', 'edifyeight:teachers:create'), controller.createTeacher);
router.put('/teachers/:teacherId', requireProjectTeacherPermission('EEC', 'edifyeight:teachers:update'), controller.updateTeacher);
router.delete('/teachers/:teacherId', requireProjectTeacherPermission('EEC', 'edifyeight:teachers:delete'), controller.deleteTeacher);

router.get('/study-materials/stats', requireProjectTeacherPermission('EEC', 'edifyeight:study-materials:read'), materialController.getMaterialStats);
router.get('/study-materials/metadata', requireProjectTeacherPermission('EEC', 'edifyeight:study-materials:read'), materialController.getMetadata);
router.get('/study-materials', requireProjectTeacherPermission('EEC', 'edifyeight:study-materials:read'), materialController.listMaterials);
router.post('/study-materials', requireProjectTeacherPermission('EEC', 'edifyeight:study-materials:create'), uploadSingle('pdf'), materialController.createMaterial);
router.put('/study-materials/:materialId', requireProjectTeacherPermission('EEC', 'edifyeight:study-materials:update'), uploadSingle('pdf'), materialController.updateMaterial);
router.delete('/study-materials/:materialId', requireProjectTeacherPermission('EEC', 'edifyeight:study-materials:delete'), materialController.deleteMaterial);

module.exports = router;
