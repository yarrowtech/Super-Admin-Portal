import { apiClient } from './client';

export const adminApi = {
  getDashboard: async (token, options = {}) => {
    return apiClient.get('/api/dept/admin/dashboard', token, options);
  },

  getAllUsers: async (token, params = {}) => {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.role) queryParams.append('role', params.role);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);
    if (params.accountStatus) queryParams.append('accountStatus', params.accountStatus);
    if (params.department) queryParams.append('department', params.department);
    if (params.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    const url = `/api/dept/admin/users${queryString ? `?${queryString}` : ''}`;

    return apiClient.get(url, token, { cache: false });
  },

  getUserById: async (token, userId) => {
    return apiClient.get(`/api/dept/admin/users/${userId}`, token);
  },

  createUser: async (token, userData) => {
    return apiClient.post('/api/dept/admin/users', userData, token);
  },

  updateUser: async (token, userId, userData) => {
    return apiClient.put(`/api/dept/admin/users/${userId}`, userData, token);
  },

  deleteUser: async (token, userId) => {
    return apiClient.delete(`/api/dept/admin/users/${userId}`, token);
  },

  toggleUserStatus: async (token, userId) => {
    return apiClient.post(`/api/dept/admin/users/${userId}/toggle-status`, {}, token);
  },

  setUserStatus: async (token, userId, accountStatus) => {
    return apiClient.patch(`/api/dept/admin/users/${userId}/status`, { accountStatus }, token);
  },

  exportUsers: async (token) => {
    const res = await fetch(`${apiClient.getBaseUrl()}/api/dept/admin/users/export`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || data?.message || 'Failed to export users');
    }

    return res.blob();
  },

  getDepartmentsOverview: async (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    const qs = q.toString();
    return apiClient.get(`/api/dept/admin/modules/departments${qs ? `?${qs}` : ''}`, token);
  },

  getReportsOverview: async (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    if (params.reportType) q.append('reportType', params.reportType);
    if (params.department) q.append('department', params.department);
    if (params.from) q.append('from', params.from);
    if (params.to) q.append('to', params.to);
    const qs = q.toString();
    return apiClient.get(`/api/dept/admin/modules/reports${qs ? `?${qs}` : ''}`, token, { cache: false });
  },

  createCustomReport: async (token, body) => {
    return apiClient.post('/api/dept/admin/modules/reports', body, token);
  },
};
