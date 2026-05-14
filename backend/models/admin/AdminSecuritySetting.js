const mongoose = require('mongoose');

const adminSecuritySettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['switch', 'button'], default: 'switch' },
    enabled: { type: Boolean, default: false },
    actionLabel: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AdminSecuritySetting ||
  mongoose.model('AdminSecuritySetting', adminSecuritySettingSchema);

