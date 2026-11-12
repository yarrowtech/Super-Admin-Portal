const mongoose = require('mongoose');

/**
 * One row per committed CRM spreadsheet import.
 *
 * The batch is the unit of undo: every CRMClient an import creates carries the
 * same `importBatch` id, so a mis-mapped file can be rolled back in one step
 * instead of hunting down individual records by hand.
 */
const crmImportBatchSchema = new mongoose.Schema({
  batchId:      { type: String, required: true, unique: true, index: true },
  fileName:     { type: String, trim: true },
  // The project every client in this batch belongs to. Imports are project-wise:
  // a batch without a project would pollute every project's CRM rollup.
  project:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  projectName:  { type: String, trim: true },
  department:   { type: String, enum: ['media', 'marketing', 'both'], required: true },

  // The resolved header -> field mapping actually used, kept so a later reviewer
  // can see how a column was interpreted without re-opening the source file.
  mapping:      { type: mongoose.Schema.Types.Mixed },

  rowsTotal:    { type: Number, default: 0 },
  created:      { type: Number, default: 0 },
  updated:      { type: Number, default: 0 },
  skipped:      { type: Number, default: 0 },
  failed:       { type: Number, default: 0 },

  // Reverted batches keep their row so the import history stays truthful about
  // what happened, rather than silently losing the event.
  revertedAt:   { type: Date },
  revertedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  importedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

crmImportBatchSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('CRMImportBatch', crmImportBatchSchema);
