import { apiClient } from './client';

export const employeeApi = {
  getDashboard: (token) => apiClient.get('/api/employee/dashboard', token),
  // Job board
  getJobOpenings: (token) => apiClient.get('/api/employee/job-openings', token),
  applyForJob: (token, data) => apiClient.post('/api/employee/job-openings/apply', data, token),
  getMyApplications: (token) => apiClient.get('/api/employee/my-applications', token),
  getProjects: (token) => apiClient.get('/api/employee/projects', token),
  getTasks: (token, params = '') => {
    if (typeof params === 'string') {
      return apiClient.get(`/api/employee/tasks${params}`, token);
    }
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/employee/tasks${query ? `?${query}` : ''}`, token);
  },
  getDocuments: (token) => apiClient.get('/api/employee/documents', token),
  uploadDocument: (token, body) => apiClient.post('/api/employee/documents', body, token),
  downloadDocument: (token, documentId) => apiClient.get(`/api/employee/documents/${documentId}/download`, token),
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
  getTask: (token, taskId) =>
    apiClient.get(`/api/dept/employee/tasks/${taskId}`, token),
  updateTaskStatus: (token, taskId, body) =>
    apiClient.put(`/api/dept/employee/tasks/${taskId}/status`, body, token),
  addTaskComment: (token, taskId, comment) =>
    apiClient.post(`/api/dept/employee/tasks/${taskId}/comment`, { comment }, token),
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
  setAttendanceLocation: (token, data = {}) =>
    apiClient.put('/api/dept/employee/attendance/location', data, token),
  getLeaves: (token, params = '') => {
    if (typeof params === 'string') {
      return apiClient.get(`/api/dept/employee/leave${params}`, token);
    }
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/employee/leave${query ? `?${query}` : ''}`, token);
  },
  getLeaveBalance: (token, year) =>
    apiClient.get(`/api/dept/employee/leave/balance${year ? `?year=${year}` : ''}`, token),
  requestLeave: (token, data) =>
    apiClient.post('/api/dept/employee/leave', data, token),
  cancelLeave: (token, leaveId, data = {}) =>
    apiClient.put(`/api/dept/employee/leave/${leaveId}/cancel`, data, token),
};
