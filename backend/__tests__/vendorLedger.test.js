process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Vendor = require('../models/finance/Vendor');
const Payment = require('../models/finance/Payment');
const record = require('../services/finance/vendorLedger.service');
const ctrl = require('../controllers/finance/financeDashboard.controller');
let database;
const head = { id: new mongoose.Types.ObjectId(), role: 'finance_manager', firstName: 'Finance', lastName: 'Head' };
const employee = { id: new mongoose.Types.ObjectId(), role: 'finance_employee' };
const call = async (fn, body = {}, params = {}, query = {}) => {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await fn({ body, params, query, user: head }, res);
  return res;
};
test.before(async () => {
  database = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(database.getUri());
  await Promise.all([Vendor.init(), Payment.init()]);
});
test.after(async () => { await mongoose.disconnect(); if (database) await database.stop(); });
test.beforeEach(async () => { await Vendor.deleteMany({}); await Payment.deleteMany({}); });
const vendor = () => Vendor.create({ name: 'Supplier', balance: 0 });

test('employee records bill; head records outgoing payment with matching account history', async () => {
  const v = await vendor();
  await record(v.id, { type: 'bill', amount: 100, reference: 'B-1' }, employee);
  const result = await record(v.id, { type: 'payment', amount: 40, reference: 'P-1' }, head);
  assert.equal(result.balance, 60);
  assert.equal(result.ledger.length, 2);
  const payment = await Payment.findById(result.ledger[1].paymentId);
  assert.equal(payment.direction, 'out');
  assert.equal(payment.status, 'completed');
  assert.equal(payment.amount, 40);
  assert.equal(String(payment.vendor), v.id);
});

test('employee cannot record payments; excess and invalid amounts leave no writes', async () => {
  const v = await vendor();
  await record(v.id, { type: 'bill', amount: 100, reference: 'B-1' }, employee);
  await assert.rejects(record(v.id, { type: 'payment', amount: 10, reference: 'P-1' }, employee), { statusCode: 403 });
  await assert.rejects(record(v.id, { type: 'payment', amount: 101, reference: 'P-1' }, head), { statusCode: 409 });
  for (const amount of [-1, 0, 'bad', 1.001]) await assert.rejects(record(v.id, { type: 'bill', amount, reference: 'bad' }, head), { statusCode: 400 });
  await assert.rejects(record(v.id, { type: 'payment', amount: 10, reference: 'bad', date: 'invalid' }, head), { statusCode: 400 });
  assert.equal(await Payment.countDocuments(), 0);
  assert.equal((await Vendor.findById(v.id)).balance, 100);
});

test('duplicate reference rolls back the vendor balance and ledger', async () => {
  const v = await Vendor.create({ name: 'Supplier', balance: 100 });
  await Payment.create({ amount: 1, reference: 'duplicate' });
  await assert.rejects(record(v.id, { type: 'payment', amount: 40, reference: 'duplicate' }, head), { statusCode: 409 });
  const stored = await Vendor.findById(v.id);
  assert.equal(stored.balance, 100);
  assert.equal(stored.ledger.length, 0);
  assert.equal(await Payment.countDocuments(), 1);
});

test('simultaneous payments cannot overspend the same vendor balance', async () => {
  const v = await Vendor.create({ name: 'Supplier', balance: 100 });
  const results = await Promise.allSettled(['P-1', 'P-2'].map(reference => record(v.id, { type: 'payment', amount: 80, reference }, head)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.statusCode, 409);
  const stored = await Vendor.findById(v.id);
  assert.equal(stored.balance, 20);
  assert.equal(stored.ledger.length, 1);
  assert.equal(await Payment.countDocuments(), 1);
});

test('receipts include legacy records and exclude outgoing payments', async () => {
  await Payment.collection.insertOne({ amount: 10, reference: 'legacy' });
  await Payment.create({ amount: 20, reference: 'receipt', direction: 'in' });
  await Payment.create({ amount: 30, reference: 'vendor', direction: 'out' });
  const receipts = await call(ctrl.getPayments, {}, {}, { direction: 'in' });
  assert.equal(receipts.statusCode, 200);
  assert.deepEqual(receipts.body.data.items.map(p => p.reference).sort(), ['legacy', 'receipt']);
});

test('opening payable persists and direct ledger/payment rewrites are rejected', async () => {
  const created = await call(ctrl.createVendor, { name: 'Opening supplier', balance: 75.5 });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.data.balance, 75.5);
  const v = created.body.data;
  const changed = await call(ctrl.updateVendor, { balance: 999 }, { id: v.id });
  assert.equal(changed.statusCode, 400);
  const payment = await Payment.create({ amount: 10, reference: 'P-1', vendor: v._id, direction: 'out' });
  assert.equal((await call(ctrl.updatePayment, { amount: 20 }, { id: payment.id })).statusCode, 422);
  assert.equal((await call(ctrl.createPayment, { amount: 10, vendor: v.id, direction: 'out' })).statusCode, 422);
  assert.equal((await Vendor.findById(v.id)).balance, 75.5);
});


test('duplicate bills and inactive vendors cannot change the account', async () => {
  const v = await vendor();
  await record(v.id, { type: 'bill', amount: 100, reference: 'B-1' }, employee);
  await assert.rejects(record(v.id, { type: 'bill', amount: 100, reference: 'B-1' }, employee), { statusCode: 409 });
  await Vendor.findByIdAndUpdate(v.id, { status: 'inactive' });
  await assert.rejects(record(v.id, { type: 'payment', amount: 10, reference: 'P-1' }, head), { statusCode: 409 });
  assert.equal((await Vendor.findById(v.id)).balance, 100);
  assert.equal(await Payment.countDocuments(), 0);
});

test('invalid date, method and missing references are rejected before writes', async () => {
  const v = await vendor();
  for (const body of [
    { type: 'bill', amount: 10, reference: 'B', date: '2026-09-29', dueDate: '2026-09-28' },
    { type: 'payment', amount: 10, reference: 'P', method: 'invalid' },
    { type: 'bill', amount: 10, reference: '   ' },
  ]) await assert.rejects(record(v.id, body, head), { statusCode: 400 });
  assert.equal((await Vendor.findById(v.id)).ledger.length, 0);
});
