import { apiClient } from './client';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const buildQueryString = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (normalized === '' || normalized === 'undefined' || normalized === 'null') return;
    search.append(key, normalized);
  });
  return search.toString();
};

export const managerApi = {
  getDashboard: (token) => apiClient.get('/api/dept/manager/dashboard', token),
  getTeam: (token) => apiClient.get('/api/dept/manager/team', token),
  getProjectTeams: (token) => apiClient.get('/api/dept/manager/project-teams', token),
  createProjectTeam: (token, data) =>
    apiClient.post('/api/dept/manager/project-teams', data, token),
  getProjects: (token) => apiClient.get('/api/dept/manager/projects', token),
  createProject: (token, data) => apiClient.post('/api/dept/manager/projects', data, token),
  updateProject: (token, projectId, data) => apiClient.put(`/api/dept/manager/projects/${projectId}`, data, token),
  deleteProject: (token, projectId) => apiClient.delete(`/api/dept/manager/projects/${projectId}`, token),
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
    const query = buildQueryString(params);
    return apiClient.get(`/api/dept/manager/leave${query ? `?${query}` : ''}`, token);
  },
  approveLeave: (token, leaveId) =>
    apiClient.put(`/api/dept/manager/leave/${leaveId}/approve`, {}, token),
  rejectLeave: (token, leaveId, rejectionReason) =>
    apiClient.put(`/api/dept/manager/leave/${leaveId}/reject`, { rejectionReason }, token),
  getWorkReports: (token, params = {}) => {
    const query = buildQueryString(params);
    return apiClient.get(`/api/dept/manager/work-reports${query ? `?${query}` : ''}`, token);
  },
  getTasks: (token, params = {}) => {
    const query = buildQueryString(params);
    return apiClient.get(`/api/dept/manager/tasks${query ? `?${query}` : ''}`, token);
  },
  exportTasksCsv: async ({ token, status, priority, assignee, search, selectedIds = [] }) => {
    const params = new URLSearchParams();
    if (status?.trim()) params.set('status', status.trim());
    if (priority?.trim()) params.set('priority', priority.trim());
    if (assignee?.trim()) params.set('assignee', assignee.trim());
    if (search?.trim()) params.set('search', search.trim());
    const query = params.toString();
    const response = await fetch(`${API_BASE_URL}/api/dept/manager/tasks/export${query ? `?${query}` : ''}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ selectedIds }),
      credentials: 'include',
    });

    if (!response.ok) {
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      throw new Error(payload?.error || payload?.message || 'Failed to export manager tasks');
    }

    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/i);
    const fileName = match?.[1] || `manager-team-tasks-export-${Date.now()}.csv`;
    const blob = await response.blob();
    return { blob, fileName };
  },
  getTaskExportHistory: (token, params = {}) => {
    const query = buildQueryString(params);
    return apiClient.get(`/api/dept/manager/tasks/export-history${query ? `?${query}` : ''}`, token);
  },
  createTask: (token, data) =>
    apiClient.post('/api/dept/manager/tasks', data, token),
  updateTask: (token, taskId, data) =>
    apiClient.put(`/api/dept/manager/tasks/${taskId}`, data, token),
  reassignTask: (token, taskId, data) =>
    apiClient.put(`/api/dept/manager/tasks/${taskId}/reassign`, data, token),
  closeTask: (token, taskId) =>
    apiClient.put(`/api/dept/manager/tasks/${taskId}/close`, {}, token),
  
  // Attendance Management - Try multiple endpoint strategies
  getAttendance: async (token, params = '') => {
    const query =
      typeof params === 'string' && params.startsWith('?')
        ? params
        : typeof params === 'string'
        ? params
        : (() => {
            const built = buildQueryString(params);
            return built ? `?${built}` : '';
          })();

    const endpoints = [
      `/api/dept/hr/attendance${query}`,
      `/api/dept/manager/attendance${query}`,
      `/api/hr/attendance${query}`,
      `/api/attendance${query}`,
      `/api/employee/attendance${query}`,
      `/api/dept/employee/attendance${query}`,
    ];

    for (const endpoint of endpoints) {
      try {
        return await apiClient.get(endpoint, token);
      } catch (err) {
        continue;
      }
    }
    throw new Error('No available attendance endpoint found');
  },
  getAttendanceStatus: async (token) => apiClient.get('/api/attendance', token),

  checkIn: async (token, data = {}) => {
    const endpoints = [
      '/api/attendance/check-in',
      '/api/attendance/checkin',
      '/api/attendance/check_in',
      '/api/dept/hr/attendance/check-in',
      '/api/dept/manager/attendance/check-in',
      '/api/dept/manager/attendance/checkin',
      '/api/dept/manager/attendance/check_in',
      '/api/hr/attendance/check-in',
      '/api/hr/attendance/checkin',
      '/api/hr/attendance/check_in',
      '/api/employee/attendance/check-in',
      '/api/dept/employee/attendance/check-in',
    ];

    for (const endpoint of endpoints) {
      try {
        return await apiClient.post(endpoint, data, token);
      } catch (err) {
        continue;
      }
    }
    throw new Error('No available check-in endpoint found');
  },

  checkOut: async (token) => {
    const endpoints = [
      '/api/attendance/check-out',
      '/api/attendance/checkout',
      '/api/attendance/check_out',
      '/api/dept/hr/attendance/check-out',
      '/api/dept/manager/attendance/check-out',
      '/api/dept/manager/attendance/checkout',
      '/api/dept/manager/attendance/check_out',
      '/api/hr/attendance/check-out',
      '/api/hr/attendance/checkout',
      '/api/hr/attendance/check_out',
      '/api/employee/attendance/check-out',
      '/api/dept/employee/attendance/check-out',
    ];

    for (const endpoint of endpoints) {
      try {
        return await apiClient.put(endpoint, {}, token);
      } catch (err) {
        continue;
      }
    }
    throw new Error('No available check-out endpoint found');
  },
};
