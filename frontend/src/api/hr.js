import { apiClient } from './client';

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

export const hrApi = {
  // Dashboard
  getDashboard: async (token) => {
    return apiClient.get('/api/dept/hr/dashboard', token);
  },

  // Employees Management
  getEmployees: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/employees${query ? `?${query}` : ''}`, token);
  },
  createEmployee: async (data, token) => {
    return apiClient.post('/api/dept/hr/employees', data, token);
  },
  updateEmployee: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/employees/${id}`, data, token);
  },
  toggleEmployeeStatus: async (id, token) => {
    return apiClient.post(`/api/dept/hr/employees/${id}/toggle-status`, {}, token);
  },

  // Applicants Management
  getApplicants: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/applicants${query ? `?${query}` : ''}`, token);
  },
  getApplicantById: async (id, token) => {
    return apiClient.get(`/api/dept/hr/applicants/${id}`, token);
  },
  createApplicant: async (data, token) => {
    return apiClient.post('/api/dept/hr/applicants', data, token);
  },
  updateApplicant: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/applicants/${id}`, data, token);
  },
  deleteApplicant: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/applicants/${id}`, token);
  },

  // Attendance Management
  getAttendance: async (token, params = {}) => {
    const query = buildQueryString(params);
    const pathSuffix = query ? `?${query}` : '';
    const endpoints = [
      `/api/dept/hr/attendance${pathSuffix}`,
      `/api/hr/attendance${pathSuffix}`,
      `/api/dept/manager/attendance${pathSuffix}`,
      `/api/attendance${pathSuffix}`,
      `/api/employee/attendance${pathSuffix}`,
      `/api/dept/employee/attendance${pathSuffix}`,
    ];
    for (const endpoint of endpoints) {
      try {
        return await apiClient.get(endpoint, token);
      } catch (err) {
        continue;
      }
    }
    throw new Error('Attendance route not available');
  },
  createAttendance: async (data, token) => {
    return apiClient.post('/api/dept/hr/attendance', data, token);
  },
  updateAttendance: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/attendance/${id}`, data, token);
  },
  getEmployeeAttendance: async (employeeId, token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/attendance/employee/${employeeId}${query ? `?${query}` : ''}`, token);
  },
  // Personal attendance for HR staff
  checkIn: async (token, data = {}) => {
    const endpoints = [
      '/api/dept/hr/attendance/check-in',
      '/api/dept/hr/attendance/checkin',
      '/api/dept/hr/attendance/check_in',
      '/api/hr/attendance/check-in',
      '/api/hr/attendance/checkin',
      '/api/hr/attendance/check_in',
      '/api/dept/manager/attendance/check-in',
      '/api/dept/manager/attendance/checkin',
      '/api/dept/manager/attendance/check_in',
      '/api/attendance/check-in',
      '/api/attendance/checkin',
      '/api/attendance/check_in',
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
    throw new Error('Attendance check-in route not available');
  },
  checkOut: async (token) => {
    const endpoints = [
      '/api/dept/hr/attendance/check-out',
      '/api/dept/hr/attendance/checkout',
      '/api/dept/hr/attendance/check_out',
      '/api/hr/attendance/check-out',
      '/api/hr/attendance/checkout',
      '/api/hr/attendance/check_out',
      '/api/dept/manager/attendance/check-out',
      '/api/dept/manager/attendance/checkout',
      '/api/dept/manager/attendance/check_out',
      '/api/attendance/check-out',
      '/api/attendance/checkout',
      '/api/attendance/check_out',
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
    throw new Error('Attendance check-out route not available');
  },

  // Task Management
  getTasks: async (token, params = {}) => {
    const query = buildQueryString(params);
    return apiClient.get(`/api/dept/hr/tasks${query ? `?${query}` : ''}`, token);
  },
  createTask: async (data, token) => {
    return apiClient.post('/api/dept/hr/tasks', data, token);
  },
  updateTask: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/tasks/${id}`, data, token);
  },
  closeTask: async (id, token) => {
    return apiClient.put(`/api/dept/hr/tasks/${id}/close`, {}, token);
  },

  // Leave Management
  getLeaveRequests: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/leave${query ? `?${query}` : ''}`, token);
  },
  requestLeave: async (data, token) => {
    return apiClient.post('/api/dept/hr/leave/request', data, token);
  },
  approveLeave: async (id, token) => {
    return apiClient.put(`/api/dept/hr/leave/${id}/approve`, {}, token);
  },
  rejectLeave: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/leave/${id}/reject`, data, token);
  },

  // Leave Policies
  getLeavePolicies: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/leave-policies${query ? `?${query}` : ''}`, token);
  },
  createLeavePolicy: async (data, token) => {
    return apiClient.post('/api/dept/hr/leave-policies', data, token);
  },
  updateLeavePolicy: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/leave-policies/${id}`, data, token);
  },
  deleteLeavePolicy: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/leave-policies/${id}`, token);
  },

  // Departments
  getDepartments: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/departments${query ? `?${query}` : ''}`, token);
  },
  createDepartment: async (data, token) => {
    return apiClient.post('/api/dept/hr/departments', data, token);
  },
  updateDepartment: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/departments/${id}`, data, token);
  },
  deleteDepartment: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/departments/${id}`, token);
  },

  // Designations
  getDesignations: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/designations${query ? `?${query}` : ''}`, token);
  },
  createDesignation: async (data, token) => {
    return apiClient.post('/api/dept/hr/designations', data, token);
  },
  updateDesignation: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/designations/${id}`, data, token);
  },
  deleteDesignation: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/designations/${id}`, token);
  },

  // Notices
  getNotices: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/notices${query ? `?${query}` : ''}`, token);
  },
  createNotice: async (data, token) => {
    return apiClient.post('/api/dept/hr/notices', data, token);
  },
  updateNotice: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/notices/${id}`, data, token);
  },
  deleteNotice: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/notices/${id}`, token);
  },

  // Performance Reviews
  getPerformanceReviews: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/performance${query ? `?${query}` : ''}`, token);
  },
  createPerformanceReview: async (data, token) => {
    return apiClient.post('/api/dept/hr/performance', data, token);
  },
  updatePerformanceReview: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/performance/${id}`, data, token);
  },

  // Complaints
  getComplaints: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/complaints${query ? `?${query}` : ''}`, token);
  },
  getComplaintById: async (id, token) => {
    return apiClient.get(`/api/dept/hr/complaints/${id}`, token);
  },
  assignComplaint: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/complaints/${id}/assign`, data, token);
  },
  resolveComplaint: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/complaints/${id}/resolve`, data, token);
  },
  addComplaintComment: async (id, data, token) => {
    return apiClient.post(`/api/dept/hr/complaints/${id}/comment`, data, token);
  },

  // Work Reports
  getWorkReports: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/work-reports${query ? `?${query}` : ''}`, token);
  },
  reviewWorkReport: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/work-reports/${id}/review`, data, token);
  },

  // Employee Documents
  getEmployeeDocuments: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/employee-documents${query ? `?${query}` : ''}`, token);
  },
  createEmployeeDocument: async (data, token) => {
    return apiClient.post('/api/dept/hr/employee-documents', data, token);
  },
  updateEmployeeDocument: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/employee-documents/${id}`, data, token);
  },
  deleteEmployeeDocument: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/employee-documents/${id}`, token);
  },

  // Biometric Enrollments
  getBiometricEnrollments: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/biometrics${query ? `?${query}` : ''}`, token);
  },
  createBiometricEnrollment: async (data, token) => {
    return apiClient.post('/api/dept/hr/biometrics', data, token);
  },
  updateBiometricEnrollment: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/biometrics/${id}`, data, token);
  },
  deleteBiometricEnrollment: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/biometrics/${id}`, token);
  },

  // Holidays
  getHolidays: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/holidays${query ? `?${query}` : ''}`, token);
  },
  createHoliday: async (data, token) => {
    return apiClient.post('/api/dept/hr/holidays', data, token);
  },
  updateHoliday: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/holidays/${id}`, data, token);
  },
  deleteHoliday: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/holidays/${id}`, token);
  },

  // Recruitment - Job Posts
  getJobPosts: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/jobs${query ? `?${query}` : ''}`, token);
  },
  createJobPost: async (data, token) => {
    return apiClient.post('/api/dept/hr/jobs', data, token);
  },
  updateJobPost: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/jobs/${id}`, data, token);
  },
  deleteJobPost: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/jobs/${id}`, token);
  },

  // Recruitment - Interviews
  getInterviews: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/interviews${query ? `?${query}` : ''}`, token);
  },
  createInterview: async (data, token) => {
    return apiClient.post('/api/dept/hr/interviews', data, token);
  },
  updateInterview: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/interviews/${id}`, data, token);
  },
  deleteInterview: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/interviews/${id}`, token);
  },

  // Recruitment - Offers
  getOffers: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/offers${query ? `?${query}` : ''}`, token);
  },
  createOffer: async (data, token) => {
    return apiClient.post('/api/dept/hr/offers', data, token);
  },
  updateOffer: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/offers/${id}`, data, token);
  },
  deleteOffer: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/offers/${id}`, token);
  },

  // Appraisal Cycles
  getAppraisalCycles: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/appraisal-cycles${query ? `?${query}` : ''}`, token);
  },
  createAppraisalCycle: async (data, token) => {
    return apiClient.post('/api/dept/hr/appraisal-cycles', data, token);
  },
  updateAppraisalCycle: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/appraisal-cycles/${id}`, data, token);
  },
  deleteAppraisalCycle: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/appraisal-cycles/${id}`, token);
  },

  // Appraisal Reviews
  getAppraisalReviews: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/appraisals${query ? `?${query}` : ''}`, token);
  },
  createAppraisalReview: async (data, token) => {
    return apiClient.post('/api/dept/hr/appraisals', data, token);
  },
  updateAppraisalReview: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/appraisals/${id}`, data, token);
  },
  deleteAppraisalReview: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/appraisals/${id}`, token);
  },

  // Policy Documents
  getPolicies: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/policies${query ? `?${query}` : ''}`, token);
  },
  createPolicy: async (data, token) => {
    return apiClient.post('/api/dept/hr/policies', data, token);
  },
  updatePolicy: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/policies/${id}`, data, token);
  },
  deletePolicy: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/policies/${id}`, token);
  },

  // Policy Acknowledgements
  getPolicyAcknowledgements: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/policy-acknowledgements${query ? `?${query}` : ''}`, token);
  },
  createPolicyAcknowledgement: async (data, token) => {
    return apiClient.post('/api/dept/hr/policy-acknowledgements', data, token);
  },
  deletePolicyAcknowledgement: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/policy-acknowledgements/${id}`, token);
  },

  // Support Tickets
  getSupportTickets: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/support-tickets${query ? `?${query}` : ''}`, token);
  },
  createSupportTicket: async (data, token) => {
    return apiClient.post('/api/dept/hr/support-tickets', data, token);
  },
  updateSupportTicket: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/support-tickets/${id}`, data, token);
  },
  assignSupportTicket: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/support-tickets/${id}/assign`, data, token);
  },
  resolveSupportTicket: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/support-tickets/${id}/resolve`, data, token);
  },
  closeSupportTicket: async (id, token) => {
    return apiClient.put(`/api/dept/hr/support-tickets/${id}/close`, {}, token);
  },
  addSupportTicketComment: async (id, data, token) => {
    return apiClient.post(`/api/dept/hr/support-tickets/${id}/comment`, data, token);
  },

  // Exit Interviews
  getExitInterviews: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/hr/exit-interviews${query ? `?${query}` : ''}`, token);
  },
  createExitInterview: async (data, token) => {
    return apiClient.post('/api/dept/hr/exit-interviews', data, token);
  },
  updateExitInterview: async (id, data, token) => {
    return apiClient.put(`/api/dept/hr/exit-interviews/${id}`, data, token);
  },
  deleteExitInterview: async (id, token) => {
    return apiClient.delete(`/api/dept/hr/exit-interviews/${id}`, token);
  },
};
