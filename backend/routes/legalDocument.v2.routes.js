const express = require('express');
const ctrl = require('../controllers/legalDocument.v2.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { uploadFields } = require('../middlewares/upload.middleware');
const { ROLES } = require('../config/roles');
const { denyLawEmployee } = require('../middlewares/lawTaskLinks');

const router = express.Router();

router.use(authenticate);
// Law employees have no direct access to the document module (only via task-linked items).
router.use(denyLawEmployee);

router.post(
  '/create',
  authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  uploadFields([
    { name: 'attachment', maxCount: 1 },
    { name: 'sourceFile', maxCount: 1 },
    { name: 'attachments', maxCount: 10 },
  ]),
  ctrl.create
);
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
  '/registry/trash',
  authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.getTrash
);

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
router.patch('/:id/customer-agreement', authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.setCustomerAgreement);
router.post('/:id/approve', authorize(ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.approve);
router.post('/:id/reject', authorize(ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.reject);
router.delete('/:id', authorize(ROLES.LAW_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.deleteDocument);
router.post('/:id/restore-trash', authorize(ROLES.LAW_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.restoreFromTrash);
router.delete('/:id/permanent', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.permanentDelete);
router.post('/:id/archive', authorize(ROLES.LAW_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.archiveDocument);
router.post('/:id/unarchive', authorize(ROLES.LAW_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.restoreFromArchive);

router.get(
  '/:id/versions',
  authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.getVersions
);
router.post('/:id/restore/:versionId', authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN), ctrl.restoreVersion);

module.exports = router;
