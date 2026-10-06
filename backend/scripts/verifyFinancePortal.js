process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'checklist-probe-secret';
// Walks the Finance portal's HTTP surface as a real logged-in finance head and a finance
// employee, so the checklist's "Working" column can be filled from evidence rather than
// from the presence of a route.
(async () => {
  const { MongoMemoryReplSet } = require('mongodb-memory-server');
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  process.env.MONGO_URI = mongod.getUri();
  const { server } = require('../app');
  const mongoose = require('mongoose');
  const { User } = require('../models/auth');
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (let i = 0; i < 100 && mongoose.connection.readyState !== 1; i += 1) await new Promise((r) => setTimeout(r, 100));

  const PASSWORD = 'Passw0rd!123';
  const tokens = {};
  for (const [key, u] of Object.entries({
    head: { email: 'head@chk.test', role: 'finance_manager', firstName: 'Fiona', lastName: 'Head', department: 'Finance' },
    emp: { email: 'emp@chk.test', role: 'finance_employee', firstName: 'Farhan', lastName: 'Emp', department: 'Finance' },
  })) {
    await User.create({ ...u, password: PASSWORD, isActive: true, accountStatus: 'active' });
    const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: u.email, password: PASSWORD }) });
    const body = await res.json();
    tokens[key] = body?.data?.accessToken || body?.data?.token || body?.accessToken || body?.token;
    if (!tokens[key]) { console.log(`LOGIN FAILED ${key}:`, JSON.stringify(body).slice(0, 200)); process.exit(1); }
  }

  const F = '/api/dept/finance';
  // [checklist row, label, path, role]
  const ROWS = [
    ['8.1', 'Overview', `${F}/dashboard`, 'head'],
    ['8.2', 'Department profiles', `${F}/departments`, 'head'],
    ['8.3', 'Invoices', `${F}/invoices?page=1&limit=5`, 'head'],
    ['8.4', 'Payments', `${F}/payments?direction=in`, 'head'],
    ['8.5', 'Expenses', `${F}/expenses`, 'head'],
    ['8.6', 'Budgets', `${F}/budgets`, 'head'],
    ['8.8', 'Accounting (journals)', `${F}/journals`, 'head'],
    ['8.8b', 'Accounting (accounts)', `${F}/accounts`, 'head'],
    ['8.9', 'Tasks', `${F}/tasks`, 'head'],
    ['8.9b', 'Attendance', `${F}/attendance`, 'head'],
    ['8.9c', 'Members', `${F}/members`, 'head'],
    ['8.12', 'Team', `${F}/team`, 'head'],
    ['8.13', 'Messages (chat threads)', `${F}/chat/threads`, 'head'],
    ['8.14', 'Reports (trial balance)', `${F}/reports/trial-balance`, 'head'],
    ['8.14b', 'Reports (departmental P&L)', `${F}/reports/departmental-pnl`, 'head'],
    ['8.15', 'Compliance', `${F}/compliance`, 'head'],
    ['8.15b', 'Tax rules', `${F}/tax-rules`, 'head'],
    ['8.16', 'Vendors', `${F}/vendors`, 'head'],
    ['8.16b', 'Clients', `${F}/clients`, 'head'],
    ['8.17', 'Activity (audit log)', `${F}/audit-logs`, 'head'],
    ['8.18', 'Approvals', `${F}/approvals`, 'head'],
    ['8.18b', 'Review queue (head)', `${F}/review/queue`, 'head'],
    ['8.18c', 'Review queue (employee)', `${F}/review/queue`, 'emp'],
    ['x.1', 'Search', `${F}/search?q=test`, 'head'],
    ['x.2', 'Settings', `${F}/settings`, 'emp'],
    ['x.3', 'Receivables aging', `${F}/receivables/aging`, 'head'],
    // Leave and Documents are personal records: the finance pages call the shared
    // employee API, not a finance route. Probed as the employee who owns them.
    ['8.10', 'Leave (employee API)', '/api/dept/employee/leave', 'emp'],
    ['8.11', 'Documents (employee API)', '/api/employee/documents', 'emp'],
    ['8.11b', 'Notifications inbox', '/api/notifications?limit=5', 'emp'],
  ];

  const results = [];
  for (const [row, label, path, who] of ROWS) {
    try {
      const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${tokens[who]}` } });
      const ok = res.status === 200;
      results.push({ row, label, status: res.status, ok, who });
      if (!ok) console.log(`  FAIL ${row} ${label} -> ${res.status} ${(await res.text()).slice(0, 120)}`);
    } catch (e) { results.push({ row, label, status: 'THREW', ok: false, who }); console.log(`  THREW ${row} ${label}: ${e.message}`); }
  }

  // Access control: a finance employee must be refused head-only areas. Chart-of-accounts
  // writes are head-only, so an employee attempting one must be refused before any write.
  const guard = [];
  {
    const res = await fetch(`${base}${F}/accounts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.emp}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '9999', name: 'Guard probe', type: 'expense' }),
    });
    guard.push({ label: 'create account as employee', status: res.status, ok: res.status === 403 });
  }
  const anon = await fetch(`${base}${F}/invoices`);
  guard.push({ label: 'unauthenticated invoices', status: anon.status, ok: anon.status === 401 });

  console.log('\nROW   STATUS  AS        FEATURE');
  for (const r of results) console.log(`${r.row.padEnd(6)}${String(r.status).padEnd(8)}${r.who.padEnd(10)}${r.label}`);
  console.log('\nACCESS CONTROL');
  for (const g of guard) console.log(`  ${g.ok ? 'OK  ' : 'FAIL'} ${g.label} -> ${g.status}`);
  const bad = results.filter((r) => !r.ok).length + guard.filter((g) => !g.ok).length;
  console.log(`\n${results.length} endpoints probed, ${bad} problem(s).`);

  await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  await mongod.stop();
  // Non-zero on any failure so this can gate a release.
  setTimeout(() => process.exit(bad ? 1 : 0), 200).unref();
})();
