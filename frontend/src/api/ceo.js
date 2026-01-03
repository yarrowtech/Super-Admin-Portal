import { apiClient } from './client';

export const ceoApi = {
  getDashboard: (token) => apiClient.get('/api/dept/ceo/dashboard', token),
  getReports: (token) => apiClient.get('/api/dept/ceo/reports', token),
  createAlert: (token, data) => apiClient.post('/api/dept/ceo/alert', data, token),
  
  // Chat functionality - CEO can use the same employee chat endpoints with proper permissions
  getChatThreads: (token) => apiClient.get('/api/employee/chat/threads', token),
  getChatMessages: (token, threadId) =>
    apiClient.get(`/api/employee/chat/threads/${threadId}/messages`, token),
  postChatMessage: (token, threadId, text) =>
    apiClient.post(`/api/employee/chat/threads/${threadId}/messages`, { text }, token),
  createChatThread: (token, targetUserId) =>
    apiClient.post('/api/employee/chat/threads', { targetUserId }, token),
  createGroupThread: (token, body) =>
    apiClient.post('/api/employee/chat/groups', body, token),
  
  // Team management for CEO
  getAllEmployees: (token) => apiClient.get('/api/dept/ceo/employees', token),
  getDepartmentStats: (token) => apiClient.get('/api/dept/ceo/departments', token),
};