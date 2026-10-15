const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  brands: [{ code: String, name: String, projectCodes: [String] }],
}, { timestamps: true, bufferCommands: false, strict: 'throw' });
module.exports = mongoose.model('WorkspaceOrganization', schema);
