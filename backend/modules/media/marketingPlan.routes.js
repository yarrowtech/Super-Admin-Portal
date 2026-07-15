const express = require('express');
const { validate } = require('../../middlewares/validate.middleware');
const { canManageMedia } = require('./media.middleware');
const controller = require('./marketingPlan.controller');
const v = require('./marketingPlan.validation');

const router = express.Router();

// Mounted at /api/dept/media/marketing-plans by media.routes.js, which already
// applies authenticate/authorize/authorizePortalAccess upstream.

router.get('/project/:projectId', v.projectIdValidation, validate, controller.getByProject);
router.put('/project/:projectId', canManageMedia, v.projectIdValidation, v.marketingPlanValidation, validate, controller.upsertByProject);

module.exports = router;
