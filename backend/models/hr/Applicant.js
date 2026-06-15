const mongoose = require('mongoose');

const applicantSchema = new mongoose.Schema(
  {
    job:          { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', index: true },
    jobTitle:     { type: String, trim: true },
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, trim: true, lowercase: true },
    phone:        { type: String, trim: true },
    position:     { type: String, trim: true },
    department:   { type: String, trim: true },
    resumeUrl:    { type: String },
    coverLetter:  { type: String },
    skills:       [{ type: String }],
    experience:   { type: String },
    status: {
      type: String,
      enum: ['applied', 'screening', 'interview', 'offered', 'hired', 'rejected', 'pending'],
      default: 'applied',
      index: true,
    },
    appliedDate:    { type: Date, default: Date.now },
    appliedByUser:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    source:         { type: String, enum: ['internal', 'external'], default: 'external' },
    notes:          { type: String },
    reviewedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedDate:   { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Applicant || mongoose.model('Applicant', applicantSchema);
