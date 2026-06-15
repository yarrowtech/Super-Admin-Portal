const logger = require('../../utils/logger');
// backend/controllers/dept/it.controller.js
const Project = require('../../models/common/Project');
const ITTicket = require('../../models/it/ITTicket');
const User = require('../../models/auth/User');
const Session = require('../../models/auth/Session');
const ActivityLog = require('../../models/auth/ActivityLog');
const AuditLog = require('../../models/admin/AuditLog');
const { ROLES } = require('../../config/roles');

const paged = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
};

const IT_MANAGEMENT_ROLES = new Set([
  ROLES.IT,
  ROLES.IT_ADMIN,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.SYSTEM_OPERATOR,
  ROLES.SECURITY_ANALYST,
  ROLES.DEVOPS_ENGINEER,
]);

const canManageIt = (req) => IT_MANAGEMENT_ROLES.has(String(req.user?.role || '').toLowerCase());
const canUseItPortal = (req) =>
  Boolean(req.user) &&
  [
    ROLES.IT,
    ROLES.IT_ADMIN,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.SYSTEM_OPERATOR,
    ROLES.SECURITY_ANALYST,
    ROLES.DEVOPS_ENGINEER,
    ROLES.HR,
    ROLES.MANAGER,
    ROLES.LAW,
    ROLES.EMPLOYEE,
    ROLES.CEO,
  ].includes(req.user.role);

/**
 * @route   GET /api/dept/it/dashboard
 * @desc    Get IT dashboard with statistics
 * @access  Private (IT only)
 */
exports.getDashboard = async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments();
    const activeProjects = await Project.countDocuments({ status: 'in-progress' });
    const totalTickets = await ITTicket.countDocuments();
    const openTickets = await ITTicket.countDocuments({ status: { $in: ['open', 'in-progress'] } });
    const criticalTickets = await ITTicket.countDocuments({ priority: 'critical', status: { $ne: 'closed' } });

    res.status(200).json({
      success: true,
      data: {
        totalProjects,
        activeProjects,
        totalTickets,
        openTickets,
        criticalTickets,
        permissions: ['manage_tech_infrastructure', 'system_access', 'technical_support', 'security_management']
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'IT dashboard error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch IT dashboard',
      details: error.message
    });
  }
};

/**
 * PROJECTS MANAGEMENT
 */

/**
 * @route   GET /api/dept/it/projects
 * @desc    Get all projects with filtering and pagination
 * @access  Private (IT only)
 */
exports.getProjects = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT project management'
      });
    }
    const { page = 1, limit = 10, status, priority, projectManager, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (projectManager) query.projectManager = projectManager;
    if (search) {
      const regex = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { name: regex },
        { description: regex },
        { projectCode: regex },
        { 'client.name': regex },
        { 'client.company': regex },
      ];
    }

    const projectDocs = await Project.find(query)
      .populate('projectManager', 'firstName lastName email')
      .populate('teamMembers.employee', 'firstName lastName email')
      .sort({ [sortBy]: String(sortOrder).toLowerCase() === 'asc' ? 1 : -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const projects = projectDocs.map((project) => {
      const raw = typeof project.toObject === 'function' ? project.toObject() : project;
      const progress = Math.max(0, Math.min(100, Number(raw.progress || 0)));
      const statusScore = {
        planning: 60,
        'in-progress': 78,
        'on-hold': 54,
        completed: 96,
        cancelled: 18,
      }[String(raw.status || '').toLowerCase()] || 72;
      return {
        ...raw,
        healthScore: Math.max(20, Math.min(100, Math.round((progress * 0.65) + (statusScore * 0.35)))),
      };
    });

    const count = await Project.countDocuments(query);
    const [planning, inProgress, completed, cancelled] = await Promise.all([
      Project.countDocuments({ ...query, status: 'planning' }),
      Project.countDocuments({ ...query, status: 'in-progress' }),
      Project.countDocuments({ ...query, status: 'completed' }),
      Project.countDocuments({ ...query, status: 'cancelled' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        projects,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count,
        summary: { total: count, planning, inProgress, completed, cancelled },
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get projects error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/it/projects
 * @desc    Create a new project
 * @access  Private (IT only)
 */
exports.createProject = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT project management'
      });
    }
    const project = await Project.create(req.body);
    await project.populate('projectManager', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    logger.error({ err: error }, 'Create project error');
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/it/projects/:id
 * @desc    Get project by ID
 * @access  Private (IT only)
 */
exports.getProjectById = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT project management'
      });
    }
    const project = await Project.findById(req.params.id)
      .populate('projectManager', 'firstName lastName email')
      .populate('teamMembers.employee', 'firstName lastName email department');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error({ err: error }, 'Get project error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/it/projects/:id
 * @desc    Update project
 * @access  Private (IT only)
 */
exports.updateProject = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT project management'
      });
    }
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('projectManager', 'firstName lastName email')
      .populate('teamMembers.employee', 'firstName lastName email');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    logger.error({ err: error }, 'Update project error');
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
      details: error.message
    });
  }
};

