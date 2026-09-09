const { resolveManagerScope } = require('../services/managerScope.service');
const Task = require('../models/common/Task');
const User = require('../models/auth/User');
const Project = require('../models/common/Project');
const Leave = require('../models/hr/Leave');
const Report = require('../models/hr/StaffWorkReport');
const managerScope = async (req, res, next) => {
  try {
    req.managerScope = await resolveManagerScope(req.user);
    const [resource, id] = req.path.split('/').filter(Boolean);
    const entries = { tasks: [Task, req.managerScope.tasks], leave: [Leave, req.managerScope.leaves], 'employee-work': [Report, req.managerScope.reports] };
    if (id && /^[a-f0-9]{24}$/i.test(id) && entries[resource]) {
      const [Model, scope] = entries[resource];
      if (!await Model.exists({ $and: [{ _id: id }, scope] })) return res.status(403).json({ success: false, error: 'Record is outside your managed scope', code: 'FORBIDDEN' });
    }
    if (req.method !== 'GET' && resource === 'tasks') {
      if (req.body.assignedTo && !await User.exists({ $and: [{ _id: req.body.assignedTo, isActive: true }, req.managerScope.employees] })) {
        return res.status(403).json({ success: false, error: 'Assignee is outside your managed team', code: 'FORBIDDEN' });
      }
      if (req.body.project && !await Project.exists({ _id: req.body.project, ...req.managerScope.projects, status: { $in: ['planning', 'in-progress'] } })) {
        return res.status(403).json({ success: false, error: 'Project is not active or managed by you', code: 'FORBIDDEN' });
      }
    }
    next();
  } catch (error) { next(error); }
};
module.exports = managerScope;
