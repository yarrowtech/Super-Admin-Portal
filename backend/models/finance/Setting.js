const mongoose = require('mongoose');

// Organisation-level finance configuration the Finance Head can change without a deploy:
// document number prefixes, escalation thresholds, Control Tower traffic-light levels.
// Stored as one document per key so a single setting can be written without read-modify-
// writing a blob, and so every change carries its own actor and timestamp.
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, unique: true, maxlength: 100 },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.FinanceSetting || mongoose.model('FinanceSetting', settingSchema);
