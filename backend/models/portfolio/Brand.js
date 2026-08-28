const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    projectCodes: [{ type: String, trim: true, uppercase: true }],
    color: { type: String, trim: true, default: '' },
    icon: { type: String, trim: true, default: 'workspace_premium' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

brandSchema.index({ isActive: 1 });

module.exports = mongoose.models.Brand || mongoose.model('Brand', brandSchema);
