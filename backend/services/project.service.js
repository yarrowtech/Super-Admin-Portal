const Task = require('../models/common/Task');
const Project = require('../models/common/Project');
const User = require('../models/auth/User');

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || '').trim());

const normalizeProjectAssignments = (user = {}) => {
  const raw = user?.metadata?.projectAssignments ?? user?.metadata?.assignedProjects ?? user?.assignedProjects ?? [];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (typeof entry === 'string') {
        const value = entry.trim();
        return value ? { token: value } : null;
      }
      if (!entry || typeof entry !== 'object') return null;

      const token = typeof entry.projectId === 'string'
        ? entry.projectId.trim()
        : String(entry.projectId || entry.projectCode || entry.projectName || '').trim();
      const projectCode = typeof entry.projectCode === 'string' ? entry.projectCode.trim() : '';
      const projectName = typeof entry.projectName === 'string' ? entry.projectName.trim() : '';

      if (!token && !projectCode && !projectName) return null;
      return {
        token,
        projectCode,
        projectName,
      };
    })
    .filter(Boolean)
    .slice(0, 100);
};

const resolveAccessibleProjects = async (user) => {
  const assignments = normalizeProjectAssignments(user);
  if (assignments.length === 0) return [];

  const filters = assignments.flatMap((assignment) => {
    const clauses = [];
    if (assignment.token) {
      if (isObjectId(assignment.token)) {
        clauses.push({ _id: assignment.token });
      }
      clauses.push({ projectCode: assignment.token });
      clauses.push({ name: { $regex: escapeRegex(assignment.token), $options: 'i' } });
    }
    if (assignment.projectCode) {
      clauses.push({ projectCode: assignment.projectCode });
      clauses.push({ name: { $regex: escapeRegex(assignment.projectCode), $options: 'i' } });
    }
    if (assignment.projectName) {
      clauses.push({ name: { $regex: escapeRegex(assignment.projectName), $options: 'i' } });
    }
    return clauses;
  });

  if (filters.length === 0) return [];

  return Project.find({ $or: filters })
    .select('name status progress deadline projectCode')
    .sort({ updatedAt: -1 })
    .lean();
};

const COLUMN_CONFIG = [
  { id: 'todo', title: 'To Do', statuses: ['pending', 'cancelled'] },
  { id: 'inProgress', title: 'In Progress', statuses: ['in-progress'] },
  { id: 'review', title: 'Review', statuses: ['review'] },
  { id: 'completed', title: 'Completed', statuses: ['completed'] },
];

const buildColumns = () =>
  COLUMN_CONFIG.map((config) => ({
    ...config,
    cards: [],
  }));

const getProjectBoard = async (user) => {
  const userId = user?._id;
  if (!userId) {
    throw new Error('User context is required');
  }

  const accessibleProjects = await resolveAccessibleProjects(user);
  const accessibleProjectIds = accessibleProjects.map((project) => project._id);

  const taskQuery = { assignedTo: userId };
  if (accessibleProjectIds.length > 0) {
    taskQuery.$or = [
      { project: { $in: accessibleProjectIds } },
      { project: null },
    ];
  }

  const projectQuery = accessibleProjectIds.length > 0
    ? {
      $or: [
        { 'teamMembers.employee': userId },
        { _id: { $in: accessibleProjectIds } },
      ],
    }
    : { 'teamMembers.employee': userId };

  const [tasks, projects] = await Promise.all([
    Task.find(taskQuery)
      .sort({ dueDate: 1 })
      .populate('project', 'name status deadline progress'),
    Project.find(projectQuery)
      .select('name status progress deadline projectCode')
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  const columns = buildColumns();
  const columnByStatus = new Map();
  columns.forEach((column) => {
    column.statuses.forEach((status) => columnByStatus.set(status, column));
  });

  tasks.forEach((task) => {
    const column =
      columnByStatus.get(task.status) || columns.find((col) => col.id === 'todo');
    column.cards.push({
      id: task._id,
      title: task.title,
      project: task.project?.name || 'General',
      dueDate: task.dueDate,
      priority: task.priority,
      progress: task.progress,
      status: task.status,
      attachments: task.attachments?.length || 0,
      comments: task.comments?.length || 0,
      isOverdue: task.isOverdue,
    });
  });

  return {
    columns,
    summary: {
      totalTasks: tasks.length,
      overdue: tasks.filter((task) => task.isOverdue).length,
      activeProjects: projects.length,
    },
    projects,
    accessibleProjects,
    updatedAt: new Date().toISOString(),
  };
};

const createPersonalTask = async (user, payload = {}) => {
  if (!user?._id) {
    const err = new Error('User context is required');
    err.statusCode = 401;
    throw err;
  }
  const title = payload.title?.trim();
  if (!title) {
    const err = new Error('Title is required');
    err.statusCode = 400;
    throw err;
  }
  const description = payload.description?.trim() || 'Personal to-do';
  const dueDate = payload.dueDate ? new Date(payload.dueDate) : new Date();

  const task = await Task.create({
    title,
    description,
    assignedTo: user._id,
    assignedBy: user._id,
    project: payload.projectId || null,
    priority: payload.priority || 'medium',
    status: 'pending',
    dueDate,
  });

  return {
    id: task._id,
    title: task.title,
    project: payload.projectName || 'Personal',
    dueDate: task.dueDate,
    priority: task.priority,
    progress: task.progress,
    status: task.status,
    attachments: 0,
    comments: 0,
    isOverdue: task.isOverdue,
  };
};

const deletePersonalTask = async (user, taskId) => {
  if (!user?._id) {
    const err = new Error('User context is required');
    err.statusCode = 401;
    throw err;
  }
  
  if (!taskId) {
    const err = new Error('Task ID is required');
    err.statusCode = 400;
    throw err;
  }

  const task = await Task.findById(taskId);
  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  // Ensure user can only delete their own tasks
  if (task.assignedTo.toString() !== user._id.toString()) {
    const err = new Error('Unauthorized: You can only delete your own tasks');
    err.statusCode = 403;
    throw err;
  }

  await Task.findByIdAndDelete(taskId);
  
  return {
    success: true,
    message: 'Task deleted successfully',
  };
};

const deriveStatus = (lastLogin) => {
  if (!lastLogin) return 'Offline';
  const diffHours = (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60);
  if (diffHours < 2) return 'Available';
  if (diffHours < 24) return 'Away';
  return 'Offline';
};

const getTeamDirectory = async (user) => {
  const department = user?.department;
  if (!department) {
    throw new Error('User department is required to fetch the team');
  }

  const members = await User.find({ department, isActive: true })
    .sort({ firstName: 1 })
    .select('firstName lastName role email phone department lastLogin profileImage metadata');

  return {
    members: members.map((member) => ({
      id: member._id,
      name: `${member.firstName} ${member.lastName}`,
      role: member.role,
      title: member.metadata?.title || member.role,
      email: member.email,
      phone: member.phone,
      department: member.department,
      status: deriveStatus(member.lastLogin),
      lastLogin: member.lastLogin,
      avatar: member.profileImage || null,
    })),
    total: members.length,
    updatedAt: new Date().toISOString(),
  };
};

module.exports = {
  getProjectBoard,
  createPersonalTask,
  deletePersonalTask,
  getTeamDirectory,
};
