const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, trim: true, unique: true, uppercase: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    // Protects synthetic/reserved rows (e.g. UNASSIGNED) from deletion/rename via the HR department CRUD.
    isSystem: { type: Boolean, default: false },
    // Stable display ordering, replacing the implicit order of the old hardcoded department arrays.
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Department || mongoose.model('Department', departmentSchema);
