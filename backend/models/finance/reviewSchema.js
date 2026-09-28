const mongoose = require('mongoose');

// Maker-checker state shared by invoices, payroll runs and journal entries: a finance employee
// prepares a draft and submits it; the finance head approves (which applies the real status
// change) or returns it with a reason. `status: 'none'` = never submitted.
const reviewSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['none', 'submitted', 'returned', 'approved'], default: 'none', index: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    submittedByName: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    submitNote: { type: String, trim: true, default: '', maxlength: 1000 },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedByName: { type: String, default: '' },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, trim: true, default: '', maxlength: 1000 },
  },
  { _id: false }
);

module.exports = reviewSchema;
