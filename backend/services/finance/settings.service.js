'use strict';
// Finance configuration and document numbering.
//
// Two jobs that belong together: the Finance Head configures document prefixes here, and
// the sequence counters that use those prefixes live beside them. Numbering is sequential
// per prefix+period (§A) rather than random, because an auditor reading a gap in an invoice
// series needs that gap to mean something.
const mongoose = require('mongoose');
const Setting = require('../../models/finance/Setting');

const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };

// Only these keys may be written, with a validator each. An unknown key is rejected rather
// than stored, so a typo cannot silently create a setting nothing reads.
const PREFIX_RE = /^[A-Z][A-Z0-9]{1,9}$/;
const prefix = label => value => {
  const v = String(value || '').trim().toUpperCase();
  if (!PREFIX_RE.test(v)) fail(422, `${label} prefix must be 2-10 characters, starting with a letter (A-Z, 0-9)`);
  return v;
};
const percent = label => value => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 100) fail(422, `${label} must be between 1 and 100`);
  return Math.round(n);
};
const days = label => value => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 365) fail(422, `${label} must be a whole number of days between 1 and 365`);
  return n;
};

const SCHEMA = {
  'invoice.prefix': { validate: prefix('Invoice'), default: 'INV' },
  'creditNote.prefix': { validate: prefix('Credit note'), default: 'CRN' },
  'debitNote.prefix': { validate: prefix('Debit note'), default: 'DBN' },
  'dispute.prefix': { validate: prefix('Dispute'), default: 'DSP' },
  'refund.prefix': { validate: prefix('Refund'), default: 'RFD' },
  'nonCompliance.prefix': { validate: prefix('Non-compliance'), default: 'NC' },
  // Control Tower traffic lights and escalation, tunable without a deploy (§4.5, §4.6).
  'tower.overdueAmberCount': { validate: days('Overdue amber count'), default: 1 },
  'tower.overdueRedCount': { validate: days('Overdue red count'), default: 5 },
  'tower.disputeRedAgeDays': { validate: days('Dispute red age'), default: 30 },
  'tower.budgetAmberPct': { validate: percent('Budget amber threshold'), default: 85 },
  'escalation.overdueDays': { validate: days('Overdue escalation threshold'), default: 7 },
};

const KEYS = Object.keys(SCHEMA);

const defaults = () => Object.fromEntries(KEYS.map(k => [k, SCHEMA[k].default]));

// All settings as a flat object, defaults filled in for anything never configured.
async function all(session) {
  const query = Setting.find({ key: { $in: KEYS } }).lean();
  const rows = await (session ? query.session(session) : query);
  const out = defaults();
  for (const row of rows) if (row.value !== null && row.value !== undefined) out[row.key] = row.value;
  return out;
}

async function get(key, session) {
  if (!SCHEMA[key]) fail(422, `Unknown finance setting "${key}"`);
  const query = Setting.findOne({ key }).lean();
  const row = await (session ? query.session(session) : query);
  return row?.value ?? SCHEMA[key].default;
}

// Writes only known keys, and runs each value through its validator first.
async function setMany(entries, actorId, session) {
  const pairs = Object.entries(entries || {});
  if (!pairs.length) fail(422, 'No settings provided');
  const unknown = pairs.map(([k]) => k).filter(k => !SCHEMA[k]);
  if (unknown.length) fail(422, `Unknown finance setting(s): ${unknown.join(', ')}`);
  const clean = pairs.map(([k, v]) => [k, SCHEMA[k].validate(v)]);
  for (const [key, value] of clean) {
    await Setting.findOneAndUpdate(
      { key },
      { value, updatedBy: actorId },
      { upsert: true, new: true, runValidators: true, ...(session ? { session } : {}) }
    );
  }
  return Object.fromEntries(clean);
}

// ── Document numbering ──────────────────────────────────────────────────────
// Sequential per prefix and year-month, allocated with a single atomic $inc so two
// concurrent creates cannot take the same number. The counter doc lives in the settings
// collection under a reserved `seq:` key namespace, which the validated SCHEMA above
// deliberately does not expose to the API.
async function nextNumber(kind, session, when = new Date()) {
  const cfg = SCHEMA[`${kind}.prefix`];
  if (!cfg) fail(422, `No numbering configured for "${kind}"`);
  const pfx = await get(`${kind}.prefix`, session);
  const period = `${when.getUTCFullYear()}${String(when.getUTCMonth() + 1).padStart(2, '0')}`;
  const key = `seq:${kind}:${pfx}:${period}`;
  const row = await Setting.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { upsert: true, new: true, ...(session ? { session } : {}) }
  );
  return `${pfx}-${period}-${String(row.value).padStart(4, '0')}`;
}

module.exports = { all, get, setMany, nextNumber, defaults, KEYS, SCHEMA };
