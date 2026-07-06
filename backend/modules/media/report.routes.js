const express = require('express');
const { requireProjectContext } = require('../../middlewares/project.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { canManageMedia } = require('./media.middleware');
const controller = require('./report.controller');
const v = require('./report.validation');

const router = express.Router();

// Mounted at /api/dept/media/reports by media.routes.js (inherits auth/portal/project middleware).
router.use(requireProjectContext);

router.get('/', controller.list);
router.post('/generate', canManageMedia, v.generateValidation, validate, controller.generate);

module.exports = router;
