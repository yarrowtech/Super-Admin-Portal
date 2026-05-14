const mongoose = require('mongoose');

const companyControlSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.CompanyControl || mongoose.model('CompanyControl', companyControlSchema);
