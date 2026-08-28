const mongoose = require('mongoose');

const migrationErrorSchema = new mongoose.Schema(
  {
    legacyId: { type: String, default: '' },
    message: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const migrationBatchSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
    executedBy: { type: String, default: 'cli' },
    dryRun: { type: Boolean, required: true },
    sourceCount: { type: Number, default: 0 },
    createdCount: { type: Number, default: 0 },
    updatedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    errors: { type: [migrationErrorSchema], default: [] },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'rolled_back'],
      default: 'running',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.MigrationBatch || mongoose.model('MigrationBatch', migrationBatchSchema);
