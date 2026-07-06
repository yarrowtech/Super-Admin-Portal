const express = require('express');
const { requireProjectContext } = require('../../middlewares/project.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { canManageMedia } = require('./media.middleware');
const controller = require('./checklist.controller');
const v = require('./checklist.validation');

const router = express.Router();

// Mounted at /api/dept/media/checklists by media.routes.js (inherits auth/portal/project middleware).
router.use(requireProjectContext);

router.get('/', controller.list);
router.post('/:checklistType/items', canManageMedia, v.addItemValidation, validate, controller.addItem);
router.patch('/:checklistType/items/:itemId/toggle', canManageMedia, v.toggleItemValidation, validate, controller.toggleItem);

module.exports = router;
