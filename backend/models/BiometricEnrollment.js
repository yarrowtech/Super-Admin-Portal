// backend/models/BiometricEnrollment.js
const mongoose = require('mongoose');

const biometricEnrollmentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required']
    },
    enrollmentId: {
      type: String,
      required: [true, 'Enrollment ID is required'],
      trim: true
    },
    device: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'revoked'],
      default: 'active'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

biometricEnrollmentSchema.index({ employee: 1 });
biometricEnrollmentSchema.index({ enrollmentId: 1 }, { unique: true });

const BiometricEnrollment = mongoose.model('BiometricEnrollment', biometricEnrollmentSchema);

module.exports = BiometricEnrollment;
