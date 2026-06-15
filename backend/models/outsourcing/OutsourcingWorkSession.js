const mongoose = require('mongoose');

const workSessionSchema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'OutsourcingContract', default: null },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'OutsourcingJob', default: null },
    checkInAt: { type: Date, required: true },
    checkOutAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0, min: 0 },
    totalPausedMinutes: { type: Number, default: 0, min: 0 },
    pausedAt: { type: Date, default: null },
    lastStatusAt: { type: Date, default: null },
    note: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['active', 'paused', 'closed'],
      default: 'active'
    }
  },
  { timestamps: true }
);

workSessionSchema.index({ worker: 1, status: 1, checkInAt: -1 });
workSessionSchema.index({ worker: 1, checkInAt: -1 });

module.exports =
  mongoose.models.OutsourcingWorkSession || mongoose.model('OutsourcingWorkSession', workSessionSchema);
