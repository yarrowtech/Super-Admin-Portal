const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, isValidRole } = require('../../config/roles');
const logger = require('../../utils/logger');
const env = require('../../config/env');
const { createTimer, getRequestContext } = require('../../logger/context');

const toLogId = (value) => {
  if (!value) return null;
  if (typeof value.toHexString === 'function') return value.toHexString();
  return String(value);
};

const logCredentialSpan = (span, durationMs, extra = {}) => {
  if (!env.LOG_LOGIN_SPANS) return;
  const context = getRequestContext();
  if (!context.requestId) return;
  logger.debug({
    event: `perf.${span}`,
    category: 'PERF',
    span,
    requestId: context.requestId,
    method: context.method,
    route: context.route || context.path,
    durationMs,
    userId: toLogId(extra.userId || context.userId),
    role: extra.role || context.role || null,
  }, `${span} completed`);
};

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: Object.values(ROLES),
      validate: {
        validator: isValidRole,
        message: 'Invalid role specified'
      }
    },
    permissions: [{ type: String, trim: true }],
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'blocked', 'pending_verification'],
      default: 'active'
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerifiedAt: {
      type: Date
    },
    otpHash: {
      type: String,
      select: false
    },
    otpExpiresAt: {
      type: Date,
      select: false
    },
    lastLogin: {
      type: Date
    },
    lastPasswordChangeAt: {
      type: Date
    },
    profileImage: {
      type: String
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otpHash;
  delete obj.otpExpiresAt;
  return obj;
};

userSchema.statics.findByCredentials = async function (email, password) {
  const normalized = email?.trim().toLowerCase();
  const stopLookup = createTimer('auth.user.lookup');
  const user = await this.findOne({ email: normalized }).select('+password');
  logCredentialSpan('auth.user.lookup', stopLookup(), { userId: toLogId(user?._id), role: user?.role || null });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const stopPasswordVerify = createTimer('auth.password.verify');
  const isMatch = await user.comparePassword(password);
  logCredentialSpan('auth.password.verify', stopPasswordVerify(), { userId: toLogId(user._id), role: user.role });

  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  if (['suspended', 'blocked'].includes(user.accountStatus)) {
    throw new Error(`Account is ${user.accountStatus}`);
  }

  return user;
};

userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ firstName: 'text', lastName: 'text', email: 'text', department: 'text' });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
