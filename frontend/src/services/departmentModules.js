import { apiClient } from './client';

const withQuery = (path, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || Number.isNaN(value)) return;
    query.append(key, value);
  });
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
};

/**
 * Tasks / Attendance / Jobs / members endpoints for a department portal.
 * `base` is the department API root, e.g. '/api/dept/it'. The backend mounts
 * these with mountDepartmentModules() (backend/middlewares/departmentScope.middleware.js).
 * All functions take the auth token first.
 */
export const createDepartmentModulesApi = (base) => ({
  // Department members (assignee / employee pickers)
  // params.for = 'task' returns the task-assignable set (no heads, plus the portal's associated freelancers).
  getMembers: (token, params = {}) => apiClient.get(withQuery(`${base}/members`, params), token, { cache: false }),

  // Tasks
  getTasks: (token, params = {}) => apiClient.get(withQuery(`${base}/tasks`, params), token, { cache: false }),
  createTask: (token, data) => apiClient.post(`${base}/tasks`, data, token),
  updateTask: (token, id, data) => apiClient.put(`${base}/tasks/${id}`, data, token),
  closeTask: (token, id) => apiClient.put(`${base}/tasks/${id}/close`, {}, token),
  deleteTask: (token, id) => apiClient.delete(`${base}/tasks/${id}`, token),

  // Attendance
  getAttendance: (token, params = {}) => apiClient.get(withQuery(`${base}/attendance`, params), token, { cache: false }),
  createAttendance: (token, data) => apiClient.post(`${base}/attendance`, data, token),
  updateAttendance: (token, id, data) => apiClient.put(`${base}/attendance/${id}`, data, token),

  // Jobs (recruitment postings)
  getJobPosts: (token, params = {}) => apiClient.get(withQuery(`${base}/jobs`, params), token, { cache: false }),
  createJobPost: (token, data) => apiClient.post(`${base}/jobs`, data, token),
  updateJobPost: (token, id, data) => apiClient.put(`${base}/jobs/${id}`, data, token),
  deleteJobPost: (token, id) => apiClient.delete(`${base}/jobs/${id}`, token),
});

/**
 * Department-only Team directory + Messages endpoints (backend: utils/mountDepartmentCollab.js).
 * Shape matches what PortalChat expects from its `api` prop.
 */
export const createDepartmentCollabApi = (base) => ({
  getTeam: (token) => apiClient.get(`${base}/team`, token, { cache: false }),
  getChatThreads: (token) => apiClient.get(`${base}/chat/threads`, token, { cache: false }),
  getChatMessages: (token, threadId) => apiClient.get(`${base}/chat/threads/${threadId}/messages`, token, { cache: false }),
  postChatMessage: (token, threadId, text) => apiClient.post(`${base}/chat/threads/${threadId}/messages`, { text }, token),
  createChatThread: (token, targetUserId) => apiClient.post(`${base}/chat/threads`, { targetUserId }, token),
  createGroupThread: (token, body) => apiClient.post(`${base}/chat/groups`, body, token),
});

// Portals that already have a bespoke service file get their Tasks/Attendance/Jobs
// modules through these standalone instances.
export const managerModulesApi = createDepartmentModulesApi('/api/dept/manager');
export const mediaModulesApi = createDepartmentModulesApi('/api/dept/media/modules');
export const mediaCollabApi = createDepartmentCollabApi('/api/dept/media/modules');
export const outsourcingModulesApi = createDepartmentModulesApi('/api/outsourcing/modules');
