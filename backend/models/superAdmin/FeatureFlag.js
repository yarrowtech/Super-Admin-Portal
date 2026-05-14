const mongoose = require('mongoose');

const featureFlagSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    enabled: { type: Boolean, default: false },
    rollout: { type: Number, min: 0, max: 100, default: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.FeatureFlag || mongoose.model('FeatureFlag', featureFlagSchema);
