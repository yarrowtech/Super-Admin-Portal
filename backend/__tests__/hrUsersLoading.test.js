const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const loadHrUsers = () => {
  const calls = [];
  const users = [{ _id: 'user-1', firstName: 'Test', isActive: true }];
  const apiClient = {
    get: async (url, token, options) => {
      calls.push({ url, token, options });
      if (url.includes('/roles/access-catalog')) return { data: { departments: [{ id: 'hr' }] } };
      if (url.includes('/employees')) return { data: { users, totalUsers: 21, totalPages: 3, currentPage: 2 } };
      return { data: { totalEmployees: 21, activeEmployees: 20, employeeSummary: { inactive: 1 } } };
    },
  };
  const service = fs.readFileSync(path.join(__dirname, '../../frontend/src/services/hr.js'), 'utf8')
    .replace("import { apiClient } from './client';", '')
    .replace('import.meta.env.VITE_API_URL', 'undefined')
    .replace('export const hrApi', 'const hrApi');
  const page = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/hr/pages/EmployeesPage.jsx'), 'utf8');
  const adapter = page.slice(page.indexOf('const mapDashboard'), page.indexOf('const EmployeesPage'));
  const context = { apiClient, URLSearchParams };
  vm.createContext(context);
  vm.runInContext(`${service}\n${adapter}\nthis.api = hrUsersApi;`, context);
  return { api: context.api, calls, users };
};

test('HR Users loads the catalog through the HR API and preserves pagination', async () => {
  const { api, calls, users } = loadHrUsers();
  const [catalog, list] = await Promise.all([
    api.getAccessCatalog('hr-token', 'Human Resources'),
    api.getAllUsers('hr-token', { page: 2, limit: 10, search: 'Test', role: undefined }),
  ]);
  assert.equal(catalog.data.departments[0].id, 'hr');
  assert.equal(calls[0].url, '/api/dept/hr/roles/access-catalog?department=Human+Resources');
  assert.equal(calls[0].token, 'hr-token');
  assert.equal(list.data.users, users);
  assert.equal(list.data.totalUsers, 21);
  assert.equal(list.data.totalPages, 3);
  assert.equal(list.data.currentPage, 2);
  assert.equal(calls[1].url, '/api/dept/hr/employees?page=2&limit=10&search=Test');
  assert.equal(calls[1].options.cache, false);
});

test('HR Users forwards dashboard refresh options and maps counts', async () => {
  const { api, calls } = loadHrUsers();
  const options = { forceRefresh: true };
  const result = await api.getDashboard('hr-token', options);
  assert.equal(calls[0].options, options);
  assert.equal(result.data.totalUsers, 21);
  assert.equal(result.data.activeUsers, 20);
  assert.equal(result.data.inactiveUsers, 1);
});

test('HR router exposes the shared access catalog after its authentication guards', () => {
  const router = require('../routes/hr.routes');
  const controller = require('../controllers/admin/roleManagement.controller');
  const index = router.stack.findIndex((layer) => layer.route?.path === '/roles/access-catalog');
  assert.ok(index > 2);
  assert.equal(router.stack[0].name, 'authenticate');
  assert.equal(router.stack[index].route.methods.get, true);
  assert.equal(router.stack[index].route.stack[0].handle, controller.getAccessCatalog);
});
