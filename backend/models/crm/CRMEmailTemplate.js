const mongoose = require('mongoose');

const crmEmailTemplateSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  department:  { type: String, enum: ['media', 'marketing', 'shared'], required: true },
  subject:     { type: String, required: true },
  body:        { type: String, required: true },
  variables:   [{ name: String, placeholder: String }],
  type:        { type: String, enum: ['introduction', 'followup', 'proposal', 'meeting', 'delivery', 'outreach', 'update', 'other'], default: 'other' },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('CRMEmailTemplate', crmEmailTemplateSchema);
