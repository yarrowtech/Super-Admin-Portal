process.env.NODE_ENV = 'test';
// Multi-line journal entries against a real (in-memory) replica set: the accounting
// invariants the new multi-line editor relies on — at least two lines, one side per
// line, debits equal credits in integer paise, active accounts only, head-only posting
// and posted-entry immutability.
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const ops = require('../controllers/finance/financeOperations.controller');
const Account = require('../models/finance/Account');
const Journal = require('../models/finance/JournalEntry');

let db;
const oid = () => new mongoose.Types.ObjectId();
const head = { id: oid(), role: 'finance_manager', firstName: 'Fin', lastName: 'Head' };
const emp = { id: oid(), role: 'finance_employee', firstName: 'Fin', lastName: 'Emp' };
const req = (user, body = {}, params = {}, query = {}) => ({ user, body, params, query });
const call = async (fn, user, body = {}, params = {}) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(v) { this.body = v; return this; }, setHeader() {}, send(v) { this.body = v; return this; } };
  await fn(req(user, body, params), res);
  return res;
};

let cash; let revenue; let expense; let inactive;

test.before(async () => {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(db.getUri());
  await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).init().catch(() => {})));
  [cash, revenue, expense, inactive] = await Account.create([
    { code: '1000', name: 'Cash', type: 'asset', normalBalance: 'debit', isActive: true },
    { code: '4000', name: 'Revenue', type: 'revenue', normalBalance: 'credit', isActive: true },
    { code: '5000', name: 'Expense', type: 'expense', normalBalance: 'debit', isActive: true },
    { code: '9999', name: 'Retired', type: 'asset', normalBalance: 'debit', isActive: false },
  ]);
});
test.after(async () => { await mongoose.disconnect(); await db.stop(); });

const lines = (...rows) => rows.map(([account, debit, credit]) => ({ account, debit, credit }));

test('a balanced multi-line entry saves as a draft with computed totals', async () => {
  const res = await call(ops.createJournalEntry, head, {
    memo: 'Split revenue across two cash accounts',
    lines: lines([cash._id, 60, 0], [expense._id, 40, 0], [revenue._id, 0, 100]),
  });
  assert.equal(res.statusCode, 201);
  const doc = await Journal.findById(res.body?.data?._id || res.body?._id).lean();
  assert.equal(doc.lines.length, 3, 'all three lines persist — not collapsed to two');
  assert.equal(doc.totalDebit, 100);
  assert.equal(doc.totalCredit, 100);
  assert.equal(doc.status, 'draft', 'saving must not post');
  assert.ok(!doc.postedAt);
});

test('unbalanced entries are rejected, including off-by-one-paisa', async () => {
  const off = await call(ops.createJournalEntry, head, {
    memo: 'off by a paisa',
    lines: lines([cash._id, 100.01, 0], [revenue._id, 0, 100]),
  });
  assert.equal(off.statusCode, 422);
  assert.match(String(off.body?.message || off.body?.error || ''), /balanc/i);
  assert.equal(await Journal.countDocuments({ memo: 'off by a paisa' }), 0, 'nothing is written on rejection');
});

test('decimal amounts that trip binary floating point still balance', async () => {
  // 0.10 + 0.20 === 0.30 only in integer paise; a float sum would be 0.30000000000000004.
  const res = await call(ops.createJournalEntry, head, {
    memo: 'float trap',
    lines: lines([cash._id, 0.1, 0], [expense._id, 0.2, 0], [revenue._id, 0, 0.3]),
  });
  assert.equal(res.statusCode, 201, 'must not be wrongly rejected as unbalanced');

  // The classic thirds split: 33.33 + 33.33 + 33.34 === 100.00.
  const thirds = await call(ops.createJournalEntry, head, {
    memo: 'thirds',
    lines: lines([cash._id, 33.33, 0], [expense._id, 33.33, 0], [revenue._id, 33.34, 0], [revenue._id, 0, 100]),
  });
  assert.equal(thirds.statusCode, 201);
});

test('a single line, or a line with both sides, is rejected', async () => {
  const single = await call(ops.createJournalEntry, head, { memo: 'one', lines: lines([cash._id, 50, 0]) });
  assert.equal(single.statusCode, 422);
  assert.match(String(single.body?.message || single.body?.error || ''), /two lines/i);

  const both = await call(ops.createJournalEntry, head, {
    memo: 'both sides',
    lines: lines([cash._id, 50, 50], [revenue._id, 0, 50]),
  });
  assert.equal(both.statusCode, 422, 'a line cannot carry a debit and a credit');
});

test('entries referencing an inactive account are rejected', async () => {
  const res = await call(ops.createJournalEntry, head, {
    memo: 'inactive',
    lines: lines([inactive._id, 10, 0], [revenue._id, 0, 10]),
  });
  assert.equal(res.statusCode, 422);
  assert.match(String(res.body?.message || res.body?.error || ''), /missing or inactive/i);
});

test('only the finance head can post, and posted entries become immutable', async () => {
  const draft = await call(ops.createJournalEntry, head, {
    memo: 'to post',
    lines: lines([cash._id, 25, 0], [revenue._id, 0, 25]),
  });
  const id = String(draft.body?.data?._id || draft.body?._id);

  assert.equal((await call(ops.postJournalEntry, emp, {}, { id })).statusCode, 403, 'employees cannot post');

  const posted = await call(ops.postJournalEntry, head, {}, { id });
  assert.equal(posted.statusCode, 200);
  const doc = await Journal.findById(id).lean();
  assert.equal(doc.status, 'posted');
  assert.ok(doc.postedAt, 'posting records when it happened');

  // Posted entries are corrected by reversal, never edited in place.
  const edit = await call(ops.updateJournalEntry, head, { memo: 'tampered', lines: lines([cash._id, 1, 0], [revenue._id, 0, 1]) }, { id });
  assert.equal(edit.statusCode, 409);
  assert.equal((await Journal.findById(id).lean()).memo, 'to post', 'the posted entry is unchanged');

  assert.equal((await call(ops.postJournalEntry, head, {}, { id })).statusCode, 409, 'double-posting is refused');
});
