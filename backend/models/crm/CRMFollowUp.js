const mongoose = require('mongoose');

const crmFollowUpSchema = new mongoose.Schema({
  client:         { type: mongoose.Schema.Types.ObjectId, ref: 'CRMClient', required: true },
  department:     { type: String, enum: ['media', 'marketing'], required: true },
  relatedProject: { type: String },
  assignedTo:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate:        { type: Date, required: true },
  priority:       { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  type:           { type: String, enum: ['call', 'email', 'meeting', 'visit', 'proposal', 'approval', 'other'], default: 'call' },
  status:         { type: String, enum: ['pending', 'completed', 'overdue', 'cancelled'], default: 'pending' },
  notes:          { type: String },
  outcome:        { type: String },
  nextAction:     { type: String },
  completedAt:    { type: Date },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

crmFollowUpSchema.index({ client: 1, status: 1 });
crmFollowUpSchema.index({ assignedTo: 1, dueDate: 1 });
crmFollowUpSchema.index({ department: 1, status: 1 });

module.exports = mongoose.model('CRMFollowUp', crmFollowUpSchema);
