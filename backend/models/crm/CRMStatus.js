const mongoose = require('mongoose');

const crmStatusSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  department:  { type: String, enum: ['media', 'marketing', 'shared'], required: true },
  color:       { type: String, default: '#6b7280' },
  order:       { type: Number, default: 0 },
  isDefault:   { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },
  description: { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

crmStatusSchema.index({ department: 1, order: 1 });

module.exports = mongoose.model('CRMStatus', crmStatusSchema);
