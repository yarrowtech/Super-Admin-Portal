const mongoose = require('mongoose');

const replySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String },
    message: { type: String, required: true, trim: true },
    isAdminReply: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const portalSupportTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    portal: {
      type: String,
      enum: ['hr', 'manager', 'employee', 'it', 'ceo', 'law', 'finance', 'media', 'sales', 'research', 'outsourcing', 'other'],
      required: true,
    },
    subject: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['general', 'technical', 'access', 'payroll', 'hr', 'system', 'account', 'other'],
      default: 'general',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    replies: [replySchema],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

portalSupportTicketSchema.index({ user: 1, createdAt: -1 });
portalSupportTicketSchema.index({ status: 1, priority: 1, portal: 1, createdAt: -1 });

module.exports = mongoose.model('PortalSupportTicket', portalSupportTicketSchema);
