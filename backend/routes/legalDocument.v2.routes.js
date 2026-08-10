const express = require('express');
const ctrl = require('../controllers/legalDocument.v2.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

const router = express.Router();

router.use(authenticate);

router.post('/create', authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.create);
router.get('/my/documents', authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.myDocuments);
router.get('/project/documents', authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.forProject);

router.get('/queue/pending', authorize(ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.getPending);

router.get(
  '/registry/approved',
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CEO, ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE),
  ctrl.getApproved
);
router.get('/registry/all', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CEO), ctrl.getAll);

router.get(
  '/version/:versionId',
  authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.getVersionById
);

router.get(
  '/:id/pdf',
  authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.generatePdf
);

router.get(
  '/:id',
  authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.getById
);
router.put('/:id/auto-save', authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.autoSave);
router.put('/:id/save-draft', authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.saveDraft);
router.post('/:id/submit', authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.submit);
router.post('/:id/approve', authorize(ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.approve);
router.post('/:id/reject', authorize(ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.reject);
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.deleteDocument);

router.get(
  '/:id/versions',
  authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.getVersions
);
router.post('/:id/restore/:versionId', authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.restoreVersion);

module.exports = router;
