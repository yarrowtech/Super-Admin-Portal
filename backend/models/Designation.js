// backend/models/Designation.js
const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Designation name is required'],
      trim: true
    },
    level: {
      type: Number,
      default: 1,
      min: 1
    },
    department: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

designationSchema.index({ name: 1 });
designationSchema.index({ department: 1 });

const Designation = mongoose.model('Designation', designationSchema);

module.exports = Designation;
