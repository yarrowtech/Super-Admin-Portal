const mongoose = require('mongoose');

const employeeRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeCode: { type: String, trim: true, index: true },
    profile: { type: mongoose.Schema.Types.Mixed, default: {} },
    employment: { type: mongoose.Schema.Types.Mixed, default: {} },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeDocument' }],
  },
  { timestamps: true }
);

module.exports = mongoose.models.EmployeeRecord || mongoose.model('EmployeeRecord', employeeRecordSchema);
