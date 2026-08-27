const test = require('node:test');
const assert = require('node:assert/strict');

const { authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

// Regression test for the HR portal role-guard fix (Phase 2A): it_manager's
// real portal is 'manager', not 'hr' — the frontend's HR_PORTAL_ROLES,
// baseRoleAccess map, and allow('hr') route guard all agree on this. The
// backend previously authorized it_manager for every /api/dept/hr/* route
// even though the UI never exposed HR navigation to that role, letting an
// it_manager call the HR API directly. This locks the same role list
// hr.routes.js uses so a future edit can't silently reintroduce the gap.
const hrAuthorize = authorize(ROLES.HR, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.IT_HR);

const mockReq = (role) => ({
  user: { id: 'u1', role },
  headers: {},
  originalUrl: '/api/dept/hr/dashboard',
  method: 'GET',
});

const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

test('HR routes reject it_manager', () => {
  const req = mockReq(ROLES.IT_MANAGER);
  const res = mockRes();
  let nextCalled = false;
  hrAuthorize(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'INSUFFICIENT_PERMISSIONS');
});

test('HR routes allow hr and it_hr', () => {
  for (const role of [ROLES.HR, ROLES.IT_HR]) {
    const req = mockReq(role);
    const res = mockRes();
    let nextCalled = false;
    hrAuthorize(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true, `expected role "${role}" to be allowed`);
  }
});

test('HR routes allow platform admin overrides', () => {
  for (const role of [ROLES.ADMIN, ROLES.SUPER_ADMIN]) {
    const req = mockReq(role);
    const res = mockRes();
    let nextCalled = false;
    hrAuthorize(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true, `expected role "${role}" to be allowed`);
  }
});
