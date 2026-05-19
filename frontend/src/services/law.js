import { apiClient } from './client';

export const lawApi = {
  getDashboard: async (token) => apiClient.get('/api/dept/law/dashboard', token),
  getRecords: async (token, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString();
    return apiClient.get(`/api/dept/law/records${queryString ? `?${queryString}` : ''}`, token);
  },
  createRecord: async (token, data) => apiClient.post('/api/dept/law/records', data, token),
  updateRecord: async (token, id, data) => apiClient.put(`/api/dept/law/records/${id}`, data, token),
  deleteRecord: async (token, id) => apiClient.delete(`/api/dept/law/records/${id}`, token),
  getContracts: async (token) => apiClient.get('/api/dept/law/contracts', token),
  getCompliance: async (token) => apiClient.get('/api/dept/law/compliance', token),
  getProjects: async (token, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.append(key, value);
    });
    const qs = query.toString();
    return apiClient.get(`/api/law/projects${qs ? `?${qs}` : ''}`, token);
  },
  getProjectModuleData: async (token, moduleKey, projectId, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.append(key, value);
    });
    const qs = query.toString();
    return apiClient.get(`/api/law/module/${moduleKey}/project/${projectId}${qs ? `?${qs}` : ''}`, token);
  },
};