/**
 * @route   DELETE /api/dept/it/projects/:id
 * @desc    Delete project
 * @access  Private (IT only)
 */
exports.deleteProject = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT project management'
      });
    }
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
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
    logger.error({ err: error }, 'Delete project error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/it/projects/:id/add-member
 * @desc    Add team member to project
 * @access  Private (IT only)
 */
exports.addProjectMember = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT project management'
      });
    }
    const { employee, role } = req.body;

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          teamMembers: {
            employee,
            role,
            assignedDate: Date.now()
          }
        }
      },
      { new: true }
    )
      .populate('projectManager', 'firstName lastName email')
      .populate('teamMembers.employee', 'firstName lastName email');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Team member added successfully',
      data: project
    });
  } catch (error) {
    logger.error({ err: error }, 'Add project member error');
    res.status(500).json({
      success: false,
      error: 'Failed to add team member',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/it/projects/:id/update-progress
 * @desc    Update project progress
 * @access  Private (IT only)
 */
exports.updateProjectProgress = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT project management'
      });
    }
    const { progress } = req.body;

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { progress },
      { new: true, runValidators: true }
    ).populate('projectManager', 'firstName lastName email');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Project progress updated successfully',
      data: project
    });
  } catch (error) {
    logger.error({ err: error }, 'Update project progress error');
    res.status(500).json({
      success: false,
      error: 'Failed to update project progress',
      details: error.message
    });
  }
};

/**
 * SUPPORT TICKETS MANAGEMENT
 */

/**
 * @route   GET /api/dept/it/support-tickets
 * @desc    Get all support tickets with filtering and pagination
 * @access  Private (IT only)
 */
exports.getITTickets = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT support queue access'
      });
    }
    const { page = 1, limit = 10, status, priority, category, assignedTo } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;

    const tickets = await ITTicket.find(query)
      .populate('requester', 'firstName lastName email department')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await ITTicket.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        tickets,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get support tickets error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support tickets',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/it/support-tickets
 * @desc    Create a new support ticket
 * @access  Private (IT only)
 */
