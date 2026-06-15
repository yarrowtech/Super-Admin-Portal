const mongoose = require('mongoose');

const adminSecurityAlertSchema = new mongoose.Schema(
  {
    icon: { type: String, default: 'warning' },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    text: { type: String, required: true, trim: true },
    timeLabel: { type: String, default: 'Just now' }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AdminSecurityAlert ||
  mongoose.model('AdminSecurityAlert', adminSecurityAlertSchema);

