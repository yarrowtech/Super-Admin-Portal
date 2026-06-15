const mongoose = require('mongoose');

const departmentStatSchema = new mongoose.Schema(
  {
    department: { type: String, required: true, trim: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.models.DepartmentStat || mongoose.model('DepartmentStat', departmentStatSchema);
