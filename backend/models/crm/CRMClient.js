const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  fromStatus: { type: String },
  toStatus:   { type: String, required: true },
  changedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason:     { type: String },
  changedAt:  { type: Date, default: Date.now },
}, { _id: false });

const crmClientSchema = new mongoose.Schema({
  clientId:          { type: String, unique: true },
  name:              { type: String, required: true, trim: true },
  contactPerson:     { type: String, trim: true },
  email:             { type: String, trim: true, lowercase: true },
  phone:             { type: String, trim: true },
  website:           { type: String, trim: true },
  address:           { type: String, trim: true },
  // 'media' | 'marketing' | 'both'
  department:        { type: String, enum: ['media', 'marketing', 'both'], required: true },
  // Hard link to a Project, so the CRM can be sliced project-wise. `relatedProject`
  // below is the older free-text field and is kept for records that predate this.
  project:           { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  relatedProject:    { type: String, trim: true },
  source:            { type: String, trim: true },
  owner:             { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  priority:          { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status:            { type: String, default: 'New Enquiry' },
  statusHistory:     [statusHistorySchema],
  notes:             { type: String },
  documents:         [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
  lastContactedAt:   { type: Date },
  nextFollowUpAt:    { type: Date },
  campaignSource:    { type: String },
  campaignId:        { type: String },
  marketingChannel:  { type: String },
  isActive:          { type: Boolean, default: true },
  // Import provenance. Set only on spreadsheet-imported records, so a batch can be
  // reverted and a reviewer can tell an imported row from a hand-entered one.
  importBatch:       { type: String, index: true },
  importedAt:        { type: Date },
  createdBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

crmClientSchema.index({ department: 1, status: 1 });
crmClientSchema.index({ project: 1, isActive: 1 });
crmClientSchema.index({ email: 1 });
crmClientSchema.index({ clientId: 1 });

// Auto-generate clientId before save
crmClientSchema.pre('save', async function (next) {
  if (this.isNew && !this.clientId) {
    const prefix = this.department === 'media' ? 'MED' : this.department === 'marketing' ? 'MKT' : 'CMB';
    const count = await mongoose.model('CRMClient').countDocuments();
    this.clientId = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('CRMClient', crmClientSchema);
