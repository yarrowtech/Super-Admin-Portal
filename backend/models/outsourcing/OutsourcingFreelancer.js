const mongoose = require('mongoose');

const freelancerSchema = new mongoose.Schema(
  {
    freelancerId: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true, default: '' },
    skills: { type: [String], default: [] },
    domain: { type: String, trim: true, default: '' },
    assignedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OutsourcingJob' }],
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'OutsourcingContract', default: null },
    accessLevel: {
      type: String,
      enum: ['restricted', 'project_only'],
      default: 'restricted'
    },
    status: {
      type: String,
      enum: ['invited', 'active', 'completed', 'blocked'],
      default: 'invited'
    },
    lawValidated: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.OutsourcingFreelancer || mongoose.model('OutsourcingFreelancer', freelancerSchema);
