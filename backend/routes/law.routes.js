// backend/routes/dept/law.routes.js
const express = require('express');
const router = express.Router();
const lawController = require('../controllers/department/law.controller');
const hrController = require('../controllers/hr/hrDashboard.controller');
const { departmentScope, mountDepartmentModules } = require('../middlewares/departmentScope.middleware');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { requireProjectContext, attachOptionalProjectContext } = require('../middlewares/project.middleware');
const { uploadMany } = require('../middlewares/upload.middleware');
const { ROLES } = require('../config/roles');
const modularLawRoutes = require('../modules/law/law.routes');
const lawTaskLinks = require('../middlewares/lawTaskLinks');
const lawTeamController = require('../controllers/department/lawTeam.controller');
const employeeChatController = require('../controllers/employee/employeeChat.controller');
const Project = require('../models/common/Project');

// All routes require authentication and LAW role
router.use(authenticate);
// Freelancers associated with Law: ONLY the task-scoped linked-item reads (task must be assigned to them
// and the record linked to it - middlewares/lawTaskLinks.js). Any other role falls through to the gates below.
router.get('/task-items/mine', lawTaskLinks.freelancerOnly, lawTaskLinks.listMyItems);
router.get('/task-items/:taskId', lawTaskLinks.freelancerOnly, lawTaskLinks.listTaskItems);
router.get('/task-items/:taskId/:recordId', lawTaskLinks.freelancerOnly, lawTaskLinks.getTaskItem);
router.get('/task-items/:taskId/:recordId/files/:index', lawTaskLinks.freelancerOnly, lawTaskLinks.viewTaskItemFile);
router.use(authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.IT_MANAGER));
router.use(authorizePortalAccess('law'));
router.use(attachOptionalProjectContext);
// Law employees get NO direct access to the Contracts / Documents / Compliance / Risk data (records,
// contracts, compliance, uploads, dashboards, project catalogue, generic module API). They only see
// records the head links to their tasks, via /task-items below.
router.use(['/module', '/projects', '/dashboard', '/records', '/contracts', '/compliance', '/references'], lawTaskLinks.denyLawEmployee);
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

// Tasks / Attendance / Jobs — department-scoped views over the same shared
// Task/Attendance/JobPost models HR's controller already operates on
// (backend/controllers/hr/hrDashboard.controller.js). No new data model is
// introduced; these endpoints just mirror HR's route surface for Law.
// Law employees see only their own tasks/attendance; only the head (or admin) manages attendance and job postings.
const scope = departmentScope({
  roles: [ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE],
  label: 'Law',
  selfOnlyRoles: [ROLES.LAW_EMPLOYEE],
  // The head is a pure manager (never an assignee); associated freelancers are assignable by the head only.
  headRoles: [ROLES.LAW_HEAD],
  portalKey: 'law',
});
const canManageLaw = authorize(ROLES.LAW_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN);
mountDepartmentModules(router, scope, hrController, {
  manage: canManageLaw,
  taskManage: canManageLaw,
  taskManageRoles: [ROLES.LAW_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  taskBodyHooks: [lawTaskLinks.validateLinkedItems],
});

// Linked items: read-only, task-scoped access (head/admin any linked task; employee only their own
// task AND only records listed on it - enforced in middlewares/lawTaskLinks.js).
router.get('/task-items/options', lawTaskLinks.listLinkableItems);
router.get('/task-items/mine', lawTaskLinks.listMyItems);
router.get('/task-items/:taskId', lawTaskLinks.listTaskItems);
router.get('/task-items/:taskId/:recordId', lawTaskLinks.getTaskItem);
router.get('/task-items/:taskId/:recordId/files/:index', lawTaskLinks.viewTaskItemFile);

// Law-only Team directory + Messages. Restricted to law_head / law_employee here, and the chat
// services independently reject any non-Law recipient/conversation for law-role users
// (utils/departmentChatScope.js), so the restriction holds on every chat endpoint, not just these.
const lawUsersOnly = authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE);
router.get('/team', lawUsersOnly, lawTeamController.getTeam);
router.get('/chat/threads', lawUsersOnly, employeeChatController.getThreads);
router.get('/chat/threads/:threadId/messages', lawUsersOnly, employeeChatController.getMessages);
router.post('/chat/threads/:threadId/messages', lawUsersOnly, employeeChatController.postMessage);
router.post('/chat/threads', lawUsersOnly, employeeChatController.createThread);
router.post('/chat/groups', lawUsersOnly, employeeChatController.createGroupThread);

module.exports = router;
