const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    type: { type: String, default: 'custom', trim: true },
    description: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

calendarEventSchema.index({ projectId: 1, date: 1 });

module.exports = mongoose.models.CalendarEvent || mongoose.model('CalendarEvent', calendarEventSchema);