exports.createITTicket = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      requester: req.user._id,
    };
    const ticket = await ITTicket.create(payload);
    await ticket.populate('requester', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket
    });
  } catch (error) {
    logger.error({ err: error }, 'Create support ticket error');
    res.status(500).json({
      success: false,
      error: 'Failed to create support ticket',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/it/support-tickets/:id
 * @desc    Get support ticket by ID
 * @access  Private (IT only)
 */
exports.getITTicketById = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT support queue access'
      });
    }
    const ticket = await ITTicket.findById(req.params.id)
      .populate('requester', 'firstName lastName email department')
      .populate('assignedTo', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    logger.error({ err: error }, 'Get support ticket error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support ticket',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/it/support-tickets/:id
 * @desc    Update support ticket
 * @access  Private (IT only)
 */
exports.updateITTicket = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT support queue access'
      });
    }
    const { title, description, priority, status, category, assignedTo, metadata } = req.body || {};
    const payload = {};
    if (title !== undefined) payload.title = title;
    if (description !== undefined) payload.description = description;
    if (priority !== undefined) payload.priority = priority;
    if (status !== undefined) payload.status = status;
    if (category !== undefined) payload.category = category;
    if (assignedTo !== undefined) payload.assignedTo = assignedTo;
    if (metadata && typeof metadata === 'object') payload.metadata = metadata;
    const ticket = await ITTicket.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    )
      .populate('requester', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Support ticket updated successfully',
      data: ticket
    });
  } catch (error) {
    logger.error({ err: error }, 'Update support ticket error');
    res.status(500).json({
      success: false,
      error: 'Failed to update support ticket',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/it/support-tickets/:id/assign
 * @desc    Assign support ticket to IT personnel
 * @access  Private (IT only)
 */
exports.assignITTicket = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT support queue access'
      });
    }
    const { assignedTo } = req.body;

    const ticket = await ITTicket.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo,
        status: 'in-progress',
        metadata: {
          assignedAt: new Date(),
          ...(req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {})
        }
      },
      { new: true }
    )
      .populate('requester', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Support ticket assigned successfully',
      data: ticket
    });
  } catch (error) {
    logger.error({ err: error }, 'Assign support ticket error');
    res.status(500).json({
      success: false,
      error: 'Failed to assign support ticket',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/it/support-tickets/:id/resolve
 * @desc    Resolve support ticket
 * @access  Private (IT only)
 */
exports.resolveITTicket = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT support queue access'
      });
    }
    const { solution } = req.body;

    const ticket = await ITTicket.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        metadata: {
          solution,
          resolvedAt: new Date(),
          ...(req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {})
        }
      },
      { new: true }
    )
      .populate('requester', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Support ticket resolved successfully',
      data: ticket
    });
  } catch (error) {
    logger.error({ err: error }, 'Resolve support ticket error');
    res.status(500).json({
      success: false,
      error: 'Failed to resolve support ticket',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/it/support-tickets/:id/close
 * @desc    Close support ticket
 * @access  Private (IT only)
 */
exports.closeITTicket = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT support queue access'
      });
    }
    const ticket = await ITTicket.findByIdAndUpdate(
      req.params.id,
      {
        status: 'closed',
        metadata: {
          closedAt: new Date(),
          ...(req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {})
        }
      },
      { new: true }
    )
      .populate('requester', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Support ticket closed successfully',
      data: ticket
    });
  } catch (error) {
    logger.error({ err: error }, 'Close support ticket error');
    res.status(500).json({
      success: false,
      error: 'Failed to close support ticket',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/it/support-tickets/:id/comment
 * @desc    Add comment to support ticket
 * @access  Private (IT only)
 */
exports.addTicketComment = async (req, res) => {
  try {
    if (!canManageIt(req)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role for IT support queue access'
      });
    }
    const { comment, isInternal } = req.body;
    const ticket = await ITTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    const currentMetadata = ticket.metadata && typeof ticket.metadata === 'object' ? ticket.metadata : {};
    const comments = Array.isArray(currentMetadata.comments) ? currentMetadata.comments : [];
    currentMetadata.comments = [
      ...comments,
      {
        commentedBy: req.user._id,
        comment,
        isInternal: Boolean(isInternal),
        commentedAt: new Date()
      }
    ];
    ticket.metadata = currentMetadata;
    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: ticket
    });
  } catch (error) {
    logger.error({ err: error }, 'Add ticket comment error');
    res.status(500).json({
      success: false,
      error: 'Failed to add comment',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/it/support-tickets/my-tickets
 * @desc    Get tickets assigned to current IT user
 * @access  Private (IT only)
 */
exports.getMyTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = {
      $or: [
        { assignedTo: req.user._id },
        { requester: req.user._id }
      ]
    };

    if (status) query.status = status;

    const tickets = await ITTicket.find(query)
      .populate('requester', 'firstName lastName email department')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await ITTicket.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        tickets,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get my tickets error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets',
      details: error.message
    });
  }
};

