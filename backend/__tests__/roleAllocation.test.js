const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAccessCatalog,
  getRoleDisplayName,
  isRoleValidForDepartment,
} = require('../utils/roleAllocation');

test('department access catalogue keeps internal role codes and generic labels', () => {
  const catalog = buildAccessCatalog(['it_manager', 'it_employee', 'finance_employee']);
  const it = catalog.find((department) => department.name === 'IT');

  assert.deepEqual(it.roles, [
    { id: 'it_manager', code: 'it_manager', displayName: 'Manager' },
    { id: 'it_employee', code: 'it_employee', displayName: 'Employee' },
  ]);
  assert.equal(getRoleDisplayName('finance_employee'), 'Employee');
});

test('department-role validation rejects cross-department assignments', () => {
  assert.equal(isRoleValidForDepartment('it_employee', 'IT'), true);
  assert.equal(isRoleValidForDepartment('it_employee', 'Finance'), false);
  assert.equal(isRoleValidForDepartment('freelancer', 'Outsourcing'), true);
  assert.equal(isRoleValidForDepartment('super_admin', 'Administration'), true);
});
