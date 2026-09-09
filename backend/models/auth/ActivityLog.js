const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, trim: true },
    module: { type: String, required: true, trim: true, default: 'users' },
    portal: { type: String, trim: true, index: true },
    role: { type: String, trim: true },
    department: { type: String, trim: true },
    requestId: { type: String, trim: true, index: true },
    sessionId: { type: String, trim: true, index: true },
    status: { type: String, trim: true, default: 'success', index: true },
    page: { type: String, trim: true },
    frontendRoute: { type: String, trim: true },
    targetType: { type: String, trim: true, default: 'User' },
    targetId: { type: String, trim: true },
    entityType: { type: String, trim: true },
    entityId: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: true }
);

activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });
activityLogSchema.index({ sessionId: 1, createdAt: -1 });
activityLogSchema.index({ user: 1, sessionId: 1, createdAt: -1 });

module.exports = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
