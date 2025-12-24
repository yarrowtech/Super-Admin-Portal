import { apiClient } from './client';

export const hrApi = {
  getDashboard: async (token) => {
    return apiClient.get('/api/dept/hr/dashboard', token);
  },
};
