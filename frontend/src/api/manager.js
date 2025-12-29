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
  getLeaveRequests: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/manager/leave${query ? `?${query}` : ''}`, token);
  },
  approveLeave: (token, leaveId) =>
    apiClient.put(`/api/dept/manager/leave/${leaveId}/approve`, {}, token),
  rejectLeave: (token, leaveId, rejectionReason) =>
    apiClient.put(`/api/dept/manager/leave/${leaveId}/reject`, { rejectionReason }, token),
  getTasks: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/manager/tasks${query ? `?${query}` : ''}`, token);
  },
  createTask: (token, data) =>
    apiClient.post('/api/dept/manager/tasks', data, token),
  updateTask: (token, taskId, data) =>
    apiClient.put(`/api/dept/manager/tasks/${taskId}`, data, token),
  reassignTask: (token, taskId, data) =>
    apiClient.put(`/api/dept/manager/tasks/${taskId}/reassign`, data, token),
  closeTask: (token, taskId) =>
    apiClient.put(`/api/dept/manager/tasks/${taskId}/close`, {}, token),
};
