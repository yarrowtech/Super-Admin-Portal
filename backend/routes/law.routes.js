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

// All routes require authentication and LAW role
router.use(authenticate);
router.use(authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.IT_MANAGER));
router.use(authorizePortalAccess('law'));
router.use(attachOptionalProjectContext);
router.use('/module', modularLawRoutes);

router.get('/projects', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
    const skip = (page - 1) * limit;
    // The Law Portal is an organization-wide registry. Return every persisted
    // project instead of maintaining a second allow-list that can drift from
    // the actual project catalogue.
    const clauses = [];
    if (String(req.query.source || '').toLowerCase() === 'manager') {
      clauses.push({ projectManager: { $exists: true, $ne: null } });
    }
    if (req.query.search) {
      const q = new RegExp(req.query.search, 'i');
      clauses.push({ $or: [{ name: q }, { description: q }, { projectCode: q }] });
    }
    const filter = clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { $and: clauses };
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
router.get('/records/:id/references/:index/view', requireProjectContext, lawController.viewReferencePdf);
router.get('/records', lawController.getRecords);
router.post('/records', requireProjectContext, lawController.createRecord);
router.put('/records/:id', requireProjectContext, lawController.updateRecord);
router.delete('/records/:id', requireProjectContext, lawController.deleteRecord);
router.get('/contracts', requireProjectContext, lawController.getContracts);
router.get('/compliance', requireProjectContext, lawController.getCompliance);

module.exports = router;
