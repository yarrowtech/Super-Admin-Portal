const mongoose = require('mongoose');

const appraisalCycleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['draft', 'active', 'completed', 'archived'], default: 'draft', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.AppraisalCycle || mongoose.model('AppraisalCycle', appraisalCycleSchema);
