const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true },
    jti: { type: String, trim: true },
    type: { type: String, enum: ['refresh', 'reset-password', 'verify-email', 'sso'], default: 'refresh' },
    portal: { type: String, trim: true, default: 'outsourcing' },
    projectCode: { type: String, trim: true, default: '' },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tokenSchema.index({ jti: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Token || mongoose.model('Token', tokenSchema);
