const express = require('express');
const { requireProjectContext } = require('../../middlewares/project.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { canManageMedia } = require('./media.middleware');
const controller = require('./kpi.controller');
const v = require('./kpi.validation');

const router = express.Router();

// Mounted at /api/dept/media/kpi by media.routes.js (inherits auth/portal/project middleware).
router.use(requireProjectContext);

router.get('/', controller.getSnapshot);
router.put('/', canManageMedia, v.snapshotValidation, validate, controller.upsertSnapshot);
router.get('/funnel', controller.getFunnel);
router.get('/trend', controller.getKpiTrend);

module.exports = router;
