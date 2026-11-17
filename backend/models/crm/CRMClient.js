const mongoose = require('mongoose');
const CRMCounter = require('./CRMCounter');

const statusHistorySchema = new mongoose.Schema({
  fromStatus: { type: String },
  toStatus:   { type: String, required: true },
  changedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason:     { type: String },
  changedAt:  { type: Date, default: Date.now },
}, { _id: false });

const crmClientSchema = new mongoose.Schema({
  clientId:          { type: String, unique: true },
  name:              { type: String, required: true, trim: true },
  contactPerson:     { type: String, trim: true },
  email:             { type: String, trim: true, lowercase: true },
  phone:             { type: String, trim: true },
  website:           { type: String, trim: true },
  address:           { type: String, trim: true },
  // 'media' | 'marketing' | 'both'
  department:        { type: String, enum: ['media', 'marketing', 'both'], required: true },
  // Hard link to a Project, so the CRM can be sliced project-wise. `relatedProject`
  // below is the older free-text field and is kept for records that predate this.
  project:           { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  relatedProject:    { type: String, trim: true },
  source:            { type: String, trim: true },
  owner:             { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  priority:          { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status:            { type: String, default: 'New Enquiry' },
  statusHistory:     [statusHistorySchema],
  notes:             { type: String },
  documents:         [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
  lastContactedAt:   { type: Date },
  nextFollowUpAt:    { type: Date },
  campaignSource:    { type: String },
  campaignId:        { type: String },
  marketingChannel:  { type: String },
  isActive:          { type: Boolean, default: true },
  // Import provenance. Set only on spreadsheet-imported records, so a batch can be
  // reverted and a reviewer can tell an imported row from a hand-entered one.
  importBatch:       { type: String, index: true },
  importedAt:        { type: Date },
  createdBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

crmClientSchema.index({ department: 1, status: 1 });
crmClientSchema.index({ project: 1, isActive: 1 });
crmClientSchema.index({ email: 1 });
crmClientSchema.index({ clientId: 1 });

const CLIENT_ID_PREFIX = { media: 'MED', marketing: 'MKT' };
const clientIdPrefix = (dept) => CLIENT_ID_PREFIX[dept] || 'CMB';

// Prefixes whose counter has already been reconciled against existing rows in
// this process. The reconciliation only has to happen once per prefix per boot.
const seededPrefixes = new Set();

/**
 * Bring a prefix's counter up to the highest ID already on disk.
 *
 * Clients created before the counter existed are not reflected in it, so a
 * fresh counter would start at 1 and collide with every one of them. The scan
 * runs once per prefix per process and only ever pushes the counter forwards.
 */
async function seedCounterFromExisting(prefix) {
  if (seededPrefixes.has(prefix)) return;

  const last = await mongoose.model('CRMClient')
    .findOne({ clientId: new RegExp(`^${prefix}-\\d+$`) })
    .sort({ clientId: -1 })
    .select('clientId')
    .lean();

  const lastSeq = last ? parseInt(String(last.clientId).slice(prefix.length + 1), 10) : 0;
  if (Number.isFinite(lastSeq) && lastSeq > 0) {
    await CRMCounter.ensureAtLeast(`client:${prefix}`, lastSeq);
  }
  seededPrefixes.add(prefix);
}

/**
 * Next free ID for a prefix.
 *
 * The number comes from an atomic counter rather than a count or a max-scan:
 * counting is wrong as soon as a client is deleted (the sequence walks backwards
 * onto live IDs) and wrong across prefixes, while reading the maximum leaves a
 * gap between the read and the insert that a bulk import reliably loses.
 */
async function nextClientId(prefix) {
  await seedCounterFromExisting(prefix);
  const seq = await CRMCounter.next(`client:${prefix}`);
  return `${prefix}-${String(seq).padStart(5, '0')}`;
}

// Auto-generate clientId before save
crmClientSchema.pre('save', async function (next) {
  if (this.isNew && !this.clientId) {
    try {
      this.clientId = await nextClientId(clientIdPrefix(this.department));
    } catch (err) {
      return next(err);
    }
  }
  next();
});

/**
 * Last line of defence on the unique clientId index.
 *
 * The counter makes a clash very unlikely, but it is not the authority — IDs
 * written before it existed, or by another process, can still occupy a number.
 * Rather than surfacing an E11000 mid-import, claim further IDs until one is
 * accepted; a persistent failure still propagates instead of looping forever.
 */
crmClientSchema.post('save', async function (err, doc, next) {
  const isDupClientId = err
    && err.code === 11000
    && (err.keyPattern?.clientId || String(err.message).includes('clientId'));

  if (!isDupClientId) return next(err);

  // Re-entering doc.save() here would be a parallel save of the same document,
  // so the retry writes through the collection directly: claim a fresh ID under
  // the unique index, and only treat the insert as done once it is accepted.
  const Model = mongoose.model('CRMClient');
  const payload = doc.toObject({ depopulate: true, virtuals: false });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      payload.clientId = await nextClientId(clientIdPrefix(doc.department));
      await Model.collection.insertOne(payload);
      doc.clientId = payload.clientId;
      doc.isNew = false;
      return next();
    } catch (retryErr) {
      const stillDup = retryErr.code === 11000
        && (retryErr.keyPattern?.clientId || String(retryErr.message).includes('clientId'));
      if (!stillDup) return next(retryErr);
    }
  }
  next(err);
});

module.exports = mongoose.model('CRMClient', crmClientSchema);
