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
};
