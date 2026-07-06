const mongoose = require('mongoose');

const kpiSnapshotSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    period: { type: String, required: true, trim: true }, // e.g. '2026-07' for a month, or an ISO week/date key

    // KPI Logic (Section 10): Website Traffic -> Registrations -> Leads -> Bookings -> Revenue -> Retention
    websiteTraffic: { type: Number, default: 0, min: 0 },
    registrations: { type: Number, default: 0, min: 0 },
    leads: { type: Number, default: 0, min: 0 },
    bookings: { type: Number, default: 0, min: 0 },
    revenue: { type: Number, default: 0, min: 0 },
    retention: { type: Number, default: 0, min: 0 },

    // Marketing Funnel Logic (Section 11): Awareness -> Interest -> Website Visit -> Registration -> Lead -> Customer -> Retention -> Referral
    awareness: { type: Number, default: 0, min: 0 },
    interest: { type: Number, default: 0, min: 0 },
    websiteVisit: { type: Number, default: 0, min: 0 },
    registration: { type: Number, default: 0, min: 0 },
    lead: { type: Number, default: 0, min: 0 },
    customer: { type: Number, default: 0, min: 0 },
    referral: { type: Number, default: 0, min: 0 },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

kpiSnapshotSchema.index({ projectId: 1, period: 1 }, { unique: true });

module.exports = mongoose.models.KpiSnapshot || mongoose.model('KpiSnapshot', kpiSnapshotSchema);
