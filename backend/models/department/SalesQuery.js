const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, required: true },
    answer: { type: String, trim: true, required: true },
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, required: true },
    name: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    sizeBytes: { type: Number, default: 0 },
    storageProvider: { type: String, trim: true, default: 'local' },
    storageKey: { type: String, trim: true },
  },
  { _id: false }
);

const salesQuerySchema = new mongoose.Schema(
  {
    department: { type: String, trim: true },
    project: {
      code: { type: String, trim: true },
      name: { type: String, trim: true },
    },
    projects: {
      type: [{
        code: { type: String, trim: true },
        name: { type: String, trim: true },
      }],
      default: [],
    },
    buyerCategory: { type: String, trim: true },
    buyerName: { type: String, trim: true },
    businessName: { type: String, trim: true },
    phone: { type: String, trim: true },
    phones: { type: [String], default: [] },
    gstNumber: { type: String, trim: true },
    email: { type: String, trim: true },
    location: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    businessType: { type: String, trim: true },
    productCategory: { type: String, trim: true },
    productCategories: { type: [String], default: [] },
    images: { type: [imageSchema], default: [] },
    qualityRating: { type: Number, min: 0, max: 5, default: 0 },
    moq: { type: String, trim: true },
    priceRange: { type: String, trim: true },
    leadTime: { type: String, trim: true },
    paymentTerms: { type: String, trim: true },
    brandSection: { type: String, trim: true },
    brandSections: { type: [String], default: [] },
    brandNames: { type: [String], default: [] },
    onlineCollaboration: { type: String, trim: true },
    answers: { type: [answerSchema], default: [] },
    notes: { type: String, trim: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

salesQuerySchema.index({ submittedBy: 1 });

module.exports = mongoose.models.SalesQuery || mongoose.model('SalesQuery', salesQuerySchema);
