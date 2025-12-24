// backend/models/EmployeeDocument.js
const mongoose = require('mongoose');

const employeeDocumentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required']
    },
    documentType: {
      type: String,
      required: [true, 'Document type is required'],
      trim: true
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true
    },
    issuedDate: {
      type: Date
    },
    expiryDate: {
      type: Date
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

employeeDocumentSchema.index({ employee: 1 });
employeeDocumentSchema.index({ documentType: 1 });

const EmployeeDocument = mongoose.model('EmployeeDocument', employeeDocumentSchema);

module.exports = EmployeeDocument;
