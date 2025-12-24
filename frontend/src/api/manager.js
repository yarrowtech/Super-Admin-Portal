import { apiClient } from './client';

export const managerApi = {
  getDashboard: (token) => apiClient.get('/api/dept/manager/dashboard', token),
  getTeam: (token) => apiClient.get('/api/dept/manager/team', token),
  getProjects: (token) => apiClient.get('/api/dept/manager/projects', token),
};
