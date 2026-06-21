const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, default: '' },
  message: { type: String, required: true },
  isAdminReply: { type: Boolean, default: false },
}, { timestamps: true });

const outsourcingSupportTicketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, trim: true },
  category: { type: String, enum: ['general', 'payment', 'job', 'technical', 'account'], default: 'general' },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  description: { type: String, required: true, trim: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  replies: [replySchema],
  resolvedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

outsourcingSupportTicketSchema.index({ user: 1, createdAt: -1 });
outsourcingSupportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model('OutsourcingSupportTicket', outsourcingSupportTicketSchema);
