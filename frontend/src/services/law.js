import { apiClient } from './client';
import { createDepartmentModulesApi } from './departmentModules';

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.append(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
};

export const lawApi = {
  getDashboard: async (token, params = {}) => {
    return apiClient.get(`/api/dept/law/dashboard${toQueryString(params)}`, token);
  },
  getRecords: async (token, params = {}) => {
    return apiClient.get(`/api/dept/law/records${toQueryString(params)}`, token);
  },
  createRecord: async (token, data) => apiClient.post('/api/dept/law/records', data, token),
  updateRecord: async (token, id, data) => apiClient.put(`/api/dept/law/records/${id}`, data, token),
  deleteRecord: async (token, id) => apiClient.delete(`/api/dept/law/records/${id}`, token),
  getContracts: async (token, params = {}) => {
    return apiClient.get(`/api/dept/law/contracts${toQueryString(params)}`, token);
  },
  getCompliance: async (token, params = {}) => {
    return apiClient.get(`/api/dept/law/compliance${toQueryString(params)}`, token);
  },
  getProjects: async (token, params = {}) => {
    return apiClient.get(`/api/dept/law/projects${toQueryString(params)}`, token);
  },
  getProjectModuleData: async (token, moduleKey, projectId, params = {}) => {
    return apiClient.get(`/api/dept/law/module/${moduleKey}/project/${projectId}${toQueryString(params)}`, token);
  },
  uploadReferencePdfs: async (token, projectId, files = []) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const query = new URLSearchParams();
    if (projectId) query.append('projectId', projectId);
    const qs = query.toString();
    const res = await fetch(`${apiClient.getBaseUrl()}/api/dept/law/references/upload${qs ? `?${qs}` : ''}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      credentials: 'include'
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const error = new Error(data?.error || 'Failed to upload reference PDFs');
      error.status = res.status;
      throw error;
    }
    return data;
  },
  getReferencePdf: async (token, projectId, recordId, index) => {
    const query = new URLSearchParams({ projectId });
    const res = await fetch(`${apiClient.getBaseUrl()}/api/dept/law/records/${encodeURIComponent(recordId)}/references/${index}/view?${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || 'Unable to load PDF preview');
    }
    return res.blob();
  },

  // Law-only Team directory + Messages (backend restricts both to law_head / law_employee).
  getTeam: (token) => apiClient.get('/api/dept/law/team', token, { cache: false }),
  getChatThreads: (token) => apiClient.get('/api/dept/law/chat/threads', token, { cache: false }),
  getChatMessages: (token, threadId) => apiClient.get(`/api/dept/law/chat/threads/${threadId}/messages`, token, { cache: false }),
  postChatMessage: (token, threadId, text) => apiClient.post(`/api/dept/law/chat/threads/${threadId}/messages`, { text }, token),
  createChatThread: (token, targetUserId) => apiClient.post('/api/dept/law/chat/threads', { targetUserId }, token),
  createGroupThread: (token, body) => apiClient.post('/api/dept/law/chat/groups', body, token),

  // Records linked to a task (read-only; server authorises by task assignment + link).
  getLinkableItems: (token, params = {}) => apiClient.get(`/api/dept/law/task-items/options${toQueryString(params)}`, token, { cache: false }),
  getMyTaskItems: (token) => apiClient.get('/api/dept/law/task-items/mine', token, { cache: false }),
  getTaskItems: (token, taskId) => apiClient.get(`/api/dept/law/task-items/${taskId}`, token, { cache: false }),
  getTaskItem: (token, taskId, recordId) => apiClient.get(`/api/dept/law/task-items/${taskId}/${recordId}`, token, { cache: false }),
  getTaskItemFile: async (token, taskId, recordId, index, { download = false } = {}) => {
    const res = await fetch(`${apiClient.getBaseUrl()}/api/dept/law/task-items/${taskId}/${recordId}/files/${index}${download ? '?download=1' : ''}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || 'Unable to load file');
    }
    return res.blob();
  },

  ...createDepartmentModulesApi('/api/dept/law'),
};
