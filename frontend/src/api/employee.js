import { apiClient } from './client';

export const employeeApi = {
  getDashboard: (token) => apiClient.get('/api/employee/dashboard', token),
  getProjects: (token) => apiClient.get('/api/employee/projects', token),
  getTasks: (token) => apiClient.get('/api/employee/tasks', token),
  getDocuments: (token) => apiClient.get('/api/employee/documents', token),
  getTeam: (token) => apiClient.get('/api/employee/team', token),
  getChatThreads: (token) => apiClient.get('/api/employee/chat/threads', token),
  getChatMessages: (token, threadId) =>
    apiClient.get(`/api/employee/chat/threads/${threadId}/messages`, token),
  postChatMessage: (token, threadId, text) =>
    apiClient.post(`/api/employee/chat/threads/${threadId}/messages`, { text }, token),
  createChatThread: (token, targetUserId) =>
    apiClient.post('/api/employee/chat/threads', { targetUserId }, token),
  createGroupThread: (token, body) =>
    apiClient.post('/api/employee/chat/groups', body, token),
  updateTaskStatus: (token, taskId, body) =>
    apiClient.put(`/api/dept/employee/tasks/${taskId}/status`, body, token),
  notifyManagerTaskReview: (token, taskId, taskData) =>
    apiClient.post(`/api/employee/notify-manager/task-review/${taskId}`, taskData, token),
  createTask: (token, body) =>
    apiClient.post('/api/employee/projects/tasks', body, token),
  deleteTask: (token, taskId) =>
    apiClient.delete(`/api/employee/projects/tasks/${taskId}`, token),
  getAttendance: (token, params = '') =>
    apiClient.get(`/api/dept/employee/attendance${params}`, token),
  checkIn: (token, data = {}) =>
    apiClient.post('/api/dept/employee/attendance/check-in', data, token),
  checkOut: (token) =>
    apiClient.put('/api/dept/employee/attendance/check-out', {}, token),
  getLeaves: (token, params = '') => {
    if (typeof params === 'string') {
      return apiClient.get(`/api/dept/employee/leave${params}`, token);
    }
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/employee/leave${query ? `?${query}` : ''}`, token);
  },
  requestLeave: (token, data) =>
    apiClient.post('/api/dept/employee/leave', data, token),
  cancelLeave: (token, leaveId) =>
    apiClient.put(`/api/dept/employee/leave/${leaveId}/cancel`, {}, token),
};
