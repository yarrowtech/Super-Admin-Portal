import React from 'react';
import UserRoleManagement from '../../admin/UserRoleManagement';
import { hrApi } from '../../../services/hr';

const mapDashboard = async (token) => {
  const response = await hrApi.getDashboard(token);
  const data = response?.data || {};
  return {
    data: {
      totalUsers: data.totalEmployees || 0,
      activeUsers: data.activeEmployees || 0,
      inactiveUsers: data.employeeSummary?.inactive || 0,
      usersByRole: [],
      departmentStats: [],
      totalDepartments: 0,
    },
  };
};

const mapUsers = async (token, params = {}) => {
  const response = await hrApi.getEmployees(token, params);
  const data = response?.data || {};
  const users = data.employees || data.users || [];
  const total = data.total ?? data.totalUsers ?? users.length;
  return {
    data: {
      users,
      totalPages: data.totalPages || 1,
      currentPage: data.currentPage || 1,
      pageSize: params.limit || 10,
      totalUsers: total,
    },
  };
};

const hrUsersApi = {
  getDashboard: mapDashboard,
  getAllUsers: mapUsers,
  getUserById: async () => {
    throw new Error('User lookup is not available in the HR users page');
  },
  createUser: async (token, userData) => hrApi.createEmployee(userData, token),
  updateUser: async (token, userId, userData) => hrApi.updateEmployee(userId, userData, token),
  deleteUser: async (token, userId) => hrApi.deleteEmployee(userId, token),
  toggleUserStatus: async (token, userId) => hrApi.toggleEmployeeStatus(userId, token),
  setUserStatus: async (token, userId, accountStatus) =>
    hrApi.setEmployeeStatus(userId, accountStatus, token),
  exportUsers: async (token) => {
    const { blob } = await hrApi.exportEmployeesCsv({ token });
    return blob;
  },
  getDepartmentsOverview: async (token, params = {}) => hrApi.getDepartments(token, params),
};

const EmployeesPage = () => {
  return <UserRoleManagement api={hrUsersApi} />;
};

export default EmployeesPage;
