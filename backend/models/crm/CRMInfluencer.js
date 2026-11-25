const mongoose = require('mongoose');
const CRMCounter = require('./CRMCounter');

/**
 * A creator the agency works with: an Instagram/YouTube handle rather than an
 * organisation.
 *
 * Kept apart from CRMClient on purpose. An influencer is measured on reach and
 * engagement and paid per deliverable, none of which a client record has a place
 * for, and forcing both into one collection leaves every client row carrying
 * empty follower/rate columns (and every influencer row an unused billing
 * address). The two are linked instead: `project` scopes an influencer to the
 * campaign they were engaged for, exactly as clients are scoped.
 */
const influencerStatusHistorySchema = new mongoose.Schema({
  fromStatus: { type: String },
  toStatus:   { type: String, required: true },
  changedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason:     { type: String },
  changedAt:  { type: Date, default: Date.now },
}, { _id: false });

const crmInfluencerSchema = new mongoose.Schema({
  influencerId:    { type: String, unique: true },

  // Display name. Many creators trade only under a handle, so `name` falls back
  // to the handle at validation time rather than being required of the operator.
  name:            { type: String, required: true, trim: true },

  // Stored WITHOUT a leading '@' so the same creator typed "@x" and "x" is one
  // record. Normalised in the pre-validate hook below.
  handle:          { type: String, trim: true, index: true },
  platform:        { type: String, enum: ['instagram', 'youtube', 'tiktok', 'x', 'facebook', 'linkedin', 'other'], default: 'instagram' },
  profileUrl:      { type: String, trim: true },

  email:           { type: String, trim: true, lowercase: true },
  phone:           { type: String, trim: true },
  location:        { type: String, trim: true },
  languages:       [{ type: String, trim: true }],

  // Reach and performance. Nullable rather than defaulted to 0: "not captured
  // yet" and "measured as zero" must stay distinguishable, or an unfilled
  // spreadsheet column silently reads as a creator with no audience.
  followers:       { type: Number, min: 0, default: null },
  avgViews:        { type: Number, min: 0, default: null },
  avgLikes:        { type: Number, min: 0, default: null },
  engagementRate:  { type: Number, min: 0, max: 100, default: null },   // percent

  // Commercials, in whole currency units.
  ratePerPost:     { type: Number, min: 0, default: null },
  ratePerStory:    { type: Number, min: 0, default: null },
  ratePerReel:     { type: Number, min: 0, default: null },
  currency:        { type: String, trim: true, default: 'INR' },

  category:        { type: String, trim: true },          // e.g. food, travel, fashion
  tier:            { type: String, enum: ['nano', 'micro', 'mid', 'macro', 'mega'], default: null },

  department:      { type: String, enum: ['media', 'marketing', 'both'], required: true },
  project:         { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  owner:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  status:          { type: String, default: 'Email Sent' },
  statusHistory:   [influencerStatusHistorySchema],
  priority:        { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },

  // Free-text campaign window as it arrives on a sheet ("4 Dec 26 to 21 Mar 27").
  // Parsing it into real dates is deliberately not attempted: the formats in the
  // wild are inconsistent, and a mis-parse is worse than the original string.
  campaignPeriod:  { type: String, trim: true },
  notes:           { type: String },

  lastContactedAt: { type: Date },
  nextFollowUpAt:  { type: Date },
  isActive:        { type: Boolean, default: true },

  // Import provenance, mirroring CRMClient so a batch can be reverted whole and
  // an imported row stays distinguishable from a hand-entered one.
  importBatch:     { type: String, index: true },
  importedAt:      { type: Date },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

crmInfluencerSchema.index({ department: 1, status: 1 });
crmInfluencerSchema.index({ project: 1, isActive: 1 });
crmInfluencerSchema.index({ platform: 1, handle: 1 });
crmInfluencerSchema.index({ email: 1 });

/**
 * Audience size implies the tier, so it is derived rather than asked for — an
 * operator-set tier that disagrees with the follower count is a reporting bug
 * waiting to happen. An explicitly supplied tier is still honoured.
 */
const TIER_FLOORS = [
  ['mega',  1_000_000],
  ['macro',   500_000],
  ['mid',     100_000],
  ['micro',    10_000],
  ['nano',          0],
];
function tierForFollowers(followers) {
  if (!Number.isFinite(followers)) return null;
  return (TIER_FLOORS.find(([, floor]) => followers >= floor) || [])[0] || null;
}

crmInfluencerSchema.pre('validate', function (next) {
  if (this.handle) {
    this.handle = String(this.handle).trim().replace(/^@+/, '');
  }
  // A handle-only creator still needs a display name for every list and export.
  if (!this.name && this.handle) this.name = this.handle;

  if (!this.tier) this.tier = tierForFollowers(this.followers);
  next();
});

crmInfluencerSchema.pre('save', async function (next) {
  if (this.isNew && !this.influencerId) {
    try {
      const seq = await CRMCounter.next('influencer:INF');
      this.influencerId = `INF-${String(seq).padStart(5, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

/**
 * Last line of defence on the unique influencerId index, for the same reason
 * CRMClient carries one: the counter is not the authority, so a number already
 * taken by older data must be skipped rather than failing the row mid-import.
 */
crmInfluencerSchema.post('save', async function (err, doc, next) {
  const isDup = err && err.code === 11000
    && (err.keyPattern?.influencerId || String(err.message).includes('influencerId'));
  if (!isDup) return next(err);

  const Model = mongoose.model('CRMInfluencer');
  const payload = doc.toObject({ depopulate: true, virtuals: false });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const seq = await CRMCounter.next('influencer:INF');
      payload.influencerId = `INF-${String(seq).padStart(5, '0')}`;
      await Model.collection.insertOne(payload);
      doc.influencerId = payload.influencerId;
      doc.isNew = false;
      return next();
    } catch (retryErr) {
      const stillDup = retryErr.code === 11000
        && (retryErr.keyPattern?.influencerId || String(retryErr.message).includes('influencerId'));
      if (!stillDup) return next(retryErr);
    }
  }
  next(err);
});

crmInfluencerSchema.statics.tierForFollowers = tierForFollowers;

module.exports = mongoose.model('CRMInfluencer', crmInfluencerSchema);
