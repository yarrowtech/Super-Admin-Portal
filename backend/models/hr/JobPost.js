const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema(
  {
    title:           { type: String, required: true, trim: true },
    department:      { type: String, trim: true },
    location:        { type: String, trim: true, default: 'Company HQ' },
    type:            { type: String, enum: ['full-time', 'part-time', 'contract', 'remote', 'internship'], default: 'full-time' },
    experience:      { type: String, trim: true },
    salaryRange:     { type: String, trim: true },
    description:     { type: String },
    requirements:    [{ type: String }],
    responsibilities:[{ type: String }],
    status:          { type: String, enum: ['draft', 'open', 'closed'], default: 'draft', index: true },
    postedDate:      { type: Date },
    closingDate:     { type: Date },
    openings:        { type: Number, default: 1 },
    tags:            [{ type: String }],
    createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.JobPost || mongoose.model('JobPost', jobPostSchema);
