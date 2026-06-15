const mongoose = require('mongoose');

const adminWorkflowSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Active', 'Paused', 'Error', 'Disabled'],
      default: 'Active'
    },
    lastRun: { type: String, default: 'Not run' },
    trigger: { type: String, default: 'Manual trigger' },
    owner: { type: String, default: 'Admin' }
  },
  { timestamps: true }
);

module.exports = mongoose.models.AdminWorkflow || mongoose.model('AdminWorkflow', adminWorkflowSchema);

