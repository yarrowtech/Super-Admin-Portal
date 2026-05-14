const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true },
    type: { type: String, enum: ['refresh', 'reset-password', 'verify-email'], default: 'refresh' },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Token || mongoose.model('Token', tokenSchema);
