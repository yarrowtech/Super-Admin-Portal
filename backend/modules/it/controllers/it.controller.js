// backend/controllers/dept/it.controller.js
const Project = require('../../shared/models/Project');
const SupportTicket = require('../../shared/models/SupportTicket');

/**
 * @route   GET /api/dept/it/dashboard
 * @desc    Get IT dashboard with statistics
 * @access  Private (IT only)
 */
exports.getDashboard = async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments();
    const activeProjects = await Project.countDocuments({ status: 'in-progress' });
    const totalTickets = await SupportTicket.countDocuments();
    const openTickets = await SupportTicket.countDocuments({ status: { $in: ['open', 'in-progress'] } });
    const criticalTickets = await SupportTicket.countDocuments({ priority: 'critical', status: { $ne: 'closed' } });

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
    console.error('IT dashboard error:', error);
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
    const { page = 1, limit = 10, status, priority, projectManager } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (projectManager) query.projectManager = projectManager;

    const projects = await Project.find(query)
      .populate('projectManager', 'firstName lastName email')
      .populate('teamMembers.employee', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Project.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        projects,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
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
    const project = await Project.create(req.body);
    await project.populate('projectManager', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    console.error('Create project error:', error);
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
    console.error('Get project error:', error);
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
    console.error('Update project error:', error);
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
    console.error('Delete project error:', error);
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
    console.error('Add project member error:', error);
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
    console.error('Update project progress error:', error);
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
exports.getSupportTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, category, assignedTo } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;

    const tickets = await SupportTicket.find(query)
      .populate('requester', 'firstName lastName email department')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await SupportTicket.countDocuments(query);

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
    console.error('Get support tickets error:', error);
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
exports.createSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.create(req.body);
    await ticket.populate('requester', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
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
exports.getSupportTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('requester', 'firstName lastName email department')
      .populate('assignedTo', 'firstName lastName email')
      .populate('comments.commentedBy', 'firstName lastName')
      .populate('relatedTickets');

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
    console.error('Get support ticket error:', error);
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
exports.updateSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      req.body,
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
    console.error('Update support ticket error:', error);
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
exports.assignSupportTicket = async (req, res) => {
  try {
    const { assignedTo } = req.body;

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo,
        status: 'in-progress',
        assignedDate: Date.now()
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
    console.error('Assign support ticket error:', error);
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
exports.resolveSupportTicket = async (req, res) => {
  try {
    const { solution } = req.body;

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        solution,
        resolvedDate: Date.now()
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
    console.error('Resolve support ticket error:', error);
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
exports.closeSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      {
        status: 'closed',
        closedDate: Date.now()
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
    console.error('Close support ticket error:', error);
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
    const { comment, isInternal } = req.body;

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: {
            commentedBy: req.user._id,
            comment,
            isInternal: isInternal || false,
            commentedAt: Date.now()
          }
        }
      },
      { new: true }
    )
      .populate('requester', 'firstName lastName email')
      .populate('comments.commentedBy', 'firstName lastName');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Add ticket comment error:', error);
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
    const query = { assignedTo: req.user._id };

    if (status) query.status = status;

    const tickets = await SupportTicket.find(query)
      .populate('requester', 'firstName lastName email department')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await SupportTicket.countDocuments(query);

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
    console.error('Get my tickets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets',
      details: error.message
    });
  }
};
