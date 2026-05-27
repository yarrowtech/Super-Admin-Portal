// backend/routes/legalDocument.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/legalDocument.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

// All routes require authentication
router.use(authenticate);

// ── LAW PORTAL ────────────────────────────────────────────────────────────────
// IMPORTANT: specific named routes must come BEFORE /:id wildcard routes

router.post(
  '/create',
  authorize(ROLES.LAW, ROLES.LEGAL_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.create
);

router.get(
  '/my/documents',
  authorize(ROLES.LAW, ROLES.LEGAL_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.myDocuments
);

// ── CEO PORTAL ────────────────────────────────────────────────────────────────
router.get(
  '/queue/pending',
  authorize(ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.getPending
);

// ── ADMIN / LSW PORTAL ────────────────────────────────────────────────────────
router.get(
  '/registry/approved',
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CEO, ROLES.MANAGER, ROLES.LAW, ROLES.LEGAL_HEAD),
  ctrl.getApproved
);

router.get(
  '/registry/all',
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CEO),
  ctrl.getAll
);

// ── VERSION — specific versionId routes ──────────────────────────────────────
router.get(
  '/version/:versionId',
  authorize(ROLES.LAW, ROLES.LEGAL_HEAD, ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER),
  ctrl.getVersionById
);

// ── Document-level routes with :id ────────────────────────────────────────────
// GET by ID – shared read access
router.get(
  '/:id',
  authorize(ROLES.LAW, ROLES.LEGAL_HEAD, ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER),
  ctrl.getById
);

router.put(
  '/:id/auto-save',
  authorize(ROLES.LAW, ROLES.LEGAL_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.autoSave
);

router.put(
  '/:id/save-draft',
  authorize(ROLES.LAW, ROLES.LEGAL_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.saveDraft
);

router.post(
  '/:id/submit',
  authorize(ROLES.LAW, ROLES.LEGAL_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.submit
);

router.post(
  '/:id/approve',
  authorize(ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.approve
);

router.post(
  '/:id/reject',
  authorize(ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.reject
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.deleteDocument
);

// ── VERSION CONTROL ───────────────────────────────────────────────────────────
router.get(
  '/:id/versions',
  authorize(ROLES.LAW, ROLES.LEGAL_HEAD, ROLES.CEO, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER),
  ctrl.getVersions
);

router.post(
  '/:id/restore/:versionId',
  authorize(ROLES.LAW, ROLES.LEGAL_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ctrl.restoreVersion
);

module.exports = router;
