const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/auth/User');
const ActivityLog = require('../models/auth/ActivityLog');
const logService = require('../services/log.service');
const controller = require('../controllers/admin/userManagement.controller');
const targetId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const actorId = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function setup(t, body, self = false) {
  const user = {
    _id: targetId, role: 'media_head', department: 'Media', phone: '1234567890',
    isActive: true, accountStatus: 'active', permissions: ['custom:read'],
    metadata: { projectAssignments: [{ projectId: 'project1', role: 'owner' }] },
    save: t.mock.fn(async () => {}), toSafeObject() { return { ...this }; },
  };
  t.mock.method(User, 'findById', async () => user);
  t.mock.method(ActivityLog, 'create', async () => ({}));
  t.mock.method(logService, 'fireAndForgetFromRequest', () => {});
  const req = { params: { id: targetId }, body, user: { id: self ? targetId : actorId, role: 'admin' }, get: () => '' };
  const res = { statusCode: 0, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  return { user, req, res };
}

test('profile edit clears phone without replacing omitted access grants', async (t) => {
  const { user, req, res } = setup(t, { phone: '', firstName: 'Updated' });
  await controller.updateUser(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.phone, '');
  assert.equal(user.firstName, 'Updated');
  assert.deepEqual(user.permissions, ['custom:read']);
  assert.deepEqual(user.metadata.projectAssignments, [{ projectId: 'project1', role: 'owner' }]);
  assert.equal(user.save.mock.callCount(), 1);
});

test('edit cannot disable the acting administrator', async (t) => {
  const { user, req, res } = setup(t, { accountStatus: 'blocked' }, true);
  await controller.updateUser(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(user.save.mock.callCount(), 0);
});

test('status change persists matching accountStatus and isActive', async (t) => {
  const { user, req, res } = setup(t, { accountStatus: 'blocked' });
  await controller.setUserStatus(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.accountStatus, 'blocked');
  assert.equal(user.isActive, false);
});

test('delete preserves history and deactivates the account', async (t) => {
  const { user, req, res } = setup(t, {});
  await controller.deleteUser(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.accountStatus, 'inactive');
  assert.equal(user.isActive, false);
  assert.deepEqual(user.metadata.projectAssignments, [{ projectId: 'project1', role: 'owner' }]);
});
