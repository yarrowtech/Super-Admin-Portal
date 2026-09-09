process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const logService = require('../services/log.service');
logService.fireAndForgetFromRequest = () => {};
for (const [label, router] of [
  ['Finance API', require('../routes/finance.routes')],
  ['Finance module API', require('../modules/finance/finance.routes')],
]) {
  test(label + ' rejects IT managers before portal rules or controllers', () => {
    const guard = router.stack[1].handle;
    let next = false;
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    guard({ user: { id: 'test', role: 'it_manager' }, headers: {}, method: 'GET', originalUrl: '/api/dept/finance/dashboard' }, res, () => { next = true; });
    assert.equal(next, false);
    assert.equal(res.code, 403);
    assert.equal(res.body.code, 'INSUFFICIENT_PERMISSIONS');
  });
  test(label + ' preserves finance staff access', () => {
    for (const role of ['finance_manager', 'finance_employee', 'admin', 'super_admin']) {
      let next = false;
      router.stack[1].handle({ user: { role }, headers: {} }, {}, () => { next = true; });
      assert.equal(next, true, role);
    }
  });
}
test('frontend finance policy rejects IT managers, regardless of department metadata', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/utils/rbac.js'), 'utf8').replace(/export /g, '');
  const context = {};
  vm.createContext(context);
  vm.runInContext(source + '\nthis.check = canAccessPortal;', context);
  assert.equal(context.check({ role: 'it_manager', department: 'Finance' }, 'finance'), false);
  assert.equal(context.check({ role: 'it_manager' }, 'manager'), true);
  assert.equal(context.check({ role: 'finance_manager' }, 'finance'), true);
});
