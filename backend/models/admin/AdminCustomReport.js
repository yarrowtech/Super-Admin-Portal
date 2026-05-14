const mongoose = require('mongoose');

const adminCustomReportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    reportType: { type: String, default: 'User Activity' },
    department: { type: String, default: 'All Departments' },
    status: { type: String, enum: ['Completed', 'Processing', 'Failed'], default: 'Processing' },
    generatedOn: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AdminCustomReport ||
  mongoose.model('AdminCustomReport', adminCustomReportSchema);

