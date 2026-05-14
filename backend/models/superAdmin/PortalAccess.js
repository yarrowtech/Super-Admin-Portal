const mongoose = require('mongoose');

const portalAccessSchema = new mongoose.Schema(
  {
    role: { type: String, required: true, trim: true },
    portal: { type: String, required: true, trim: true },
    canAccess: { type: Boolean, default: true },
  },
  { timestamps: true }
);

portalAccessSchema.index({ role: 1, portal: 1 }, { unique: true });

module.exports = mongoose.models.PortalAccess || mongoose.model('PortalAccess', portalAccessSchema);
