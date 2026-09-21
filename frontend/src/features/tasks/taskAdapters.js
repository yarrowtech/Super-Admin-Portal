import { managerApi } from '../../services/manager';
import { hrApi } from '../../services/hr';
import { employeeApi } from '../../services/employee';
import { itApi } from '../../services/it';
import { financeApi } from '../../services/finance';
import { lawApi } from '../../services/law';
import { mediaModulesApi, outsourcingModulesApi } from '../../services/departmentModules';

const fetchHrPages = async (fetchPage, token, key, params = {}) => {
  const rows = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await fetchPage(token, { ...params, page, limit: 100 });
    const data = res?.data || {};
    rows.push(...(data[key] || (key === 'employees' ? data.users : []) || []));
    totalPages = Number(data.totalPages) || 1;
    page += 1;
  } while (page <= totalPages);
  return rows;
};

const personName = (person) => {
  if (!person) return '';
  if (person.name) return person.name;
  return `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.email || '';
};

const normalizePerson = (person) => {
  if (!person) return null;
  return {
    id: person._id || person.id,
    name: personName(person),
    email: person.email || '',
    department: person.department || '',
    role: person.role || '',
    isFreelancer: Boolean(person.isFreelancer) || person.role === 'freelancer',
  };
};

// Portal that created a task, for the label freelancers see. Falls back to the assigner's role for
// tasks created before Task.sourcePortal existed.
const PORTAL_LABELS = { it: 'IT', finance: 'Finance', law: 'Law', media: 'Media', hr: 'HR', outsourcing: 'Outsourcing', manager: 'Manager' };
const portalFromRole = (role) => {
  const r = String(role || '').toLowerCase();
  if (r.startsWith('it_')) return 'it';
  if (r.startsWith('finance_')) return 'finance';
  if (r.startsWith('law_')) return 'law';
  if (r.startsWith('media_')) return 'media';
  if (r === 'hr') return 'hr';
  if (r === 'manager') return 'manager';
  return '';
};
export const portalLabel = (key) => PORTAL_LABELS[key] || '';

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
    department: assignee?.department || '',
    sourcePortal: raw.sourcePortal || portalFromRole(raw.assignedBy?.role) || '',
    reporter: raw.assignedBy ? normalizePerson(raw.assignedBy) : null,
    progress: raw.progress ?? 0,
    isOverdue: Boolean(raw.isOverdue),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    linkedItems: Array.isArray(raw.linkedItems) ? raw.linkedItems.map((l) => ({ module: l.module, recordId: String(l.recordId), title: l.title || '' })) : [],
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
// Department-scoped tasks over the shared Task model. `api` comes from
// createDepartmentModulesApi(); assignees are the department's own members
// (GET <dept>/members), so the picker never offers people outside the scope.
const departmentTaskAdapter = (api) => ({
  canCreate: true,
  canComment: false,
  canFetchDetail: false,
  fetchTasks: async (token) => {
    const tasks = await fetchHrPages(api.getTasks, token, 'tasks');
    return { tasks: tasks.map((t) => normalizeTask(t)), total: tasks.length };
  },
  updateStatus: (token, taskId, status) => api.updateTask(token, taskId, { status }),
  createTask: (token, body) => api.createTask(token, body),
  updateTask: (token, taskId, body) => api.updateTask(token, taskId, body),
  deleteTask: api.deleteTask ? (token, taskId) => api.deleteTask(token, taskId) : undefined,
  needsAssignee: true,
  fetchAssignableUsers: async (token) => {
    const res = await api.getMembers(token, { for: 'task' });
    const list = Array.isArray(res?.data) ? res.data : [];
    return list.map(normalizePerson);
  },
});

export const taskAdapters = {
  manager: {
    canCreate: true,
    canComment: true,
    canFetchDetail: true,
    fetchTasks: async (token, filters = {}) => {
      const data = { tasks: await fetchHrPages(managerApi.getTasks, token, 'tasks', filters) };
      data.total = data.tasks.length;
      return {
        tasks: (data.tasks || []).map((t) => normalizeTask(t)),
        total: data.total ?? (data.tasks || []).length,
      };
    },
    fetchDetail: async (token, taskId) => {
      const res = await managerApi.getTask(token, taskId);
      return normalizeTask(res?.data);
    },
    updateStatus: (token, taskId, status) => managerApi.updateTask(token, taskId, { status }),
    createTask: (token, body) => managerApi.createTask(token, body),
    addComment: (token, taskId, text) => managerApi.addTaskComment(token, taskId, text),
    needsProject: true,
    fetchProjects: async (token) => (await fetchHrPages(managerApi.getProjects, token, 'projects')).filter(p => ['planning', 'in-progress'].includes(p.status)),
    needsAssignee: true,
    fetchAssignableUsers: async (token) => {
      const res = await managerApi.getTeam(token);
      const list = (res?.data?.team || []).filter(u => u.isActive);
      return list.map((u) => ({ id: u._id || u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email }));
    },
  },

  hr: {
    canCreate: true,
    canComment: true,
    canFetchDetail: true,
    fetchTasks: async (token) => {
      const data = { tasks: await fetchHrPages(hrApi.getTasks, token, 'tasks') };
      data.total = data.tasks.length;
      return {
        tasks: (data.tasks || []).map((t) => normalizeTask(t)),
        total: data.total ?? (data.tasks || []).length,
      };
    },
    fetchDetail: async (token, taskId) => {
      const res = await hrApi.getTask(taskId, token);
      return normalizeTask(res?.data);
    },
    updateStatus: (token, taskId, status) => hrApi.updateTask(taskId, { status }, token),
    createTask: (token, body) => hrApi.createTask(body, token),
    addComment: (token, taskId, text) => hrApi.addTaskComment(taskId, text, token),
    needsAssignee: true,
    fetchAssignableUsers: async (token) => {
      const list = await fetchHrPages(hrApi.getEmployees, token, 'employees', { isActive: 'true' });
      return list.map(normalizePerson);
    },
  },

  it: departmentTaskAdapter(itApi),
  finance: departmentTaskAdapter(financeApi),
  law: {
    ...departmentTaskAdapter(lawApi),
    // Law tasks can carry read-only linked records (head-only picker, employee sees them in the drawer).
    supportsLinkedItems: true,
    fetchLinkableItems: async (token) => {
      const res = await lawApi.getLinkableItems(token);
      return Array.isArray(res?.data) ? res.data : [];
    },
  },
  media: departmentTaskAdapter(mediaModulesApi),
  outsourcing: departmentTaskAdapter(outsourcingModulesApi),

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
