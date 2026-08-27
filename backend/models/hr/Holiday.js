const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true, index: true },
    type: { type: String, enum: ['public', 'optional'], default: 'public' },
    department: { type: String, trim: true },
    description: { type: String, trim: true },
    isRecurring: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Holiday || mongoose.model('Holiday', holidaySchema);
