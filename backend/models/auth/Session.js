const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jti: { type: String, trim: true },
    refreshTokenHash: { type: String, required: true },
    portal: { type: String, trim: true, default: 'auth', index: true },
    loginSource: { type: String, trim: true, default: 'password' },
    userAgent: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ user: 1, revokedAt: 1 });
sessionSchema.index({ jti: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Session || mongoose.model('Session', sessionSchema);
