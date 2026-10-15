process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const adapter = require('../services/yarrowtechProjects.adapter');
const { mapProject, mapProjectDetail, extractList, toPercent, toStatus } = adapter._internal;

test('provider projects stay unconfigured until the contract is verified', async () => {
  const previous = process.env.SRS_PROJECTS_CONTRACT;
  delete process.env.SRS_PROJECTS_CONTRACT;
  try {
    assert.equal(adapter.configured(), false);
    assert.match(adapter.unconfiguredReason(), /unverified|SRS_API_BASE_URL|credentials missing/i);
    // Never silently returns rows while the contract is unverified.
    await assert.rejects(adapter.listProjects({}), { statusCode: 409, code: 'YARROWTECH_PROJECTS_UNVERIFIED' });
    await assert.rejects(adapter.getProject('YT-26-0001'), { statusCode: 409, code: 'YARROWTECH_PROJECTS_UNVERIFIED' });
    await assert.rejects(adapter.updateProject('YT-26-0001', { status: 'ongoing' }), { statusCode: 409 });
  } finally {
    if (previous === undefined) delete process.env.SRS_PROJECTS_CONTRACT;
    else process.env.SRS_PROJECTS_CONTRACT = previous;
  }
});

test('progress normalises both 0-1 and 0-100 provider scales', () => {
  assert.equal(toPercent(0.52), 52);
  assert.equal(toPercent(52), 52);
  assert.equal(toPercent(1), 100);
  assert.equal(toPercent(140), 100);
  assert.equal(toPercent(-5), 0);
  assert.equal(toPercent('bad'), 0);
});

test('status vocabulary folds provider synonyms onto our three states', () => {
  assert.equal(toStatus('Ongoing'), 'ongoing');
  assert.equal(toStatus('IN PROGRESS'), 'ongoing');
  assert.equal(toStatus('in-progress'), 'ongoing');
  assert.equal(toStatus('delivered'), 'completed');
  assert.equal(toStatus('not started'), 'pending');
  assert.equal(toStatus(undefined), 'pending');
});

test('mapping reads alternate field names and rejects unrecognisable rows', () => {
  const mapped = mapProject({ projectId: 'YT-26-0001', name: 'restaurent', client: 'client', status: 'Ongoing', progress: 52, deliveryDate: '2026-09-22' }, 0);
  assert.equal(mapped.id, 'YT-26-0001');
  assert.equal(mapped.name, 'restaurent');
  assert.equal(mapped.status, 'ongoing');
  assert.equal(mapped.progress, 52);
  assert.ok(mapped.delivery.startsWith('2026-09-22'));

  const alternate = mapProject({ code: 'KUL-9853-STD-26-001', title: 'web', customer: 'rj', state: 'Pending', completion: 0, due_date: null }, 1);
  assert.equal(alternate.id, 'KUL-9853-STD-26-001');
  assert.equal(alternate.name, 'web');
  assert.equal(alternate.delivery, null);

  // A row we cannot identify is a mapping error, not a blank row shown as truth.
  assert.throws(() => mapProject({ foo: 'bar' }, 3), { code: 'YARROWTECH_PROJECT_MAPPING' });
  assert.throws(() => mapProject(null, 4), { code: 'YARROWTECH_PROJECT_SHAPE' });
});

test('detail mapping fills the project page and derives payment figures', () => {
  const detail = mapProjectDetail({ data: {
    projectId: 'YT-26-0001', name: 'restaurent', status: 'Ongoing', progress: 52,
    deliveryDate: '2026-09-22', createdAt: '2026-09-22', managerEmail: 'manager1@yarrowtech.com',
    techLead: 'techlead1@yarrowtech.com', contractValue: 50000, paidAmount: 50000, currency: 'INR',
    notes: 'saxasaxa',
    clientDetails: { name: 'client', email: 'client@gmail.com', phone: '7894561236', company: 'abc', status: 'Active', id: '6ab277124079eb2e7e95b04d' },
    requirements: { approved: true, approvedBy: 'saxadxa', approvedAt: '2026-10-13' },
    payments: [{ id: 1 }, { id: 2 }],
  } });
  assert.equal(detail.id, 'YT-26-0001');
  assert.equal(detail.manager, 'manager1@yarrowtech.com');
  assert.equal(detail.client.company, 'abc');
  assert.equal(detail.payment.due, 0);
  assert.equal(detail.payment.percentPaid, 100);
  assert.equal(detail.payment.count, 2);
  assert.equal(detail.requirements.approved, true);
  assert.equal(detail.requirements.approvedBy, 'saxadxa');
});

test('detail mapping never reports a negative due or divides by a zero contract', () => {
  const overpaid = mapProjectDetail({ id: 'A', name: 'A', contractValue: 1000, paidAmount: 4000 });
  assert.equal(overpaid.payment.due, 0);
  assert.equal(overpaid.payment.percentPaid, 100);
  const noContract = mapProjectDetail({ id: 'B', name: 'B', contractValue: 0, paidAmount: 0 });
  assert.equal(noContract.payment.percentPaid, 0);
  // Absent optional blocks must not throw; the page shows placeholders instead.
  assert.equal(noContract.client.email, '');
  assert.equal(noContract.requirements.approved, false);
  assert.equal(noContract.notes, '');
});

test('list extraction handles bare arrays and common envelopes, and rejects the rest', () => {
  assert.deepEqual(extractList([{ a: 1 }]), { rows: [{ a: 1 }], total: 1 });
  assert.deepEqual(extractList({ data: [{ a: 1 }], total: 9 }), { rows: [{ a: 1 }], total: 9 });
  assert.deepEqual(extractList({ items: [] }), { rows: [], total: 0 });
  assert.throws(() => extractList({ nope: true }), { code: 'YARROWTECH_PROJECT_ENVELOPE' });
});
