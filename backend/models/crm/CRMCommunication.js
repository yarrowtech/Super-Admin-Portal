const mongoose = require('mongoose');

const crmCommunicationSchema = new mongoose.Schema({
  client:      { type: mongoose.Schema.Types.ObjectId, ref: 'CRMClient', required: true },
  department:  { type: String, enum: ['media', 'marketing'], required: true },
  type:        { type: String, enum: ['email', 'call', 'meeting', 'visit', 'message', 'proposal', 'approval', 'note', 'status_change'], required: true },
  direction:   { type: String, enum: ['inbound', 'outbound', 'internal'], default: 'outbound' },
  subject:     { type: String },
  body:        { type: String },
  outcome:     { type: String },
  isInternal:  { type: Boolean, default: false },
  occurredAt:  { type: Date, default: Date.now },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

crmCommunicationSchema.index({ client: 1, occurredAt: -1 });
crmCommunicationSchema.index({ department: 1 });

module.exports = mongoose.model('CRMCommunication', crmCommunicationSchema);
