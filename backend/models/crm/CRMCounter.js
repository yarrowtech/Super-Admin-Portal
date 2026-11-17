const mongoose = require('mongoose');

/**
 * Atomic sequence allocator for human-readable CRM IDs (MED-00084, MKT-00001).
 *
 * One document per sequence key, holding the last number issued. Handing out an
 * ID is a single findOneAndUpdate with $inc: the increment and the read happen
 * in one server-side operation, so two concurrent imports can never be given the
 * same number. The previous approach — read the current maximum, then insert —
 * had a window between the two steps, which is exactly what a bulk spreadsheet
 * import widens until rows start failing on the unique index.
 */
const crmCounterSchema = new mongoose.Schema({
  _id: { type: String },        // the sequence key, e.g. 'client:MED'
  seq: { type: Number, default: 0 },
}, { versionKey: false });

/**
 * Reserve and return the next number for `key`.
 *
 * `upsert` creates the counter on first use, so a new prefix needs no seeding.
 */
crmCounterSchema.statics.next = async function (key) {
  const row = await this.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
  return row.seq;
};

/**
 * Raise a counter so it sits at or above `floor`.
 *
 * Needed when a sequence is adopted by data that predates the counter: the
 * counter starts at zero and would re-issue IDs that already exist on disk.
 * $max only ever moves the counter forwards, so this is safe to call repeatedly
 * and safe to race.
 */
crmCounterSchema.statics.ensureAtLeast = async function (key, floor) {
  if (!Number.isFinite(floor) || floor <= 0) return;
  await this.updateOne({ _id: key }, { $max: { seq: floor } }, { upsert: true });
};

module.exports = mongoose.model('CRMCounter', crmCounterSchema);
