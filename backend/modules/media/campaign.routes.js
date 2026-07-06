const express = require('express');
const { requireProjectContext } = require('../../middlewares/project.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { canManageMedia } = require('./media.middleware');
const controller = require('./campaign.controller');
const v = require('./campaign.validation');

const router = express.Router();

// Mounted at /api/dept/media/campaigns by media.routes.js, which already applies
// authenticate/authorize/authorizePortalAccess/attachOptionalProjectContext upstream.

router.get('/', v.listValidation, validate, controller.list);
router.get('/tasks', controller.getAllTasks);
router.post('/', requireProjectContext, canManageMedia, v.campaignRecordValidation, validate, controller.create);
router.get('/:id', v.campaignIdValidation, validate, controller.getById);
router.get('/:id/tasks', v.campaignIdValidation, validate, controller.getTasks);
router.patch('/:id/tasks/:taskId/status', canManageMedia, v.taskIdValidation, v.taskStatusValidation, validate, controller.updateTaskStatus);
router.put('/:id', canManageMedia, v.campaignIdValidation, v.campaignRecordValidation, validate, controller.update);
router.patch('/:id/stage', canManageMedia, v.campaignIdValidation, v.campaignStageValidation, validate, controller.advanceStage);
router.delete('/:id', canManageMedia, v.campaignIdValidation, validate, controller.remove);

module.exports = router;
