const mongoose = require('mongoose');

const crmVendorSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  department:  { type: String, enum: ['media', 'marketing', 'both'], required: true },
  // 'vendor' | 'third_party'
  entityType:  { type: String, enum: ['vendor', 'third_party'], default: 'vendor' },
  category:    { type: String, trim: true },
  contactPerson: { type: String, trim: true },
  email:       { type: String, trim: true, lowercase: true },
  phone:       { type: String, trim: true },
  website:     { type: String, trim: true },
  address:     { type: String, trim: true },
  services:    [{ type: String }],
  notes:       { type: String },
  integrationDetails: { type: String },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

crmVendorSchema.index({ department: 1, entityType: 1 });

module.exports = mongoose.model('CRMVendor', crmVendorSchema);
