const mongoose = require('mongoose');
const Vendor = require('../../models/finance/Vendor');
const Payment = require('../../models/finance/Payment');

const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
const heads = new Set(['finance_manager', 'admin', 'super_admin']);

module.exports = async function recordVendorEntry(id, body = {}, user = {}) {
  if (!mongoose.Types.ObjectId.isValid(id)) fail(400, 'Invalid vendor id');
  const { type } = body;
  if (!['bill', 'payment'].includes(type)) fail(400, 'Type must be bill or payment');
  if (!heads.has(String(user.role || '').toLowerCase()) && type === 'payment') fail(403, 'Finance Head permission required to record vendor payments');
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) fail(400, 'Amount must be positive with at most two decimal places');
  const date = body.date ? new Date(body.date) : new Date();
  const dueDate = type === 'bill' && body.dueDate ? new Date(body.dueDate) : null;
  if (!Number.isFinite(date.getTime()) || (dueDate && !Number.isFinite(dueDate.getTime()))) fail(400, 'Invalid entry date');
  if (dueDate && dueDate < date) fail(400, 'Due date cannot precede the bill date');
  const method = type === 'payment' ? (body.method || 'bank') : '';
  if (type === 'payment' && !['bank', 'cash', 'online'].includes(method)) fail(400, 'Invalid payment method');
  const reference = String(body.reference || '').trim().slice(0, 120);
  if (!reference) fail(400, 'A bill or payment reference is required');
  const note = String(body.note || '').trim().slice(0, 500);
  const actor = user.id || user._id;
  // The vendor balance, history and outgoing payment must commit together.
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const vendor = await Vendor.findById(id).session(session);
      if (!vendor) fail(404, 'Vendor not found');
      if (vendor.status !== 'active') fail(409, 'Inactive vendors cannot receive new entries');
      if (vendor.ledger.some(entry => entry.type === type && entry.reference === reference)) fail(409, 'This vendor reference already exists');
      const owed = Number(vendor.balance) || 0;
      if (type === 'payment' && amount > owed) fail(409, 'Payment exceeds the outstanding vendor balance');
      let payment = null;
      if (type === 'payment') {
        [payment] = await Payment.create([{
          vendor: vendor._id, customerName: vendor.name, direction: 'out', status: 'completed',
          amount, method, paymentDate: date, reference, notes: note, createdBy: actor,
        }], { session });
      }
      vendor.ledger.push({ type, amount, reference, date, dueDate, method, note,
        paymentId: payment?._id || null, createdBy: actor,
        createdByName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '',
      });
      vendor.balance = Math.round((owed + (type === 'bill' ? amount : -amount)) * 100) / 100;
      await vendor.save({ session });
      result = vendor;
    });
    return result;
  } catch (err) {
    if (err.code === 11000) fail(409, 'That payment reference already exists');
    if (err.code === 20) fail(503, 'Vendor entries require a MongoDB replica set. No entry was saved.');
    throw err;
  } finally {
    await session.endSession();
  }
};
