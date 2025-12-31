// backend/models/PolicyAcknowledgement.js
const mongoose = require('mongoose');

const policyAcknowledgementSchema = new mongoose.Schema(
  {
    policy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PolicyDocument',
      required: [true, 'Policy is required']
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required']
    },
    acknowledgedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

policyAcknowledgementSchema.index({ policy: 1, employee: 1 }, { unique: true });

const PolicyAcknowledgement = mongoose.model('PolicyAcknowledgement', policyAcknowledgementSchema);

module.exports = PolicyAcknowledgement;
