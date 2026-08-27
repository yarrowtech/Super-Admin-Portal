import { managerApi } from '../../services/manager';
import { hrApi } from '../../services/hr';
import { employeeApi } from '../../services/employee';

const personName = (person) => {
  if (!person) return '';
  if (person.name) return person.name;
  return `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.email || '';
};

const normalizePerson = (person) => {
  if (!person) return null;
  return { id: person._id || person.id, name: personName(person), email: person.email || '' };
};

const normalizeProject = (project) => {
  if (!project) return null;
  return { id: project._id || project.id, name: project.name || project.projectCode || 'Project' };
};

/**
 * Normalizes a raw task document — whichever of the three real shapes it
 * came back as (manager/HR's populated Mongoose doc, or employee's
 * buildTaskPayload() shape) — into the one canonical shape every shared
 * task/Kanban component consumes. Only real, confirmed schema fields are
 * mapped; nothing here is invented.
 */
export const normalizeTask = (raw, { currentUser } = {}) => {
  if (!raw) return null;
  const id = raw.id || raw._id;
  const assignee = raw.assignedTo
    ? normalizePerson(raw.assignedTo)
    : (raw.assignee || (currentUser ? normalizePerson(currentUser) : null));

  return {
    id,
    title: raw.title || '',
    description: raw.description || '',
    status: raw.status || 'pending',
    priority: raw.priority || 'medium',
    dueDate: raw.dueDate || null,
    startDate: raw.startDate || null,
    completedDate: raw.completedDate || null,
    project: normalizeProject(raw.project),
    assignee,
    reporter: raw.assignedBy ? normalizePerson(raw.assignedBy) : null,
    progress: raw.progress ?? 0,
    isOverdue: Boolean(raw.isOverdue),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    estimatedHours: raw.estimatedHours ?? null,
    actualHours: raw.actualHours ?? null,
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    comments: Array.isArray(raw.comments)
      ? raw.comments.map((c, idx) => ({
          id: c._id || `${idx}-${c.commentedAt || ''}`,
          text: c.comment,
          author: normalizePerson(c.commentedBy),
          at: c.commentedAt,
        }))
      : [],
  };
};

/**
 * Per-portal adapter over the ONE shared Task model (backend/models/common/Task.js).
 * Each portal's route surface differs slightly (confirmed in the Phase 1/2A
 * schema audit) — this is the single place that difference is absorbed, so
 * KanbanBoard/TaskDetailDrawer/etc never need to know which portal they're
 * rendering. Capability flags reflect what each portal's backend genuinely
 * supports today — the UI must check these rather than assume parity.
 */
export const taskAdapters = {
  manager: {
    canCreate: true,
    canComment: false, // no comment endpoint exists for manager-scoped tasks
    canFetchDetail: false, // no single-task GET; list already returns full docs
    fetchTasks: async (token, filters = {}) => {
      const res = await managerApi.getTasks(token, filters);
      const data = res?.data || {};
      return {
        tasks: (data.tasks || []).map((t) => normalizeTask(t)),
        total: data.total ?? (data.tasks || []).length,
      };
    },
    updateStatus: (token, taskId, status) => managerApi.updateTask(token, taskId, { status }),
    createTask: (token, body) => managerApi.createTask(token, body),
    needsAssignee: true,
    fetchAssignableUsers: async (token) => {
      const res = await managerApi.getTeam(token);
      const list = res?.data?.team || [];
      return list.map((u) => ({ id: u._id || u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email }));
    },
  },

  hr: {
    canCreate: true,
    canComment: false,
    canFetchDetail: false,
    fetchTasks: async (token, filters = {}) => {
      const res = await hrApi.getTasks(token, filters);
      const data = res?.data || {};
      return {
        tasks: (data.tasks || []).map((t) => normalizeTask(t)),
        total: data.total ?? (data.tasks || []).length,
      };
    },
    updateStatus: (token, taskId, status) => hrApi.updateTask(taskId, { status }, token),
    createTask: (token, body) => hrApi.createTask(body, token),
    needsAssignee: true,
    fetchAssignableUsers: async (token) => {
      const res = await hrApi.getEmployees(token, { limit: 500 });
      const list = res?.data?.employees || res?.data?.users || (Array.isArray(res?.data) ? res.data : []);
      return list.map((u) => ({ id: u._id || u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email }));
    },
  },

  employee: {
    canCreate: true,
    canComment: true,
    canFetchDetail: true,
    fetchTasks: async (token, filters = {}, currentUser) => {
      const res = await employeeApi.getTasks(token, { view: 'list', limit: 50, ...filters });
      const data = res?.data || {};
      return {
        tasks: (data.tasks || []).map((t) => normalizeTask(t, { currentUser })),
        total: data.meta?.total ?? (data.tasks || []).length,
      };
    },
    fetchDetail: async (token, taskId, currentUser) => {
      const res = await employeeApi.getTask(token, taskId);
      return normalizeTask(res?.data, { currentUser });
    },
    updateStatus: (token, taskId, status) => employeeApi.updateTaskStatus(token, taskId, { status }),
    addComment: (token, taskId, text) => employeeApi.addTaskComment(token, taskId, text),
    createTask: (token, body) => employeeApi.createTask(token, body),
    needsAssignee: false, // employee-created tasks are always self-assigned
  },
};
