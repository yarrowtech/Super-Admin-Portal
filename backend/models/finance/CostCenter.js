const mongoose = require('mongoose');

const costCenterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, unique: true },
    // @deprecated legacy free-text department — kept for backward compatibility during migration.
    department: { type: String, trim: true, default: 'General' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true, default: null },
    budget: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.FinanceCostCenter || mongoose.model('FinanceCostCenter', costCenterSchema);
