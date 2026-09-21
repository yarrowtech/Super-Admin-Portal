const User = require('../models/auth/User');
const Task = require('../models/common/Task');
const Attendance = require('../models/hr/Attendance');
const JobPost = require('../models/hr/JobPost');
const { ROLES } = require('../config/roles');
const { freelancersForPortalFilter } = require('../utils/freelancerPortals');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const idStr = (v) => String(v && v._id ? v._id : v);

// Restricts the shared HR Task/Attendance/JobPost handlers to one department's users.
// List handlers read req.scopeFilters; :id and body-target requests are checked here.
// Options:
//   roles          roles whose users make up the department
//   label          JobPost.department label
//   resolveUserIds optional async (req) => ids[]; overrides `roles` (e.g. a manager's team)
//   selfOnlyRoles  roles that only ever see/act on their own records
//   headRoles      department heads: pure managers, never valid task assignees (their existing tasks
//                  stay visible). Only these roles (and admins) may see/assign associated freelancers.
//   portalKey      'it' | 'finance' | 'law' | 'media' | ...: also scopes tasks to freelancers associated
//                  with this portal (User.metadata.associatedPortals, see utils/freelancerPortals.js)
//   sourcePortal   stamped on created tasks (Task.sourcePortal); defaults to portalKey
const departmentScope = ({ roles = [], label, resolveUserIds = null, selfOnlyRoles = [], headRoles = [], portalKey = null, sourcePortal = null }) => {
  const stampPortal = sourcePortal || portalKey;
  const roleOf = (req) => String(req.user?.role || '').toLowerCase();
  const canManageFreelancers = (req) =>
    [...headRoles, ROLES.ADMIN, ROLES.SUPER_ADMIN, 'superadmin'].includes(roleOf(req));
  const jobDeptRegex = new RegExp(`^${escapeRegex(label)}$`, 'i');

  const loadScope = async (req, res, next) => {
    try {
      let ids;
      let freelancerIds = [];
      let headIds = [];
      if (selfOnlyRoles.includes(roleOf(req))) {
        ids = [idStr(req.user._id)];
      } else if (resolveUserIds) {
        ids = Array.from(new Set([...(await resolveUserIds(req)).map(idStr), idStr(req.user._id)]));
      } else {
        const users = await User.find({ role: { $in: roles } }).select('_id').lean();
        ids = users.map((u) => idStr(u._id));
      }
      if (!selfOnlyRoles.includes(roleOf(req))) {
        if (headRoles.length) {
          headIds = (await User.find({ role: { $in: headRoles } }).select('_id').lean()).map((u) => idStr(u._id));
        }
        if (portalKey && canManageFreelancers(req)) {
          freelancerIds = (await User.find(freelancersForPortalFilter(portalKey)).select('_id').lean()).map((u) => idStr(u._id));
        }
      }
      req.deptUserIds = new Set(ids);
      req.deptHeadIds = new Set(headIds);
      req.deptFreelancerIds = new Set(freelancerIds);
      req.scopeFilters = {
        task: { assignedTo: { $in: [...ids, ...freelancerIds] } },
        attendance: { employee: { $in: ids } },
        job: { department: jobDeptRegex },
      };
      next();
    } catch (err) {
      next(err);
    }
  };

  const deny = (res, error = 'Outside your department scope') => res.status(403).json({ success: false, error });
  // null when `target` may be assigned a task by this caller, else the rejection message.
  const assigneeError = (req, target) => {
    const id = idStr(target);
    if (req.deptHeadIds.has(id)) return 'Department heads manage tasks and cannot be assigned tasks';
    if (req.deptUserIds.has(id)) return null;
    if (req.deptFreelancerIds.has(id)) return null; // only populated for heads/admins
    return 'Assignee is outside your department scope or not a freelancer associated with this portal';
  };
  const notFound = (res) => res.status(404).json({ success: false, error: 'Not found' });

  const guardById = (Model, inScope) => async (req, res, next) => {
    try {
      const doc = await Model.findById(req.params.id).lean();
      if (!doc) return notFound(res);
      if (!inScope(doc, req)) return deny(res);
      req.scopedTask = doc;
      return next();
    } catch (err) {
      return next(err);
    }
  };

  // GET /members: active users of this department, for assignee/employee pickers.
  // ?for=task returns the task-assignable set instead: department members minus heads, plus this
  // portal's associated freelancers (flagged isFreelancer; heads/admins only).
  const listMembers = async (req, res, next) => {
    try {
      const forTask = String(req.query.for || '').toLowerCase() === 'task';
      const ids = forTask
        ? [...req.deptUserIds].filter((id) => !req.deptHeadIds.has(id)).concat([...req.deptFreelancerIds])
        : Array.from(req.deptUserIds);
      const users = await User.find({ _id: { $in: ids }, isActive: { $ne: false } })
        .select('firstName lastName email role department isActive')
        .sort({ firstName: 1, lastName: 1 })
        .lean();
      const data = forTask ? users.map((u) => ({ ...u, isFreelancer: u.role === ROLES.FREELANCER })) : users;
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  return {
    loadScope,
    listMembers,
    // Tasks must be assigned to a department member (never a head) or, for heads/admins, to a
    // freelancer associated with this portal. Non-head members default to themselves.
    scopeTaskCreate: (req, res, next) => {
      if (!req.body.assignedTo) {
        if (req.deptHeadIds.has(idStr(req.user._id))) {
          return res.status(400).json({ success: false, error: 'Choose a team member to assign this task to' });
        }
        req.body.assignedTo = req.user._id;
      }
      const err = assigneeError(req, req.body.assignedTo);
      if (err) return deny(res, err);
      req.taskSourcePortal = stampPortal || undefined;
      return next();
    },
    // Reassigning a task must land on an assignable person too (keeping the current assignee is fine).
    scopeTaskReassign: (req, res, next) => {
      const target = req.body?.assignedTo;
      if (!target || (req.scopedTask && idStr(req.scopedTask.assignedTo) === idStr(target))) return next();
      const err = assigneeError(req, target);
      return err ? deny(res, err) : next();
    },
    guardTask: guardById(Task, (t, req) => {
      const a = idStr(t.assignedTo);
      return req.deptUserIds.has(a) || req.deptFreelancerIds.has(a);
    }),
    scopeAttendanceCreate: (req, res, next) => {
      req.body.employee = req.body.employee || req.user._id;
      return req.deptUserIds.has(idStr(req.body.employee)) ? next() : deny(res);
    },
    guardAttendance: guardById(Attendance, (a, req) =>
      req.deptUserIds.has(idStr(a.employee)) && (!req.body?.employee || req.deptUserIds.has(idStr(req.body.employee)))),
    guardEmployeeParam: (req, res, next) =>
      req.deptUserIds.has(String(req.params.employeeId)) ? next() : deny(res),
    // Job posts are always stamped with the department label.
    scopeJobCreate: (req, res, next) => {
      req.body.department = label;
      next();
    },
    guardJob: guardById(JobPost, (j) => jobDeptRegex.test(j.department || '')),
    lockJobDepartment: (req, res, next) => {
      if (req.body) req.body.department = label;
      next();
    },
  };
};

// Mounts the shared Tasks / Attendance / Jobs / members endpoints on a router.
// opts.tasks=false skips tasks (portal already has its own); opts.manage is an
// optional middleware gating attendance writes and jobs (staff-only portals).
// opts.taskManage (+ opts.taskManageRoles) restricts task create/close/delete and full edits.
// opts.jobs=false skips the job-post module entirely — recruitment/job-posting
// is an HR-only feature; only Law's department-head-gated portal keeps it.
const mountDepartmentModules = (router, scope, hrController, opts = {}) => {
  const manage = opts.manage ? [opts.manage] : [];
  router.get('/members', scope.loadScope, scope.listMembers);
  if (opts.tasks !== false) {
    // opts.taskManage: only these users create/edit/close/delete tasks; everyone else may only
    // move status/progress on tasks the scope already limits to them.
    const taskManage = opts.taskManage ? [opts.taskManage] : [];
    const memberTaskUpdate = (req, res, next) => {
      if (!opts.taskManage) return next();
      const role = String(req.user?.role || '').toLowerCase();
      if (opts.taskManageRoles && opts.taskManageRoles.includes(role)) return next();
      const { status, progress } = req.body || {};
      req.body = {};
      if (status !== undefined) req.body.status = status;
      if (progress !== undefined) req.body.progress = progress;
      return next();
    };
    const deleteTask = async (req, res, next) => {
      try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Task deleted' });
      } catch (err) {
        next(err);
      }
    };
    router.get('/tasks', scope.loadScope, hrController.getTasks);
    // opts.taskBodyHooks: extra body-validating middlewares (e.g. Law's linked-item check).
    const bodyHooks = Array.isArray(opts.taskBodyHooks) ? opts.taskBodyHooks : [];
    router.post('/tasks', ...taskManage, scope.loadScope, scope.scopeTaskCreate, ...bodyHooks, hrController.createTask);
    router.put('/tasks/:id', scope.loadScope, scope.guardTask, scope.scopeTaskReassign, memberTaskUpdate, ...bodyHooks, hrController.updateTask);
    router.put('/tasks/:id/close', ...taskManage, scope.loadScope, scope.guardTask, hrController.closeTask);
    router.delete('/tasks/:id', ...taskManage, scope.loadScope, scope.guardTask, deleteTask);
  }
  router.get('/attendance', scope.loadScope, hrController.getAttendance);
  router.post('/attendance', scope.loadScope, ...manage, scope.scopeAttendanceCreate, hrController.createAttendance);
  router.put('/attendance/:id', scope.loadScope, ...manage, scope.guardAttendance, hrController.updateAttendance);
  router.get('/attendance/employee/:employeeId', scope.loadScope, scope.guardEmployeeParam, hrController.getEmployeeAttendance);
  if (opts.jobs !== false) {
    router.get('/jobs', ...manage, scope.loadScope, hrController.getJobPosts);
    router.post('/jobs', ...manage, scope.scopeJobCreate, hrController.createJobPost);
    router.put('/jobs/:id', ...manage, scope.guardJob, scope.lockJobDepartment, hrController.updateJobPost);
    router.delete('/jobs/:id', ...manage, scope.guardJob, hrController.deleteJobPost);
  }
};

module.exports = { departmentScope, mountDepartmentModules };
