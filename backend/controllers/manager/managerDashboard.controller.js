const logger = require('../../utils/logger');
// backend/controllers/dept/manager.controller.js

const mongoose = require('mongoose');
const { buildManagerSnapshot } = require('../../services/dashboard.service');
const notificationService = require('../../services/notification.service');
const { ROLES } = require('../../config/roles');
const User = require('../../models/auth/User');
const Task = require('../../models/common/Task');
const Project = require('../../models/common/Project');
const Leave = require('../../models/hr/Leave');
const WorkReport = require('../../models/hr/StaffWorkReport');
const ProjectTeam = require('../../models/manager/Team');
const Notice = require('../../models/common/Notification');
const { createGroupThread } = require('../../services/chat.service');
const ChatMessage = require('../../models/common/Message');
const {
  recomputeLeaveBalance,
  logLeaveAction,
  syncLeaveAttendance,
} = require('../../services/leaveManagement.service');
const STRICT_PROJECT_NAMES = ['EEC', 'EDIFIGHT8', 'EFMB', 'RMS', 'THE BETTER PASS'];
const isStrictProjectName = (value) =>
  STRICT_PROJECT_NAMES.includes(String(value || '').trim().toUpperCase());
const hasGlobalManagerAccess = (user) =>
  [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);
const shouldScopeByDepartment = (user) => Boolean(user?.department) && !hasGlobalManagerAccess(user);

const sanitizeQueryValue = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed && trimmed !== 'undefined' && trimmed !== 'null' ? trimmed : undefined;
};

