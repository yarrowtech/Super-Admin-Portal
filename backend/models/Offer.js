// backend/models/Offer.js
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Applicant',
      required: [true, 'Applicant is required']
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true
    },
    salary: {
      type: Number,
      min: 0
    },
    status: {
      type: String,
      enum: ['draft', 'issued', 'accepted', 'declined', 'withdrawn'],
      default: 'draft'
    },
    issuedAt: {
      type: Date
    },
    acceptedAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

offerSchema.index({ applicant: 1 });
offerSchema.index({ status: 1 });

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
