// backend/routes/dept/law.routes.js
const express = require('express');
const router = express.Router();
const lawController = require('../controllers/department/law.controller');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { requireProjectContext, attachOptionalProjectContext } = require('../middlewares/project.middleware');
const { uploadMany } = require('../middlewares/upload.middleware');
const { ROLES } = require('../config/roles');
const modularLawRoutes = require('../modules/law/law.routes');
const Project = require('../models/common/Project');
const STRICT_PROJECT_NAMES = ['EEC', 'EDIFIGHT8', 'EFMB', 'RMS', 'THE BETTER PASS'];

// All routes require authentication and LAW role
router.use(authenticate);
router.use(authorize(ROLES.LAW, ROLES.LEGAL_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.IT));
router.use(authorizePortalAccess('law'));
router.use(attachOptionalProjectContext);
router.use('/module', modularLawRoutes);

router.get('/projects', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
    const skip = (page - 1) * limit;
    const filter = { name: { $in: STRICT_PROJECT_NAMES } };
    if (String(req.query.source || '').toLowerCase() === 'manager') {
      filter.projectManager = { $exists: true, $ne: null };
    }
    if (req.query.search) {
      const q = new RegExp(req.query.search, 'i');
      filter.$or = [{ name: q }, { description: q }];
    }
    const [items, total] = await Promise.all([
      Project.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Project.countDocuments(filter),
    ]);
    return res.status(200).json({
      success: true,
      data: { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch law projects', details: error.message });
  }
});

// Law/Legal specific routes
router.get('/dashboard', lawController.getDashboard);
router.post('/references/upload', requireProjectContext, uploadMany('files', 10), lawController.uploadReferencePdfs);
router.get('/records', requireProjectContext, lawController.getRecords);
router.post('/records', requireProjectContext, lawController.createRecord);
router.put('/records/:id', requireProjectContext, lawController.updateRecord);
router.delete('/records/:id', requireProjectContext, lawController.deleteRecord);
router.get('/contracts', requireProjectContext, lawController.getContracts);
router.get('/compliance', requireProjectContext, lawController.getCompliance);

module.exports = router;
