import { apiClient } from './client';

export const adminApi = {
  getDashboard: async (token) => {
    return apiClient.get('/api/dept/admin/dashboard', token);
  },

  getAllUsers: async (token, params = {}) => {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.role) queryParams.append('role', params.role);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);
    if (params.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    const url = `/api/dept/admin/users${queryString ? `?${queryString}` : ''}`;

    return apiClient.get(url, token);
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
};
