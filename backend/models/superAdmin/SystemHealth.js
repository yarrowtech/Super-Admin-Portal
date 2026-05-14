const mongoose = require('mongoose');

const systemHealthSchema = new mongoose.Schema(
  {
    service: { type: String, required: true, trim: true },
    status: { type: String, enum: ['healthy', 'degraded', 'down'], default: 'healthy' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    checkedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.SystemHealth || mongoose.model('SystemHealth', systemHealthSchema);
