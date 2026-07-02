import { apiClient } from './client';

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
};
