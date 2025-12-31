// backend/models/Holiday.js
const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true
    },
    date: {
      type: Date,
      required: [true, 'Holiday date is required']
    },
    department: {
      type: String,
      trim: true
    },
    isOptional: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

holidaySchema.index({ date: 1 });
holidaySchema.index({ department: 1 });

const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = Holiday;
