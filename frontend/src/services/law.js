import { apiClient } from './client';

export const lawApi = {
  getDashboard: async (token, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.append(key, value);
    });
    const qs = query.toString();
    return apiClient.get(`/api/dept/law/dashboard${qs ? `?${qs}` : ''}`, token);
  },
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
  getContracts: async (token, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.append(key, value);
    });
    const qs = query.toString();
    return apiClient.get(`/api/dept/law/contracts${qs ? `?${qs}` : ''}`, token);
  },
  getCompliance: async (token, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.append(key, value);
    });
    const qs = query.toString();
    return apiClient.get(`/api/dept/law/compliance${qs ? `?${qs}` : ''}`, token);
  },
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
};
