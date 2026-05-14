const mongoose = require('mongoose');

const salesSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    leadName: { type: String, trim: true },
    value: { type: Number, default: 0 },
    stage: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Sales || mongoose.model('Sales', salesSchema);
