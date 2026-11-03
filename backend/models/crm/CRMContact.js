const mongoose = require('mongoose');

const crmContactSchema = new mongoose.Schema({
  client:      { type: mongoose.Schema.Types.ObjectId, ref: 'CRMClient' },
  department:  { type: String, enum: ['media', 'marketing', 'both'], required: true },
  firstName:   { type: String, required: true, trim: true },
  lastName:    { type: String, trim: true },
  title:       { type: String, trim: true },
  email:       { type: String, trim: true, lowercase: true },
  phone:       { type: String, trim: true },
  role:        { type: String, trim: true },
  isPrimary:   { type: Boolean, default: false },
  notes:       { type: String },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

crmContactSchema.index({ client: 1 });
crmContactSchema.index({ department: 1 });

module.exports = mongoose.model('CRMContact', crmContactSchema);
