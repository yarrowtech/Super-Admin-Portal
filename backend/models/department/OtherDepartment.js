const mongoose = require('mongoose');

const otherDepartmentSchema = new mongoose.Schema(
  {
    departmentName: { type: String, required: true, trim: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.models.OtherDepartment || mongoose.model('OtherDepartment', otherDepartmentSchema);