const parsePositiveInt = (value, fallback) => {
  const sanitized = sanitizeQueryValue(value);
  const parsed = parseInt(sanitized, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const formatProjectTeam = (teamDoc) => {
  if (!teamDoc) return null;
  const doc = typeof teamDoc.toObject === 'function' ? teamDoc.toObject() : teamDoc;
  return {
    id: doc._id?.toString?.() || doc.id,
    name: doc.name,
    description: doc.description,
    projectCode: doc.projectCode,
    dueDate: doc.dueDate,
    department: doc.department,
    chatThread: doc.chatThread
      ? {
          id:
            doc.chatThread._id?.toString?.() ||
            doc.chatThread.id ||
            doc.chatThread?.toString?.() ||
            doc.chatThread,
          name: doc.chatThread.name || null,
        }
      : null,
    members: (doc.members || []).map((member) => {
      const employee =
        typeof member.employee === 'object' && member.employee !== null
          ? member.employee
          : null;
      return {
        id: member._id?.toString?.() || member.id,
        role: member.role || employee?.role || 'member',
        assignedAt: member.assignedAt,
        employee: employee
          ? {
              id: employee._id?.toString?.() || employee.id,
              name:
                `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
                employee.email,
              email: employee.email,
              department: employee.department,
            }
          : {
              id: member.employee?.toString?.() || member.employee,
              name: 'Employee',
              email: '',
              department: '',
            },
      };
    }),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

/**
 * @route   GET /api/dept/manager/dashboard
 * @desc    Get Manager dashboard snapshot
 * @access  Private (MANAGER only)
 */
exports.getDashboard = async (req, res) => {
  try {
    const snapshot = await buildManagerSnapshot(req.user);
    res.status(200).json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    logger.error({ err: error }, 'Manager dashboard error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Manager dashboard',
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/dept/manager/team
 * @desc    Get team members
 * @access  Private (MANAGER only)
 */
exports.getTeam = async (req, res) => {
  try {
    const searchTerm = sanitizeQueryValue(req.query.search);
    const roleFilter = sanitizeQueryValue(req.query.role);

    const query = shouldScopeByDepartment(req.user)
      ? { department: req.user.department, isActive: true }
      : { isActive: true };
    if (roleFilter) {
      query.role = roleFilter;
    }
    if (searchTerm) {
      query.$or = [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const team = await User.find(query)
      .select('firstName lastName email role department isActive')
      .sort({ lastName: 1, firstName: 1 });

    res.status(200).json({
      success: true,
      data: {
        message: 'Team Management',
        team
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Manager team error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/manager/project-teams
 * @desc    Get project teams created by manager
 * @access  Private (MANAGER only)
 */
exports.getProjectTeams = async (req, res) => {
  try {
    const teams = await ProjectTeam.find({ manager: req.user._id })
      .populate('members.employee', 'firstName lastName email department role')
      .populate('chatThread', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: teams.map(formatProjectTeam)
    });
  } catch (error) {
    logger.error({ err: error }, 'Manager project teams error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project teams',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/manager/project-teams
 * @desc    Create a new project team and notify members
 * @access  Private (MANAGER only)
 */
exports.createProjectTeam = async (req, res) => {
  try {
    const { name, description, dueDate, memberIds = [], projectCode } = req.body || {};
    const trimmedName = name?.trim();
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        error: 'Team or project name is required'
      });
    }

    const normalizedMemberIds = Array.from(
      new Set(
        (Array.isArray(memberIds) ? memberIds : [])
          .map((id) => (id ? id.toString() : null))
          .filter(Boolean)
      )
    );

    if (!normalizedMemberIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Select at least one employee for the team'
      });
    }

    const employees = await User.find({
      _id: { $in: normalizedMemberIds },
      role: ROLES.EMPLOYEE,
      isActive: true
    }).select('firstName lastName email department role');

    if (employees.length !== normalizedMemberIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more selected employees are invalid or inactive'
      });
    }

    const ceoUsers = await User.find({
      role: ROLES.CEO,
      isActive: true
    }).select('_id');

    const ceoMemberIds = ceoUsers
      .map((ceo) => ceo?._id?.toString?.())
      .filter(Boolean);

    const chatMemberIds = Array.from(new Set([...normalizedMemberIds, ...ceoMemberIds]));

    let chatThreadId = null;
    try {
      const chatGroup = await createGroupThread(req.user, {
        name: trimmedName,
        memberIds: chatMemberIds,
        meta: projectCode ? `Project ${projectCode}` : `${trimmedName} team`
      });
      chatThreadId =
        chatGroup?._id ||
        chatGroup?.id ||
        chatGroup?._id?.toString?.() ||
        chatGroup?.id?.toString?.() ||
        null;

      if (chatThreadId) {
        await ChatMessage.create({
          thread: chatThreadId,
          sender: req.user._id,
          senderName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Manager',
          body: description?.trim()
            ? `You have been assigned to "${trimmedName}". ${description.trim()}`
            : `You have been assigned to project "${trimmedName}".`
        });
      }
    } catch (chatError) {
      logger.warn({ err: chatError }, 'Failed to create chat group for project team');
    }

    let parsedDueDate = null;
    if (dueDate) {
      const tentative = new Date(dueDate);
      if (!Number.isNaN(tentative.getTime())) {
        parsedDueDate = tentative;
      }
    }

    const teamDoc = await ProjectTeam.create({
      name: trimmedName,
      description: description?.trim() || '',
      manager: req.user._id,
      department: req.user.department || null,
      dueDate: parsedDueDate,
      projectCode: projectCode?.trim() || undefined,
      chatThread: chatThreadId,
      members: employees.map((employee) => ({
        employee: employee._id,
        role: employee.role || 'member'
      }))
    });

    const notice = await Notice.create({
      manager: req.user._id,
      managerDepartment: req.user.department || null,
      department: req.user.department || null,
      title: `Project Assignment: ${trimmedName}`,
      message: description?.trim()
        ? description.trim()
        : `You have been assigned to project "${trimmedName}".`,
      type: 'team_assignment',
      target: {
        departments: req.user.department ? [req.user.department] : [],
        managerIds: [req.user._id.toString()]
      },
      metadata: {
        teamId: teamDoc._id,
        employeeIds: employees.map((employee) => employee._id),
        projectCode: projectCode?.trim() || null
      }
    });

    teamDoc.notifications.push(notice._id);
    await teamDoc.save();

    const hydratedTeam = await ProjectTeam.findById(teamDoc._id)
      .populate('members.employee', 'firstName lastName email department role')
      .populate('chatThread', 'name');

    res.status(201).json({
      success: true,
      data: formatProjectTeam(hydratedTeam),
      meta: {
        noticeId: notice._id,
        chatThreadId
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Create project team error');
    res.status(500).json({
      success: false,
      error: 'Failed to create project team',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/manager/projects
 * @desc    Get projects
 * @access  Private (MANAGER only)
 */
exports.getProjects = async (req, res) => {
  try {
    const pageNum = parsePositiveInt(req.query.page, 1);
    const limitNum = parsePositiveInt(req.query.limit, 10);
    const statusFilter = sanitizeQueryValue(req.query.status);
    const searchTerm = sanitizeQueryValue(req.query.search);

    const query = { projectManager: req.user._id, name: { $in: STRICT_PROJECT_NAMES } };
    if (statusFilter) {
      query.status = statusFilter;
    }
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { projectCode: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('teamMembers.employee', 'firstName lastName email department role')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Project.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        message: 'Project Overview',
        projects,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
        currentPage: pageNum
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Manager projects error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/manager/projects
 * @desc    Create project
 * @access  Private (MANAGER only)
 */
exports.createProject = async (req, res) => {
  try {
    const { name, description, startDate, deadline, teamMemberIds = [], priority, status } = req.body || {};
    const trimmedName = name?.trim();
    const trimmedDescription = description?.trim();

    if (!trimmedName || !trimmedDescription || !startDate) {
      return res.status(400).json({
        success: false,
        error: 'name, description and startDate are required'
      });
    }
    if (!isStrictProjectName(trimmedName)) {
      return res.status(400).json({
        success: false,
        error: `Project name must be one of: ${STRICT_PROJECT_NAMES.join(', ')}`
      });
    }

    const memberIds = Array.from(
      new Set(
        (Array.isArray(teamMemberIds) ? teamMemberIds : [])
          .map((id) => (id ? id.toString() : null))
          .filter(Boolean)
      )
    );

    let teamMembers = [];
    if (memberIds.length) {
      const employeeQuery = {
        _id: { $in: memberIds },
        isActive: true
      };
      if (shouldScopeByDepartment(req.user)) {
        employeeQuery.department = req.user.department;
      }
      const employees = await User.find(employeeQuery).select('_id role');
      teamMembers = employees.map((employee) => ({
        employee: employee._id,
        role: employee.role || 'member'
      }));
    }

    const project = await Project.create({
      name: trimmedName.toUpperCase(),
      description: trimmedDescription,
      startDate: new Date(startDate),
      deadline: deadline ? new Date(deadline) : undefined,
      projectManager: req.user._id,
      priority: priority || 'medium',
      status: status || 'planning',
      teamMembers
    });

    const hydrated = await Project.findById(project._id).populate(
      'teamMembers.employee',
      'firstName lastName email department role'
    );

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: hydrated
    });
  } catch (error) {
    logger.error({ err: error }, 'Create manager project error');
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/manager/projects/:id
 * @desc    Update project details
 * @access  Private (MANAGER only)
 */
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project id'
      });
    }

    const {
      name,
      description,
      startDate,
      deadline,
      priority,
      status,
      progress,
      notes
    } = req.body || {};

    const project = await Project.findOne({ _id: id, projectManager: req.user._id });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (typeof name === 'string' && name.trim()) {
      if (!isStrictProjectName(name)) {
        return res.status(400).json({
          success: false,
          error: `Project name must be one of: ${STRICT_PROJECT_NAMES.join(', ')}`
        });
      }
      project.name = name.trim().toUpperCase();
    }
    if (typeof description === 'string' && description.trim()) project.description = description.trim();
    if (typeof priority === 'string' && priority) project.priority = priority;
    if (typeof status === 'string' && status) project.status = status;
    if (typeof notes === 'string') project.notes = notes.trim();
    if (startDate) project.startDate = new Date(startDate);
    if (deadline) project.deadline = new Date(deadline);
    if (progress !== undefined && progress !== null && !Number.isNaN(Number(progress))) {
      project.progress = Number(progress);
    }

    if (project.status === 'completed' && project.progress < 100) {
      project.progress = 100;
      project.endDate = new Date();
    }

    await project.save();

    const hydrated = await Project.findById(project._id).populate(
      'teamMembers.employee',
      'firstName lastName email department role'
    );

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: hydrated
    });
  } catch (error) {
    logger.error({ err: error }, 'Update manager project error');
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/manager/projects/:id/status
 * @desc    Update project status
 * @access  Private (MANAGER only)
 */
exports.updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, progress } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project id'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required'
      });
    }

    const project = await Project.findOne({ _id: id, projectManager: req.user._id });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    project.status = status;
    if (progress !== undefined) {
      project.progress = progress;
    }
    if (status === 'completed' && project.progress < 100) {
      project.progress = 100;
      project.endDate = new Date();
    }
    await project.save();

    res.status(200).json({
      success: true,
      message: 'Project status updated successfully',
      data: project
    });
  } catch (error) {
    logger.error({ err: error }, 'Update manager project status error');
    res.status(500).json({
      success: false,
      error: 'Failed to update project status',
      details: error.message
    });
  }
};

/**
 * @route   DELETE /api/dept/manager/projects/:id
 * @desc    Delete project
 * @access  Private (MANAGER only)
 */
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project id'
      });
    }

    const deleted = await Project.findOneAndDelete({ _id: id, projectManager: req.user._id });
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete manager project error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
      details: error.message
    });
  }
};

/**
 * @route   DELETE /api/dept/manager/project-teams/:teamId/members/:memberId
 * @desc    Remove a member from a manager project team
 * @access  Private (MANAGER only)
 */
exports.removeProjectTeamMember = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(teamId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid teamId or memberId'
      });
    }

    const team = await ProjectTeam.findOne({ _id: teamId, manager: req.user._id });
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Project team not found'
      });
    }

    const before = team.members.length;
    team.members = team.members.filter((member) => member.employee.toString() !== memberId);
    if (team.members.length === before) {
      return res.status(404).json({
        success: false,
        error: 'Member not found in team'
      });
    }

    await team.save();
    const hydrated = await ProjectTeam.findById(team._id)
      .populate('members.employee', 'firstName lastName email department role')
      .populate('chatThread', 'name');

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      data: formatProjectTeam(hydrated)
    });
  } catch (error) {
    logger.error({ err: error }, 'Remove project team member error');
    res.status(500).json({
      success: false,
      error: 'Failed to remove member',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/manager/completed-tasks
 * @desc    Get completed tasks by team members
 * @access  Private (MANAGER only)
 */
exports.getCompletedTasks = async (req, res) => {
  try {
    const { employeeId, status, search } = req.query;
    const pageNum = parsePositiveInt(req.query.page, 1);
    const limitNum = parsePositiveInt(req.query.limit, 10);
    const teamUsers = shouldScopeByDepartment(req.user)
      ? await User.find({ department: req.user.department, isActive: true }).select('_id')
      : await User.find({ role: ROLES.EMPLOYEE, isActive: true }).select('_id');

    const teamUserIds = teamUsers.map((user) => user._id);
    const query = {
      employee: { $in: teamUserIds },
      status: status || 'submitted'
    };
    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      query.employee = employeeId;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [tasks, total] = await Promise.all([
      WorkReport.find(query)
        .populate('employee', 'firstName lastName email department')
        .populate('project', 'name projectCode')
        .sort({ reportDate: -1, createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      WorkReport.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        tasks,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
        currentPage: pageNum
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get completed tasks error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch completed tasks',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/manager/employee-work
 * @desc    Get employee work items
 * @access  Private (MANAGER only)
 */
exports.getEmployeeWork = async (req, res) => {
  try {
    const query = {};
    const reportStatus = sanitizeQueryValue(req.query.status);
    if (reportStatus) {
      query.status = reportStatus;
    }
    if (shouldScopeByDepartment(req.user)) {
      const teamUsers = await User.find({ department: req.user.department }).select('_id');
      query.employee = { $in: teamUsers.map((user) => user._id) };
    }
    const workItems = await WorkReport.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('project', 'name projectCode')
      .sort({ reportDate: -1, createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: workItems
    });
  } catch (error) {
    logger.error({ err: error }, 'Get employee work error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employee work',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/manager/employee-work/stats
 * @desc    Get employee work statistics
 * @access  Private (MANAGER only)
 */
exports.getEmployeeWorkStats = async (req, res) => {
  try {
    const stats = {
      totalCompleted: 0,
      pendingReview: 0,
      totalHours: 0,
      activeEmployees: 0,
      avgCompletionTime: 0,
      productivityTrend: '0%'
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error({ err: error }, 'Get employee work stats error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employee work stats',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/manager/employee-work/:workId/approve
 * @desc    Approve employee work
 * @access  Private (MANAGER only)
 */
exports.approveWork = async (req, res) => {
  try {
    const { workId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(workId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid work id'
      });
    }

    const workReport = await WorkReport.findById(workId).populate('employee', 'department');
    if (!workReport) {
      return res.status(404).json({
        success: false,
        error: 'Work report not found'
      });
    }
    if (shouldScopeByDepartment(req.user) && workReport.employee?.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this work report'
      });
    }

    workReport.status = 'approved';
    workReport.reviewedBy = req.user._id;
    workReport.reviewedDate = new Date();
    workReport.feedback = req.body?.feedback?.trim() || 'Approved by manager';
    await workReport.save();

    res.status(200).json({
      success: true,
      message: 'Work approved successfully',
      data: workReport
    });
  } catch (error) {
    logger.error({ err: error }, 'Approve work error');
    res.status(500).json({
      success: false,
      error: 'Failed to approve work',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/manager/employee-work/:workId/reject
 * @desc    Reject employee work
 * @access  Private (MANAGER only)
 */
exports.rejectWork = async (req, res) => {
  try {
    const { workId } = req.params;
    const { reason } = req.body;
    if (!mongoose.Types.ObjectId.isValid(workId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid work id'
      });
    }

    const workReport = await WorkReport.findById(workId).populate('employee', 'department');
    if (!workReport) {
      return res.status(404).json({
        success: false,
        error: 'Work report not found'
      });
    }
    if (shouldScopeByDepartment(req.user) && workReport.employee?.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this work report'
      });
    }

    workReport.status = 'rejected';
    workReport.reviewedBy = req.user._id;
    workReport.reviewedDate = new Date();
    workReport.feedback = reason?.trim() || 'Rejected by manager';
    await workReport.save();

    res.status(200).json({
      success: true,
      message: 'Work rejected successfully',
      data: workReport
    });
  } catch (error) {
    logger.error({ err: error }, 'Reject work error');
    res.status(500).json({
      success: false,
      error: 'Failed to reject work',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/manager/notifications
 * @desc    Get manager notifications
 * @access  Private (MANAGER only)
 */
exports.getNotifications = async (req, res) => {
  try {
    const result = await notificationService.getNotificationsForManager(req.user, req.query);
    res.status(200).json({
      success: true,
      data: result.notifications,
      meta: {
        total: result.total,
        unread: result.unread,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Get notifications error');
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Failed to fetch notifications',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/manager/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (MANAGER only)
 */
exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.markNotificationRead(req.user, id);
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error({ err: error }, 'Mark notification read error');
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Failed to mark notification as read',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/manager/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private (MANAGER only)
 */
exports.markAllNotificationsRead = async (req, res) => {
  try {
    const summary = await notificationService.markAllNotificationsRead(req.user);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: summary
    });
  } catch (error) {
    logger.error({ err: error }, 'Mark all notifications read error');
    res.status(error.statusCode || 500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      details: error.message
    });
  }
};

/**
 * TASK MANAGEMENT
 */
exports.getTasks = async (req, res) => {
  try {
    const { status, priority, assignee, search } = req.query;
    const pageNum = parsePositiveInt(req.query.page, 1);
    const limitNum = parsePositiveInt(req.query.limit, 10);
    const filters = {};

    // Add debug logging
    logger.info({ userEmail: req.user?.email, params: req.query }, 'Manager getTasks called');

    const statusFilter = sanitizeQueryValue(status);
    const priorityFilter = sanitizeQueryValue(priority);
    const assigneeFilter = sanitizeQueryValue(assignee);
    const searchTerm = sanitizeQueryValue(search);

    if (statusFilter) filters.status = statusFilter;
    if (priorityFilter) filters.priority = priorityFilter;
    if (assigneeFilter) {
      if (mongoose.Types.ObjectId.isValid(assigneeFilter)) {
        filters.assignedTo = assigneeFilter;
      } else {
        logger.warn({ assigneeFilter }, 'Manager getTasks ignoring invalid assignee filter');
      }
    }
    if (searchTerm) {
      filters.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    let scopeFilter = { assignedBy: req.user._id };
    if (shouldScopeByDepartment(req.user)) {
      const teamUsers = await User.find({ department: req.user.department }).select('_id');
      const ids = teamUsers.map((user) => user._id);
      scopeFilter = { $or: [{ assignedTo: { $in: ids } }, { assignedBy: req.user._id }] };
      logger.info({ teamUsersCount: teamUsers.length, department: req.user.department }, 'Team users found');
    }

    const query = Object.keys(filters).length ? { $and: [scopeFilter, filters] } : scopeFilter;
    logger.info({ query }, 'Query being executed');

    const tasks = await Task.find(query)
      .populate('assignedTo', 'firstName lastName email department')
      .populate('assignedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .exec();

    const count = await Task.countDocuments(query);
    
    logger.info({ tasksCount: tasks.length, totalCount: count }, 'Tasks found');

    res.status(200).json({
      success: true,
      data: {
        tasks,
        totalPages: Math.ceil(count / limitNum),
        currentPage: pageNum,
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Manager get tasks error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      details: error.message
    });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, priority, estimatedHours } = req.body;

    if (!title || !description || !assignedTo || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, assignedTo, and dueDate'
      });
    }

    if (shouldScopeByDepartment(req.user)) {
      const assignee = await User.findById(assignedTo).select('department');
      if (!assignee || assignee.department !== req.user.department) {
        return res.status(400).json({
          success: false,
          error: 'Assignee must be in your department'
        });
      }
    }

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      assignedTo,
      assignedBy: req.user._id,
      dueDate,
      priority,
      estimatedHours
    });

    await task.populate('assignedTo', 'firstName lastName email department');
    await task.populate('assignedBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    logger.error({ err: error }, 'Manager create task error');
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
      details: error.message
    });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { title, description, priority, status, dueDate, progress, assignedTo, estimatedHours, actualHours } = req.body;

    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID format'
      });
    }

    const task = await Task.findById(req.params.id).populate('assignedTo', 'department');
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    if (shouldScopeByDepartment(req.user) && task.assignedBy?.toString() !== req.user._id.toString()) {
      if (task.assignedTo?.department && task.assignedTo.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to update this task'
        });
      }
    }

    if (assignedTo && shouldScopeByDepartment(req.user)) {
      const assignee = await User.findById(assignedTo).select('department');
      if (!assignee || assignee.department !== req.user.department) {
        return res.status(400).json({
          success: false,
          error: 'Assignee must be in your department'
        });
      }
      task.assignedTo = assignedTo;
    }

    if (title) task.title = title.trim();
    if (description) task.description = description.trim();
    if (priority) task.priority = priority;
    if (status) task.status = status;
    if (dueDate) task.dueDate = dueDate;
    if (progress !== undefined) task.progress = progress;
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
    if (actualHours !== undefined) task.actualHours = actualHours;

    if (status === 'completed' && !task.completedDate) {
      task.completedDate = Date.now();
    }

    await task.save();
    await task.populate('assignedTo', 'firstName lastName email department');
    await task.populate('assignedBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    logger.error({ err: error }, 'Manager update task error');
    res.status(500).json({
      success: false,
      error: 'Failed to update task',
      details: error.message
    });
  }
};

exports.reassignTask = async (req, res) => {
  try {
    const { assignedTo, dueDate } = req.body;

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        error: 'Assigned user is required'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    if (shouldScopeByDepartment(req.user)) {
      const assignee = await User.findById(assignedTo).select('department');
      if (!assignee || assignee.department !== req.user.department) {
        return res.status(400).json({
          success: false,
          error: 'Assignee must be in your department'
        });
      }
    }

    task.assignedTo = assignedTo;
    task.assignedBy = req.user._id;
    if (dueDate) task.dueDate = dueDate;

    await task.save();
    await task.populate('assignedTo', 'firstName lastName email department');
    await task.populate('assignedBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Task reassigned successfully',
      data: task
    });
  } catch (error) {
    logger.error({ err: error }, 'Manager reassign task error');
    res.status(500).json({
      success: false,
      error: 'Failed to reassign task',
      details: error.message
    });
  }
};

exports.closeTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    task.status = 'completed';
    task.progress = 100;
    task.completedDate = Date.now();
    await task.save();

    await task.populate('assignedTo', 'firstName lastName email department');
    await task.populate('assignedBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Task closed successfully',
      data: task
    });
  } catch (error) {
    logger.error({ err: error }, 'Manager close task error');
    res.status(500).json({
      success: false,
      error: 'Failed to close task',
      details: error.message
    });
  }
};
/**
 * LEAVE MANAGEMENT
 */
exports.getLeaveRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, managerStatus } = req.query;
    const query = {};

    if (status) query.status = status;
    if (managerStatus) query.managerApprovalStatus = managerStatus;

    if (shouldScopeByDepartment(req.user)) {
      const teamUsers = await User.find({ department: req.user.department }).select('_id');
      const ids = teamUsers.map((user) => user._id);
      query.employee = { $in: ids };
    }

    const leaves = await Leave.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('managerApprovedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Leave.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        leaves,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get manager leave requests error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leave requests',
      details: error.message
    });
  }
};

exports.approveLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id).populate('employee', 'firstName lastName email');

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Leave request is not pending'
      });
    }

    if (leave.managerApprovalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Leave request already approved by manager'
      });
    }

    leave.managerApprovalStatus = 'approved';
    leave.managerApprovedBy = req.user._id;
    leave.managerApprovedDate = Date.now();
    leave.managerRejectionReason = undefined;
    leave.status = 'manager-approved';
    await leave.save();
    await logLeaveAction({
      leave,
      reviewer: req.user._id,
      role: req.user.role || 'manager',
      action: 'manager-approved',
    });

    res.status(200).json({
      success: true,
      message: 'Leave request approved by manager and forwarded to HR',
      data: leave
    });
  } catch (error) {
    logger.error({ err: error }, 'Manager approve leave error');
    res.status(500).json({
      success: false,
      error: 'Failed to approve leave request',
      details: error.message
    });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const leave = await Leave.findById(req.params.id).populate('employee', 'firstName lastName email');

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Leave request is not pending'
      });
    }

    leave.managerApprovalStatus = 'rejected';
    leave.managerApprovedBy = req.user._id;
    leave.managerApprovedDate = Date.now();
    leave.managerRejectionReason = rejectionReason;
    leave.status = 'rejected';
    leave.approvedBy = req.user._id;
    leave.approvedDate = Date.now();
    await leave.save();
    await logLeaveAction({
      leave,
      reviewer: req.user._id,
      role: req.user.role || 'manager',
      action: 'manager-rejected',
      comment: rejectionReason,
    });

    res.status(200).json({
      success: true,
      message: 'Leave request rejected by manager',
      data: leave
    });
  } catch (error) {
    logger.error({ err: error }, 'Manager reject leave error');
    res.status(500).json({
      success: false,
      error: 'Failed to reject leave request',
      details: error.message
    });
  }
};

/**
 * WORK REPORTS
 */
exports.getWorkReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, employee, reportType, status, uniqueTask } = req.query;
    const query = {};

    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

    if (shouldScopeByDepartment(req.user)) {
      const teamUsers = await User.find({ department: req.user.department }).select('_id');
      const ids = teamUsers.map((user) => user._id);
      if (employee && !ids.find((id) => id.toString() === employee)) {
        return res.status(200).json({
          success: true,
          data: {
            reports: [],
            totalPages: 1,
            currentPage: parseInt(page),
            total: 0
          }
        });
      }
      query.employee = employee ? employee : { $in: ids };
    } else if (employee) {
      query.employee = employee;
    }

    if (uniqueTask === 'true') {
      const skip = (page - 1) * limit;
      const basePipeline = [
        { $match: query },
        { $sort: { reportDate: -1, createdAt: -1 } },
        {
          $group: {
            _id: { $ifNull: ['$taskId', '$_id'] },
            doc: { $first: '$$ROOT' }
          }
        },
        { $replaceRoot: { newRoot: '$doc' } }
      ];

      const reports = await WorkReport.aggregate([
        ...basePipeline,
        { $sort: { reportDate: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: Number(limit) }
      ]);

      await WorkReport.populate(reports, [
        { path: 'employee', select: 'firstName lastName email department' },
        { path: 'reviewedBy', select: 'firstName lastName' },
        { path: 'project', select: 'name projectCode' }
      ]);

      const countResult = await WorkReport.aggregate([
        ...basePipeline,
        { $count: 'total' }
      ]);
      const count = countResult?.[0]?.total || 0;

      return res.status(200).json({
        success: true,
        data: {
          reports,
          totalPages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          total: count
        }
      });
    }

    const reports = await WorkReport.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('reviewedBy', 'firstName lastName')
      .populate('project', 'name projectCode')
      .sort({ reportDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await WorkReport.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        reports,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get manager work reports error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch work reports',
      details: error.message
    });
  }
};
