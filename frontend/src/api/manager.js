import { apiClient } from './client';

export const managerApi = {
  getDashboard: (token) => apiClient.get('/api/dept/manager/dashboard', token),
  getTeam: (token) => apiClient.get('/api/dept/manager/team', token),
  getProjects: (token) => apiClient.get('/api/dept/manager/projects', token),
  getNotifications: (token) => apiClient.get('/api/dept/manager/notifications', token),
  markNotificationRead: (token, notificationId) => 
    apiClient.put(`/api/dept/manager/notifications/${notificationId}/read`, {}, token),
  markAllNotificationsRead: (token) => 
    apiClient.put('/api/dept/manager/notifications/mark-all-read', {}, token),
  getTaskDetails: (token, taskId) => 
    apiClient.get(`/api/dept/manager/tasks/${taskId}`, token),
  getEmployeeWork: (token, params = '') => 
    apiClient.get(`/api/dept/manager/employee-work${params}`, token),
  getEmployeeWorkStats: (token) => 
    apiClient.get('/api/dept/manager/employee-work/stats', token),
  getCompletedTasks: (token, params = '') => 
    apiClient.get(`/api/dept/manager/completed-tasks${params}`, token),
  approveWork: (token, workId) => 
    apiClient.put(`/api/dept/manager/employee-work/${workId}/approve`, {}, token),
  rejectWork: (token, workId, reason) => 
    apiClient.put(`/api/dept/manager/employee-work/${workId}/reject`, { reason }, token),
};
