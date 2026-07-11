const mongoose = require('mongoose');

const salesQuestionSchema = new mongoose.Schema(
  {
    projectCode: { type: String, trim: true, uppercase: true, index: true },
    projectName: { type: String, trim: true },
    formType: { type: String, enum: ['vendor', 'generic'], required: true, index: true },
    buyerCategoryId: { type: String, trim: true, index: true },
    buyerCategoryLabel: { type: String, trim: true },
    question: { type: String, trim: true, required: true },
    options: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

salesQuestionSchema.index({ projectCode: 1, buyerCategoryId: 1, formType: 1, order: 1 });

module.exports = mongoose.models.SalesQuestion || mongoose.model('SalesQuestion', salesQuestionSchema);
