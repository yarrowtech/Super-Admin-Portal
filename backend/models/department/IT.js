const mongoose = require('mongoose');

const itSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    assetName: { type: String, required: true, trim: true },
    status: { type: String, default: 'active', trim: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.models.IT || mongoose.model('IT', itSchema);
