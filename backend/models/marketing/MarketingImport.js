const mongoose = require('mongoose');
const { stageIds } = require('../../config/marketingStages');
const marketingEventSchema = new mongoose.Schema({
  stage: { type: String, enum: stageIds, required: true },
  timestamp: { type: Date, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorName: { type: String, maxlength: 200 }, actorRole: String,
  source: { type: String, default: 'marketing-map' },
  note: { type: String, maxlength: 1000, default: '' },
  scheduledAt: { type: Date, default: null },
}, { _id: true });

// A marketing record imported from a CSV/Excel file.
//
// Imports live in our own database because the external marketing platform is read-only to
// us — we cannot write a school roll into it, and the map must still be able to show the
// rows after a refresh. Each record carries the project it was imported into, so a project
// switch never shows another project's import.
//
// `email` is personal information. It is stored because the import is the system of record
// for these contacts, but the aggregation that feeds the map never selects it — see
// marketingImport.service.js, where the geographic rollup projects only counts.
const marketingImportSchema = new mongoose.Schema(
  {
    // Which project this row belongs to. Required: an import with no project would show up
    // under every project's analytics.
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

    status: { type: String, enum: ['Mapped', 'Pending', 'Needs Review', 'Unmapped', 'Invalid', 'Inactive'], default: undefined, index: true },
    marketingStatus: {
      currentStage: { type: String, enum: stageIds, default: undefined },
      version: { type: Number, default: 0 },
      scheduledAt: { type: Date, default: null },
      history: { type: [marketingEventSchema], default: [] },
    },
    department: { type: String, trim: true, maxlength: 200, default: '' },
    school: { type: String, required: true, trim: true, maxlength: 300 },
    email: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },

    // What the file said, kept verbatim so a failed resolution can be re-run later against
    // a better table without re-uploading.
    locationRaw: { type: String, required: true, trim: true, maxlength: 300 },
    // What we resolved it to.
    city: { type: String, trim: true, default: '', index: true },
    state: { type: String, trim: true, default: '', index: true },
    pincode: { type: String, trim: true, default: '' },

    // Null when the location could not be resolved. Such a row is still stored and still
    // counted — it is simply absent from the map, and reported as unresolved. Never
    // defaulted to 0,0, which would place it in the Gulf of Guinea.
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    // 'city-table' | null — how the coordinates were obtained, for auditability.
    coordSource: { type: String, enum: ['city-table', null], default: null },

    // Groups every row from one upload, so an import can be reviewed or removed as a unit.
    batchId: { type: String, required: true, index: true },
    sourceFile: { type: String, trim: true, default: '', maxlength: 300 },
    importedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// The map and KPI rollups read by project, and only rows that resolved.
marketingImportSchema.index({ projectId: 1, city: 1 });
marketingImportSchema.index({ projectId: 1, 'marketingStatus.currentStage': 1 });
marketingImportSchema.index({ projectId: 1, createdAt: -1 });
// Re-importing the same file must not double-count: one row per school+email+location
// within a project. A genuinely different school at the same location still inserts.
marketingImportSchema.index(
  { projectId: 1, school: 1, email: 1, locationRaw: 1 },
  { unique: true }
);

module.exports = mongoose.models.MarketingImport
  || mongoose.model('MarketingImport', marketingImportSchema);
