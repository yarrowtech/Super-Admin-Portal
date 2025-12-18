import { apiClient } from './client';

const buildUrl = (path, params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || Number.isNaN(value)) {
      return;
    }
    query.append(key, value);
  });

  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
};

export const itApi = {
  getDashboard: async (token) => apiClient.get('/api/dept/it/dashboard', token),

  getProjects: async (token, params = {}) =>
    apiClient.get(buildUrl('/api/dept/it/projects', params), token),

  createProject: async (token, projectData) =>
    apiClient.post('/api/dept/it/projects', projectData, token),

  updateProject: async (token, projectId, projectData) =>
    apiClient.put(`/api/dept/it/projects/${projectId}`, projectData, token),

  deleteProject: async (token, projectId) =>
    apiClient.delete(`/api/dept/it/projects/${projectId}`, token),

  addProjectMember: async (token, projectId, payload) =>
    apiClient.put(`/api/dept/it/projects/${projectId}/add-member`, payload, token),

  updateProjectProgress: async (token, projectId, payload) =>
    apiClient.put(`/api/dept/it/projects/${projectId}/update-progress`, payload, token),

  getSupportTickets: async (token, params = {}) =>
    apiClient.get(buildUrl('/api/dept/it/support-tickets', params), token),

  getSupportTicketById: async (token, ticketId) =>
    apiClient.get(`/api/dept/it/support-tickets/${ticketId}`, token),

  createSupportTicket: async (token, ticketData) =>
    apiClient.post('/api/dept/it/support-tickets', ticketData, token),

  updateSupportTicket: async (token, ticketId, ticketData) =>
    apiClient.put(`/api/dept/it/support-tickets/${ticketId}`, ticketData, token),

  assignSupportTicket: async (token, ticketId, payload) =>
    apiClient.put(`/api/dept/it/support-tickets/${ticketId}/assign`, payload, token),

  resolveSupportTicket: async (token, ticketId, payload) =>
    apiClient.put(`/api/dept/it/support-tickets/${ticketId}/resolve`, payload, token),

  closeSupportTicket: async (token, ticketId) =>
    apiClient.put(`/api/dept/it/support-tickets/${ticketId}/close`, {}, token),

  addTicketComment: async (token, ticketId, payload) =>
    apiClient.post(`/api/dept/it/support-tickets/${ticketId}/comment`, payload, token),
};
