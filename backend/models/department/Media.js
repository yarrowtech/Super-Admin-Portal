const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    contentType: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Media || mongoose.model('Media', mediaSchema);