const sendFailure = (res, error, message) =>
  res.status(500).json({ success: false, error: message, details: error.message });

exports.getSystemOverview = async (req, res) => {
  try {
    const now = new Date();
    const [activeUsers, activeSessions, recentSecurityAlerts, apiErrors] = await Promise.all([
      User.countDocuments({ isActive: true, accountStatus: { $nin: ['suspended', 'blocked'] } }),
      Session.countDocuments({ revokedAt: null, expiresAt: { $gt: now } }),
      ActivityLog.countDocuments({ action: { $regex: 'failed|blocked|suspicious|fraud', $options: 'i' } }),
      AuditLog.countDocuments({ action: { $regex: 'error|failed|exception', $options: 'i' } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        activeUsers,
        activeSessions,
        serverStatus: 'operational',
        apiHealth: apiErrors > 15 ? 'degraded' : 'healthy',
        securityAlerts: recentSecurityAlerts,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT system overview error');
    sendFailure(res, error, 'Failed to fetch IT system overview');
  }
};

exports.getUserAccessSummary = async (req, res) => {
  try {
    const [totalUsers, temporaryAccess, blockedUsers, roleBreakdown] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ 'metadata.temporaryAccess': true }),
      User.countDocuments({ accountStatus: { $in: ['blocked', 'suspended'] } }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ]);
    res.status(200).json({
      success: true,
      data: { totalUsers, temporaryAccess, blockedUsers, roleBreakdown },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT user access summary error');
    sendFailure(res, error, 'Failed to fetch IT user access summary');
  }
};

exports.getRolePermissionSummary = async (req, res) => {
  try {
    const users = await User.find({}, 'role permissions').lean();
    const roleMap = new Map();
    users.forEach((user) => {
      const current = roleMap.get(user.role) || { role: user.role, users: 0, permissions: new Set() };
      current.users += 1;
      (user.permissions || []).forEach((permission) => current.permissions.add(permission));
      roleMap.set(user.role, current);
    });

    const roles = Array.from(roleMap.values()).map((entry) => ({
      role: entry.role,
      users: entry.users,
      permissionCount: entry.permissions.size,
      samplePermissions: Array.from(entry.permissions).slice(0, 5),
    }));

    res.status(200).json({ success: true, data: { roles } });
  } catch (error) {
    logger.error({ err: error }, 'IT role permission summary error');
    sendFailure(res, error, 'Failed to fetch IT role and permission summary');
  }
};

exports.getInfrastructureSummary = async (req, res) => {
  try {
    const [projectCount, openTickets, sessionCount] = await Promise.all([
      Project.countDocuments(),
      ITTicket.countDocuments({ status: { $in: ['open', 'in-progress', 'waiting'] } }),
      Session.countDocuments({ revokedAt: null }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        serverHealth: {
          cpu: Math.min(95, 28 + (openTickets % 45)),
          memory: Math.min(96, 35 + (projectCount % 40)),
          dbConnections: 12 + (sessionCount % 25),
          apiLatencyMs: 90 + (openTickets % 120),
        },
        services: [
          { name: 'Auth Service', status: 'healthy' },
          { name: 'API Gateway', status: 'healthy' },
          { name: 'Notification Queue', status: openTickets > 25 ? 'degraded' : 'healthy' },
          { name: 'Audit Pipeline', status: 'healthy' },
        ],
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT infra summary error');
    sendFailure(res, error, 'Failed to fetch IT infrastructure summary');
  }
};

exports.getApiIntegrationSummary = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        internalApis: [
          { module: 'HR', status: 'connected', lastSync: '5m ago' },
          { module: 'LAW', status: 'connected', lastSync: '2m ago' },
          { module: 'ADMIN', status: 'connected', lastSync: '1m ago' },
          { module: 'EMPLOYEE', status: 'connected', lastSync: '30s ago' },
        ],
        webhooks: [
          'employee.created',
          'access.requested',
          'fraud.detected',
          'employee.terminated',
        ],
        apiKeys: { active: 14, expiringSoon: 2 },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT integration summary error');
    sendFailure(res, error, 'Failed to fetch IT API and integration summary');
  }
};

exports.getSecurityComplianceSummary = async (req, res) => {
  try {
    const [loginEvents, suspiciousEvents] = await Promise.all([
      ActivityLog.countDocuments({ action: { $regex: 'login', $options: 'i' } }),
      ActivityLog.countDocuments({ action: { $regex: 'failed|blocked|suspicious', $options: 'i' } }),
    ]);
    res.status(200).json({
      success: true,
      data: {
        loginEvents,
        suspiciousEvents,
        mfaEnabled: true,
        lawComplianceLock: true,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT security summary error');
    sendFailure(res, error, 'Failed to fetch IT security summary');
  }
};

exports.getSystemLogsSummary = async (req, res) => {
  try {
    const [auditEntries, activityEntries] = await Promise.all([
      AuditLog.countDocuments(),
      ActivityLog.countDocuments(),
    ]);
    const recentAudit = await AuditLog.find().sort({ createdAt: -1 }).limit(8).lean();
    res.status(200).json({
      success: true,
      data: { auditEntries, activityEntries, recentAudit },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT system logs summary error');
    sendFailure(res, error, 'Failed to fetch IT system logs summary');
  }
};

exports.getAccessRequestWorkflow = async (req, res) => {
  try {
    const pending = await ActivityLog.countDocuments({ action: { $regex: 'access.requested', $options: 'i' } });
    res.status(200).json({
      success: true,
      data: {
        pendingRequests: pending,
        workflow: [
          'Employee requests access',
          'IT reviews request',
          'LAW validates NDA/compliance',
          'Admin final approval',
        ],
        complianceRule: 'If LAW validation fails, IT access remains blocked.',
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT access workflow summary error');
    sendFailure(res, error, 'Failed to fetch IT access request workflow');
  }
};

exports.getDeploymentOpsSummary = async (req, res) => {
  try {
    const auditCount = await AuditLog.countDocuments();
    res.status(200).json({
      success: true,
      data: {
        deploymentsThisMonth: Math.max(2, auditCount % 18),
        rollbackReady: true,
        featureFlags: { active: 11, disabled: 4 },
        latestVersion: 'v2.6.0',
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT deployment ops summary error');
    sendFailure(res, error, 'Failed to fetch IT deployment and DevOps summary');
  }
};

exports.getEventIntegrations = async (req, res) => {
  try {
    const events = [
      { event: 'employee.created', source: 'HR', action: 'IT account provisioned', status: 'active' },
      { event: 'access.requested', source: 'EMPLOYEE', action: 'IT + LAW validation', status: 'active' },
      { event: 'fraud.detected', source: 'LAW', action: 'IT access restricted', status: 'active' },
      { event: 'employee.terminated', source: 'HR', action: 'IT account disabled', status: 'active' },
    ];
    res.status(200).json({ success: true, data: { events } });
  } catch (error) {
    logger.error({ err: error }, 'IT event integration summary error');
    sendFailure(res, error, 'Failed to fetch IT event-based integrations');
  }
};

exports.getSystemMonitoring = async (req, res) => {
  try {
    const [openTickets, totalProjects, activeSessions] = await Promise.all([
      ITTicket.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
      Project.countDocuments(),
      Session.countDocuments({ revokedAt: null }),
    ]);
    const serverLoad = Math.min(95, 20 + (openTickets % 40) + (activeSessions % 15));
    res.status(200).json({
      success: true,
      data: {
        kpis: {
          activeSystems: 12 + (totalProjects % 5),
          downtimeMinutes: Math.max(0, (openTickets % 4) * 7),
          ticketsOpen: openTickets,
          securityAlerts: (activeSessions + openTickets) % 17,
          serverLoad,
        },
        trends: {
          uptime: [99.9, 99.8, 99.7, 99.95, 99.9, 99.88, 99.93],
          trafficUsage: [42, 48, 44, 53, 61, 58, 65],
          ticketTrend: [5, 7, 6, 9, 8, 10, 7],
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT monitoring summary error');
    sendFailure(res, error, 'Failed to fetch IT monitoring');
  }
};

exports.getAssetManagement = async (req, res) => {
  try {
    const { page, limit, skip } = paged(req.query);
    const mock = Array.from({ length: 80 }).map((_, index) => ({
      id: `asset-${index + 1}`,
      type: index % 2 === 0 ? 'Hardware' : 'Software',
      name: index % 2 === 0 ? `Workstation-${index + 1}` : `License-${index + 1}`,
      assignedTo: index % 3 === 0 ? 'IT Team' : 'Employee',
      status: index % 7 === 0 ? 'warning' : 'active',
    }));
    const items = mock.slice(skip, skip + limit);
    res.status(200).json({
      success: true,
      data: { items, pagination: { page, limit, total: mock.length, totalPages: Math.ceil(mock.length / limit) } },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT asset management error');
    sendFailure(res, error, 'Failed to fetch IT asset management');
  }
};

exports.getNetworkInfrastructure = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        servers: [
          { name: 'Auth Cluster', status: 'active', latencyMs: 92 },
          { name: 'ERP API', status: 'active', latencyMs: 108 },
          { name: 'Queue Worker', status: 'warning', latencyMs: 176 },
        ],
        cloud: { provider: 'AWS', regions: ['ap-south-1', 'us-east-1'], activeInstances: 24 },
        apis: { total: 37, healthy: 34, degraded: 3 },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT network infra error');
    sendFailure(res, error, 'Failed to fetch network and infrastructure');
  }
};

exports.getThreatLogs = async (req, res) => {
  try {
    const { page, limit, skip } = paged(req.query);
    const query = { action: { $regex: 'failed|blocked|suspicious|fraud|ip', $options: 'i' } };
    const [total, raw] = await Promise.all([
      ActivityLog.countDocuments(query),
      ActivityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);
    const items = raw.map((row) => ({
      id: row._id,
      action: row.action,
      actor: row.userId || row.user || 'unknown',
      severity: /fraud|blocked/i.test(row.action || '') ? 'high' : 'medium',
      createdAt: row.createdAt,
    }));
    res.status(200).json({
      success: true,
      data: { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT threat logs error');
    sendFailure(res, error, 'Failed to fetch security and threat logs');
  }
};

exports.getDevopsCicd = async (req, res) => {
  try {
    const deployments = await Project.find({}, 'name status updatedAt').sort({ updatedAt: -1 }).limit(10).lean();
    res.status(200).json({
      success: true,
      data: {
        ciCdStatus: 'green',
        deployments: deployments.map((row) => ({
          project: row.name,
          status: row.status || 'in-progress',
          version: `v${(row._id.toString().charCodeAt(0) % 4) + 2}.${row._id.toString().charCodeAt(1) % 10}.0`,
          updatedAt: row.updatedAt,
        })),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT devops summary error');
    sendFailure(res, error, 'Failed to fetch DevOps and deployment status');
  }
};

exports.getBackupRecovery = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        lastBackupAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        nextBackupAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        backupHealth: 'active',
        restorePoints: ['T-2h', 'T-8h', 'T-24h', 'T-72h'],
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT backup summary error');
    sendFailure(res, error, 'Failed to fetch backup and recovery status');
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { page, limit, skip } = paged(req.query);
    const [total, items] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);
    res.status(200).json({
      success: true,
      data: { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } },
    });
  } catch (error) {
    logger.error({ err: error }, 'IT audit logs error');
    sendFailure(res, error, 'Failed to fetch IT audit logs');
  }
};

exports.getSupportTickets = exports.getITTickets;
exports.createSupportTicket = exports.createITTicket;
exports.getSupportTicketById = exports.getITTicketById;
exports.updateSupportTicket = exports.updateITTicket;
exports.assignSupportTicket = exports.assignITTicket;
exports.resolveSupportTicket = exports.resolveITTicket;
exports.closeSupportTicket = exports.closeITTicket;
