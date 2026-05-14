import { apiClient } from './client';

export const ceoApi = {
  getDashboard: (token) => apiClient.get('/api/dept/ceo/dashboard', token),
  getOverview: (token) => apiClient.get('/api/dept/ceo/overview', token),
  getRevenueAnalytics: (token) => apiClient.get('/api/dept/ceo/revenue', token),
  getProductAnalytics: (token) => apiClient.get('/api/dept/ceo/products', token),
  getEmployeeAnalytics: (token) => apiClient.get('/api/dept/ceo/employees-analytics', token),
  getDepartmentAnalytics: (token) => apiClient.get('/api/dept/ceo/departments-analytics', token),
  getProjectAnalytics: (token) => apiClient.get('/api/dept/ceo/projects-analytics', token),
  getNotificationAnalytics: (token) => apiClient.get('/api/dept/ceo/notifications-analytics', token),
  getReports: (token, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return apiClient.get(`/api/dept/ceo/reports${query ? `?${query}` : ''}`, token);
  },
  createAlert: (token, data) => apiClient.post('/api/dept/ceo/alert', data, token),
  
  // Chat functionality - dedicated CEO chat endpoints
  getChatThreads: (token) => apiClient.get('/api/dept/ceo/chat/threads', token),
  getChatMessages: (token, threadId) =>
    apiClient.get(`/api/dept/ceo/chat/threads/${threadId}/messages`, token),
  postChatMessage: (token, threadId, text) =>
    apiClient.post(`/api/dept/ceo/chat/threads/${threadId}/messages`, { text }, token),
  createChatThread: (token, targetUserId) =>
    apiClient.post('/api/dept/ceo/chat/threads', { targetUserId }, token),
  createGroupThread: (token, body) =>
    apiClient.post('/api/dept/ceo/chat/groups', body, token),
  // Unified chat module APIs
  getConversations: (token, params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') q.set(k, String(v));
    });
    const query = q.toString();
    return apiClient.get(`/api/chat/conversations${query ? `?${query}` : ''}`, token);
  },
  getConversationMessages: (token, conversationId, params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') q.set(k, String(v));
    });
    const query = q.toString();
    return apiClient.get(`/api/chat/messages/${conversationId}${query ? `?${query}` : ''}`, token);
  },
  sendConversationMessage: (token, payload) => apiClient.post('/api/chat/send', payload, token),
  markConversationRead: (token, payload) => apiClient.post('/api/chat/read', payload, token),
  sendAnnouncement: (token, payload) => apiClient.post('/api/chat/announcement', payload, token),
  
  // Team management for CEO
  getAllEmployees: (token) => apiClient.get('/api/dept/ceo/employees/list', token),
  getDepartmentStats: (token) => apiClient.get('/api/dept/ceo/departments/list', token),
  
  // Notifications
  getNotifications: (token) => apiClient.get('/api/dept/ceo/notifications', token),
  markNotificationRead: (token, notificationId) =>
    apiClient.put(`/api/dept/ceo/notifications/${notificationId}/read`, {}, token),
  markAllNotificationsRead: (token) =>
    apiClient.put('/api/dept/ceo/notifications/mark-all-read', {}, token),
};
