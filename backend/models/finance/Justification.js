const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, required: true },
    sha256: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// Evidence for *why* a cost was incurred, pointing at the operational record that explains
// it. The portal already holds tasks, time logs and contracts; this links to them rather
// than copying them, so the explanation cannot drift from the thing it describes.
const linkSchema = new mongoose.Schema(
  {
    kind: { type: String, required: true, enum: ['task', 'time_log', 'change_request', 'quote', 'contract'] },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    label: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const responseSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    documents: { type: [documentSchema], default: [] },
    links: { type: [linkSchema], default: [] },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedByRole: { type: String, trim: true, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

// The Control Tower's "why was this cost incurred?" thread: Finance asks, the owning
// Project Manager or Department Head answers with evidence, and Finance accepts, rejects
// or escalates. One document per question, so an unanswered question is visible as such.
const justificationSchema = new mongoose.Schema(
  {
    subjectType: {
      type: String,
      required: true,
      enum: ['expense', 'invoice', 'budget', 'dispute', 'non_compliance'],
    },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    question: { type: String, required: true, trim: true, maxlength: 1000 },
    askedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    responses: { type: [responseSchema], default: [] },

    outcome: { type: String, enum: ['pending', 'accepted', 'rejected', 'escalated'], default: 'pending', index: true },
    outcomeNote: { type: String, trim: true, default: '', maxlength: 1000 },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },

    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
  },
  { timestamps: true }
);

justificationSchema.index({ subjectType: 1, subjectId: 1 });
justificationSchema.index({ outcome: 1, createdAt: -1 });

module.exports = mongoose.models.FinanceJustification || mongoose.model('FinanceJustification', justificationSchema);
