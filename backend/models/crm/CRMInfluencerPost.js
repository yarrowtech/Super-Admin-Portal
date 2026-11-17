const mongoose = require('mongoose');

/**
 * One piece of content by an influencer — a reel, post or video.
 *
 * Exists because a creator sheet is rarely one row per creator: the same
 * handle recurs once per deliverable, and collapsing those rows to a single
 * influencer record silently discards every URL after the first. Posts hang
 * off the creator instead, so an import keeps all 106 rows of a 78-creator
 * file and the roster can still show one row per creator.
 */
const crmInfluencerPostSchema = new mongoose.Schema({
  influencer: { type: mongoose.Schema.Types.ObjectId, ref: 'CRMInfluencer', required: true, index: true },

  url:        { type: String, trim: true },
  // 'reel' | 'post' | 'story' | 'video' | 'other' — inferred from the URL shape
  // when the sheet does not say, since /reel/ and /p/ are unambiguous.
  kind:       { type: String, enum: ['reel', 'post', 'story', 'video', 'other'], default: 'other' },
  caption:    { type: String },
  postedAt:   { type: Date },

  // Per-post performance, nullable so "not captured" stays distinct from zero.
  views:      { type: Number, min: 0, default: null },
  likes:      { type: Number, min: 0, default: null },
  comments:   { type: Number, min: 0, default: null },
  shares:     { type: Number, min: 0, default: null },

  project:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  notes:      { type: String },
  isActive:   { type: Boolean, default: true },

  importBatch: { type: String, index: true },
  importedAt:  { type: Date },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

crmInfluencerPostSchema.index({ influencer: 1, createdAt: -1 });
// The same URL must not be filed twice against one creator on a re-import,
// while leaving different creators free to share a link.
crmInfluencerPostSchema.index({ influencer: 1, url: 1 }, { unique: true, sparse: true });

/** Instagram and YouTube encode the content type in the path. */
function kindFromUrl(url) {
  const text = String(url || '').toLowerCase();
  if (!text) return 'other';
  if (text.includes('/reel')) return 'reel';
  if (text.includes('/stories/')) return 'story';
  if (text.includes('/p/')) return 'post';
  if (text.includes('youtube.com') || text.includes('youtu.be')) return 'video';
  return 'other';
}

crmInfluencerPostSchema.pre('validate', function (next) {
  if (!this.kind || this.kind === 'other') this.kind = kindFromUrl(this.url);
  next();
});

crmInfluencerPostSchema.statics.kindFromUrl = kindFromUrl;

module.exports = mongoose.model('CRMInfluencerPost', crmInfluencerPostSchema);
