const mongoose = require('mongoose');

const exportJobSchema = new mongoose.Schema(
  {
    portal: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    format: {
      type: String,
      enum: ['csv'],
      default: 'csv',
      index: true,
    },
    scope: {
      type: String,
      enum: ['full', 'filtered', 'selected'],
      default: 'filtered',
    },
    status: {
      type: String,
      enum: ['completed', 'failed'],
      default: 'completed',
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    selectedIds: [{
      type: mongoose.Schema.Types.ObjectId,
    }],
    rowCount: {
      type: Number,
      default: 0,
    },
    fileName: {
      type: String,
      trim: true,
      default: '',
    },
    errorMessage: {
      type: String,
      trim: true,
      default: '',
    },
    downloadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

exportJobSchema.index({ requestedBy: 1, createdAt: -1 });
exportJobSchema.index({ portal: 1, module: 1, createdAt: -1 });

module.exports =
  mongoose.models.ExportJob ||
  mongoose.model('ExportJob', exportJobSchema);
