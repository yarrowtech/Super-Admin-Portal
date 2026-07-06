const express = require('express');
const { requireProjectContext } = require('../../middlewares/project.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { canManageMedia } = require('./media.middleware');
const controller = require('./weeklyPlan.controller');
const v = require('./weeklyPlan.validation');

const router = express.Router();

// Mounted at /api/dept/media/weekly-plans by media.routes.js (inherits auth/portal/project middleware).
router.use(requireProjectContext);

router.get('/', controller.list);
router.post('/', canManageMedia, v.planValidation, validate, controller.create);
router.patch('/:id/objectives/:objectiveId', canManageMedia, v.objectiveIdValidation, v.objectiveStatusValidation, validate, controller.updateObjective);

module.exports = router;
