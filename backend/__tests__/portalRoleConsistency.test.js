process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const defaults = require('../config/portalAccessPolicy.json');
const PortalAccess = require('../models/superAdmin/PortalAccess');
const { authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { resolvePortalAccess, defaultPortalAccess, getMyPortalAccess } = require('../services/portalAccessPolicy.service');
const { requireProjectTeacherPermission } = require('../middlewares/projectTeacherPermission.middleware');
require('../services/log.service').fireAndForgetFromRequest = () => {};

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const request = role => ({ user: { id: 'test', role }, headers: {}, method: 'GET', originalUrl: '/test' });
const frontend = file => fs.readFileSync(path.join(__dirname, '../../frontend/src', file), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const context = vm.createContext({ baseRoleAccess: defaults });
vm.runInContext(frontend('utils/rbac.js') + '\nthis.canAccess = canAccessPortal;', context);
vm.runInContext(frontend('routes/routeHelpers.js') + '\nthis.home = getDefaultRoute;', context);
vm.runInContext(frontend('hooks/usePermissions.js') + '\nthis.permission = hasUserPermission;', context);

test('canonical role homes are consistent and accessible', () => {
  const homes = { super_admin: '/admin/super-admin', admin: '/admin/dashboard', ceo: '/ceo/dashboard', hr: '/hr/dashboard', it_hr: '/hr/dashboard', it_manager: '/manager/dashboard', it_admin: '/it/dashboard', it_employee: '/employee/dashboard', finance_manager: '/finance/dashboard', finance_employee: '/finance/dashboard', law_head: '/law/dashboard', law_employee: '/law/dashboard', media_head: '/media/head/dashboard', media_sales: '/media/sales/dashboard', media_marketing: '/media/dashboard', freelancer: '/outsourcing/dashboard' };
  for (const [role, home] of Object.entries(homes)) assert.equal(context.home({ role }), home, role);
});

test('frontend and backend share all default portal decisions', () => {
  for (const role of Object.keys(defaults)) {
    for (const portal of defaults.super_admin) assert.equal(context.canAccess({ role }, portal), defaultPortalAccess({ role }, portal), `${role}/${portal}`);
  }
});

test('frontend explicit denial wins and revoked home does not loop', () => {
  const user = { role: 'finance_employee', portalAccess: { finance: false, employee: false } };
  assert.equal(context.canAccess(user, 'finance'), false);
  assert.equal(context.home(user), '/access-denied');
  assert.equal(context.canAccess({ role: 'super_admin', portalAccess: { hr: false } }, 'hr'), false);
  // HR may call selected admin APIs, but cannot land on the admin UI.
  assert.equal(context.home({ role: 'hr', portalAccess: { hr: false, admin: true } }), '/access-denied');
  assert.equal(context.home({ role: 'finance_employee', portalAccess: { finance: false, employee: true } }), '/employee/dashboard');
});

test('super admin inherits admin action permissions without granting them to staff', () => {
  const { hasPermission, getRolePermissions } = require('../config/roles');
  assert.equal(hasPermission('super_admin', 'users:delete'), true);
  assert.equal(getRolePermissions('super_admin').includes('roles:manage'), true);
  assert.equal(hasPermission('finance_employee', 'users:delete'), false);
});

test('portal snapshot endpoint never silently grants access on lookup failure', async () => {
  const original = PortalAccess.find;
  PortalAccess.find = () => { throw new Error('database unavailable'); };
  try {
    const res = response();
    res.set = () => res;
    await getMyPortalAccess(request('super_admin'), res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.success, false);
    assert.equal(res.body.data, undefined);
  } finally { PortalAccess.find = original; }
});

test('super admin passes admin-capable routes but cannot bypass specialist-only gates', () => {
  for (const [roles, allowed] of [[['admin'], true], [['finance_manager'], false], [['super_admin'], true]]) {
    let next = false;
    const res = response();
    authorize(...roles)(request('super_admin'), res, () => { next = true; });
    assert.equal(next, allowed);
    if (!allowed) assert.equal(res.statusCode, 403);
  }
});

test('backend explicit portal denial overrides super admin default', async () => {
  const original = PortalAccess.findOne;
  try {
    for (const [rule, allowed] of [[null, true], [{ canAccess: false }, false], [{ canAccess: true }, true]]) {
      PortalAccess.findOne = () => ({ select: async () => rule });
      let next = false;
      const res = response();
      await authorizePortalAccess('finance')(request('super_admin'), res, () => { next = true; });
      assert.equal(next, allowed);
      if (!allowed) assert.equal(res.statusCode, 403);
    }
  } finally { PortalAccess.findOne = original; }
});

test('resolved UI snapshot applies current stored rules over defaults', async () => {
  const original = PortalAccess.find;
  PortalAccess.find = () => ({ select: () => ({ lean: async () => [{ portal: 'finance', canAccess: false }] }) });
  try {
    const access = await resolvePortalAccess({ role: 'super_admin' });
    assert.equal(access.finance, false);
    assert.equal(access.hr, true);
  } finally { PortalAccess.find = original; }
});

test('outsourcing honors explicit denials without blocking existing staff API eligibility', async () => {
  const router = require('../routes/outsourcing.routes');
  const original = PortalAccess.findOne;
  try {
    for (const [rule, allowed] of [[null, true], [{ canAccess: false }, false]]) {
      PortalAccess.findOne = () => ({ select: async () => rule });
      let next = false;
      const res = response();
      await router.stack[1].handle(request('freelancer'), res, error => {
        assert.equal(error, undefined);
        next = true;
      });
      assert.equal(next, allowed);
      if (!allowed) assert.equal(res.statusCode, 403);
    }
    assert.equal(context.home({ role: 'freelancer', portalAccess: { outsourcing: false } }), '/access-denied');
    assert.equal(context.home({ role: 'hr', portalAccess: { hr: false, admin: false, outsourcing: true } }), '/access-denied');
  } finally { PortalAccess.findOne = original; }
});

test('freelancers need explicit action permissions in both client and API', () => {
  const permission = 'edifyeight:teachers:delete';
  const cases = [
    [{ role: 'freelancer' }, false],
    [{ role: 'freelancer', assignedProjects: [{ projectCode: 'OTHER', permissions: [permission] }] }, false],
    [{ role: 'freelancer', assignedProjects: [null, { projectCode: 'EEC', permissions: ['edifyeight:teachers:read'] }] }, false],
    [{ role: 'freelancer', assignedProjects: [{ projectCode: 'EEC', permissions: [permission] }] }, true],
    [{ role: 'freelancer', permissions: [permission] }, true],
    [{ role: 'hr', permissions: ['edifyeight:*'] }, true],
    [{ role: 'admin' }, true],
  ];
  for (const [user, expected] of cases) {
    let next = false;
    const res = response();
    requireProjectTeacherPermission('EEC', permission)({ user }, res, () => { next = true; });
    assert.equal(next, expected, JSON.stringify(user));
    assert.equal(context.permission(user, permission), expected);
  }
});

test('portal endpoint scopes lookups to the authenticated role and disables caching', async () => {
  const original = PortalAccess.find;
  let query;
  PortalAccess.find = value => {
    query = value;
    return { select: () => ({ lean: async () => [] }) };
  };
  try {
    const req = request('finance_employee');
    req.query = { role: 'super_admin' };
    const res = response();
    const headers = {};
    res.set = (name, value) => { headers[name] = value; return res; };
    await getMyPortalAccess(req, res);
    assert.deepEqual(query, { role: 'finance_employee' });
    assert.equal(headers['Cache-Control'], 'no-store');
    assert.equal(res.body.data.portalAccess.finance, true);
    assert.equal(res.body.data.portalAccess['super-admin'], false);
  } finally { PortalAccess.find = original; }
});
