const logger = require('../../utils/logger');
// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../../models/auth/User');
const Session = require('../../models/auth/Session');
const ActivityLog = require('../../models/auth/ActivityLog');
const { getCache, setCache } = require('../../services/cache.service');
const { ROLES, isValidRole } = require('../../config/roles');
const env = require('../../config/env');
const jwtConfig = require('../../config/jwt');
const { v2: cloudinary } = require('cloudinary');

/**
 * Generate JWT token with user info
 */
const generateToken = (user, options = {}) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role
    },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn, jwtid: options.jti || crypto.randomUUID() }
  );
};

/**
 * Generate refresh token (longer expiry)
 */
const generateRefreshToken = (user, options = {}) => {
  return jwt.sign(
    {
      userId: user._id,
      type: 'refresh'
    },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn, jwtid: options.jti || crypto.randomUUID() }
  );
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const parseCookie = (req, name) => {
  const cookies = req.headers.cookie || '';
  return cookies
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
};

const getRequestContext = (req) => ({
  loginSource: typeof req.body?.loginSource === 'string' ? req.body.loginSource.trim() : '',
  portal: typeof req.body?.portal === 'string' ? req.body.portal.trim() : '',
});

const persistSession = async (req, res, user, refreshToken, options = {}) => {
  const decoded = jwt.decode(refreshToken);
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const context = getRequestContext(req);

  const session = await Session.create({
    user: user._id,
    jti: options.jti || decoded?.jti || crypto.randomUUID(),
    refreshTokenHash: hashToken(refreshToken),
    portal: context.portal || user?.metadata?.portal || 'auth',
    loginSource: context.loginSource || user?.metadata?.loginSource || 'password',
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
    expiresAt
  });

  res.cookie?.('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.IS_PRODUCTION,
    sameSite: env.IS_PRODUCTION ? 'none' : 'lax',
    expires: expiresAt,
    path: '/api/auth'
  });
  return session;
};

const writeAuthActivity = async (req, action, user, metadata = {}) => {
  try {
    await ActivityLog.create({
      actor: user?._id,
      user: user?._id,
      action,
      module: 'auth',
      targetType: 'User',
      targetId: user?._id?.toString(),
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  } catch (error) {
    logger.warn({ err: error, action }, 'Failed to write auth activity log');
  }
};

const sanitizeStringArray = (input) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 100);
};

const asTrimmed = (value, max = 500) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const asNonNegativeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const sanitizeProfileInput = (payload = {}) => {
  const basicInfo = payload.basicInfo && typeof payload.basicInfo === 'object' ? payload.basicInfo : {};
  const professionalInfo = payload.professional && typeof payload.professional === 'object' ? payload.professional : {};
  const socialInfo = payload.socialLinks && typeof payload.socialLinks === 'object' ? payload.socialLinks : {};
  const preferencesInfo = payload.preferences && typeof payload.preferences === 'object' ? payload.preferences : {};
  const profile = {
    basic: {},
    professional: {},
    socialLinks: {},
    preferences: {},
  };
  if (typeof payload.bio === 'string' || typeof basicInfo.bio === 'string') profile.basic.bio = asTrimmed(payload.bio || basicInfo.bio, 1000);
  if (typeof payload.headline === 'string' || typeof basicInfo.headline === 'string') profile.basic.headline = asTrimmed(payload.headline || basicInfo.headline, 120);
  if (typeof payload.location === 'string' || typeof basicInfo.location === 'string') profile.basic.location = asTrimmed(payload.location || basicInfo.location, 150);
  if (typeof payload.phone === 'string' || typeof basicInfo.phone === 'string') profile.basic.phone = asTrimmed(payload.phone || basicInfo.phone, 30);
  if (typeof payload.resumeUrl === 'string' || typeof payload?.resume?.url === 'string') profile.resumeUrl = asTrimmed(payload.resumeUrl || payload.resume.url, 1000);
  if (typeof payload.profilePicture === 'string' || typeof basicInfo.avatar === 'string') profile.basic.profilePicture = asTrimmed(payload.profilePicture || basicInfo.avatar, 1000);

  if (Array.isArray(payload.skills)) {
    profile.skills = payload.skills
      .map((item) => {
        if (typeof item === 'string') {
          return { name: asTrimmed(item, 80), level: 'Intermediate', years: 0 };
        }
        const name = asTrimmed(item?.name, 80);
        if (!name) return null;
        const level = ['Beginner', 'Intermediate', 'Expert'].includes(item?.level) ? item.level : 'Intermediate';
        return { name, level, years: asNonNegativeNumber(item?.years, 0) };
      })
      .filter(Boolean)
      .slice(0, 100);
  }
  if (Array.isArray(payload.experience)) {
    profile.experience = payload.experience
      .map((item) => {
        if (typeof item === 'string') {
          return { company: item.trim(), role: '', startDate: '', endDate: '', description: '', achievements: [] };
        }
        const company = asTrimmed(item?.company, 120);
        const role = asTrimmed(item?.role, 120);
        if (!company && !role) return null;
        return {
          company,
          role,
          startDate: asTrimmed(item?.startDate, 30),
          endDate: asTrimmed(item?.endDate, 30),
          description: asTrimmed(item?.description, 1200),
          achievements: sanitizeStringArray(item?.achievements || []),
        };
      })
      .filter(Boolean)
      .slice(0, 100);
  }
  if (Array.isArray(payload.projects)) {
    profile.projects = payload.projects
      .map((item) => {
        if (typeof item === 'string') {
          return { title: asTrimmed(item, 140), description: '', link: '', techStack: [] };
        }
        const title = asTrimmed(item?.title, 140);
        if (!title) return null;
        return {
          title,
          description: asTrimmed(item?.description, 1200),
          link: asTrimmed(item?.link, 500),
          techStack: sanitizeStringArray(item?.techStack || []),
        };
      })
      .filter(Boolean)
      .slice(0, 100);
  }
  if (Array.isArray(payload.education)) {
    profile.education = payload.education
      .map((item) => {
        const degree = asTrimmed(item?.degree, 120);
        const institute = asTrimmed(item?.institute || item?.college || item?.university, 160);
        if (!degree && !institute) return null;
        return {
          degree,
          institute,
          yearOfPassing: asTrimmed(item?.yearOfPassing, 10),
          score: asTrimmed(item?.score || item?.cgpa || item?.percentage, 20),
        };
      })
      .filter(Boolean)
      .slice(0, 100);
  }
  if (Array.isArray(payload.certifications)) {
    profile.certifications = payload.certifications
      .map((item) => {
        const name = asTrimmed(item?.name, 140);
        if (!name) return null;
        return {
          name,
          issuer: asTrimmed(item?.issuer, 140),
          date: asTrimmed(item?.date, 30),
          credentialLink: asTrimmed(item?.credentialLink, 500),
        };
      })
      .filter(Boolean)
      .slice(0, 100);
  }
  if (Array.isArray(payload.achievements)) profile.achievements = sanitizeStringArray(payload.achievements);

  if (typeof payload.currentRole === 'string' || typeof professionalInfo.currentRole === 'string') profile.professional.currentRole = asTrimmed(payload.currentRole || professionalInfo.currentRole, 120);
  if (payload.yearsOfExperience !== undefined || professionalInfo.experienceYears !== undefined) profile.professional.yearsOfExperience = asNonNegativeNumber(payload.yearsOfExperience ?? professionalInfo.experienceYears, 0);
  if (typeof payload.industry === 'string' || typeof professionalInfo.industry === 'string') profile.professional.industry = asTrimmed(payload.industry || professionalInfo.industry, 120);
  if (typeof payload.preferredJobRole === 'string' || typeof professionalInfo.preferredRole === 'string') profile.professional.preferredJobRole = asTrimmed(payload.preferredJobRole || professionalInfo.preferredRole, 120);
  if (typeof payload.employmentStatus === 'string' || typeof professionalInfo.status === 'string') profile.professional.employmentStatus = asTrimmed(payload.employmentStatus || professionalInfo.status, 40);

  if (typeof payload.linkedin === 'string' || typeof socialInfo.linkedin === 'string') profile.socialLinks.linkedin = asTrimmed(payload.linkedin || socialInfo.linkedin, 500);
  if (typeof payload.github === 'string' || typeof socialInfo.github === 'string') profile.socialLinks.github = asTrimmed(payload.github || socialInfo.github, 500);
  if (typeof payload.portfolio === 'string' || typeof socialInfo.portfolio === 'string') profile.socialLinks.portfolio = asTrimmed(payload.portfolio || socialInfo.portfolio, 500);

  if (typeof payload.preferredLocation === 'string' || typeof preferencesInfo.location === 'string') profile.preferences.preferredLocation = asTrimmed(payload.preferredLocation || preferencesInfo.location, 120);
  if (typeof payload.expectedSalary === 'string' || typeof payload.expectedSalary === 'number' || typeof preferencesInfo.expectedSalary === 'string' || typeof preferencesInfo.expectedSalary === 'number') profile.preferences.expectedSalary = asTrimmed(payload.expectedSalary ?? preferencesInfo.expectedSalary, 40);
  if (typeof payload.jobType === 'string' || typeof preferencesInfo.jobType === 'string') profile.preferences.jobType = asTrimmed(payload.jobType || preferencesInfo.jobType, 40);

  profile.basic = Object.keys(profile.basic).length ? profile.basic : undefined;
  profile.professional = Object.keys(profile.professional).length ? profile.professional : undefined;
  profile.socialLinks = Object.keys(profile.socialLinks).length ? profile.socialLinks : undefined;
  profile.preferences = Object.keys(profile.preferences).length ? profile.preferences : undefined;
  return profile;
};

const calculateProfileCompletion = (profile = {}, user = {}) => {
  let total = 0;
  if (user.profileImage || profile?.basic?.profilePicture) total += 10;
  if (profile?.basic?.bio) total += 10;
  if (Array.isArray(profile?.skills) && profile.skills.length > 0) total += 20;
  if (Array.isArray(profile?.experience) && profile.experience.length > 0) total += 25;
  if (Array.isArray(profile?.projects) && profile.projects.length > 0) total += 20;
  if (profile?.resumeUrl) total += 15;
  return total;
};

const buildProfileSuggestions = (profile = {}, user = {}) => {
  const suggestions = [];
  if (!user.profileImage && !profile?.basic?.profilePicture) suggestions.push('Add profile avatar');
  if (!profile?.basic?.bio) suggestions.push('Add a short bio');
  if (!Array.isArray(profile?.skills) || profile.skills.length === 0) suggestions.push('Add your top skills');
  if (!Array.isArray(profile?.experience) || profile.experience.length === 0) suggestions.push('Add work experience');
  if (!Array.isArray(profile?.projects) || profile.projects.length === 0) suggestions.push('Add projects');
  if (!profile?.resumeUrl) suggestions.push('Upload resume PDF');
  return suggestions.slice(0, 6);
};

const getProfileCacheKey = (userId) => `profile:me:${String(userId)}`;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const normalizeOutsourcingType = (value) => {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['third_party_worker', '3rd_party_worker', 'thirdpartyworker', 'third_party'].includes(raw)) {
    return 'third_party_worker';
  }
  if (raw === 'freelancer' || raw === 'freelaner') return 'freelancer';
  return raw;
};

const normalizeDepartment = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s&-]+/g, '_');

const normalizeProjectAssignments = (metadata = {}) => {
  const raw = metadata?.projectAssignments ?? metadata?.assignedProjects ?? [];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (typeof entry === 'string') {
        const value = entry.trim();
        return value ? value : null;
      }
      if (!entry || typeof entry !== 'object') return null;

      const normalized = {
        projectId: typeof entry.projectId === 'string' ? entry.projectId.trim() : String(entry.projectId || '').trim(),
        projectCode: typeof entry.projectCode === 'string' ? entry.projectCode.trim() : '',
        projectName: typeof entry.projectName === 'string' ? entry.projectName.trim() : '',
      };

      const permissions = Array.isArray(entry.permissions)
        ? entry.permissions
            .map((permission) => (typeof permission === 'string' ? permission.trim() : ''))
            .filter(Boolean)
        : [];
      if (permissions.length > 0) normalized.permissions = permissions;

      const moduleScopes = Array.isArray(entry.moduleScopes)
        ? entry.moduleScopes
            .map((scope) => (typeof scope === 'string' ? scope.trim() : ''))
            .filter(Boolean)
        : [];
      if (moduleScopes.length > 0) normalized.moduleScopes = moduleScopes;

      const pages = Array.isArray(entry.pages)
        ? entry.pages
            .map((page) => (typeof page === 'string' ? page.trim() : ''))
            .filter(Boolean)
        : [];
      if (pages.length > 0) normalized.pages = pages;

      const actions = Array.isArray(entry.actions)
        ? entry.actions
            .map((action) => (typeof action === 'string' ? action.trim() : ''))
            .filter(Boolean)
        : [];
      if (actions.length > 0) normalized.actions = actions;

      const cleaned = Object.fromEntries(
        Object.entries(normalized).filter(([, value]) => {
          if (Array.isArray(value)) return value.length > 0;
          return Boolean(value);
        })
      );

      return Object.keys(cleaned).length > 0 ? cleaned : null;
    })
    .filter(Boolean)
    .slice(0, 100);
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (all roles)
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    if (!env.ENABLE_SELF_REGISTRATION) {
      return res.status(403).json({
        success: false,
        error: 'Self-service registration is disabled. Please contact an administrator to create your account.',
        code: 'REGISTRATION_DISABLED'
      });
    }

    const { email, password, role, firstName, lastName, phone, department } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered. Please login or use a different email.',
        code: 'EMAIL_EXISTS'
      });
    }

    // Create user
    const user = await User.create({
      email: normalizedEmail,
      password,
      role,
      firstName,
      lastName,
      phone,
      department
    });

    // Generate tokens
    const sessionJti = crypto.randomUUID();
    const token = generateToken(user, { jti: sessionJti });
    const refreshToken = generateRefreshToken(user, { jti: sessionJti });
    const session = await persistSession(req, res, user, refreshToken, { jti: sessionJti });

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateModifiedOnly: true });
    await writeAuthActivity(req, 'auth.registered', user);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          department: user.department
        },
        token,
        refreshToken,
        sessionId: session?._id || null,
        jti: sessionJti,
        expiresIn: '7d'
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Register error');

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map(e => e.message),
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.',
      code: 'REGISTRATION_ERROR'
    });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user (all roles)
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const emailInput = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    // Find user with password
    const user = await User.findByCredentials(emailInput, password);

    // Update last login
  user.lastLogin = new Date();
  await user.save({ validateModifiedOnly: true });

  // Generate tokens
  const sessionJti = crypto.randomUUID();
  const token = generateToken(user, { jti: sessionJti });
  const refreshToken = generateRefreshToken(user, { jti: sessionJti });
  const session = await persistSession(req, res, user, refreshToken, { jti: sessionJti });
  await writeAuthActivity(req, 'auth.login', user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          department: user.department,
          metadata: user.metadata || {},
          assignedProjects: normalizeProjectAssignments(user.metadata || {}),
          lastLogin: user.lastLogin
        },
        token,
        refreshToken,
        sessionId: session?._id || null,
        expiresIn: '7d'
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Login error');

    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (error.message === 'Account is deactivated') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Contact administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    if (error.message === 'Account is suspended' || error.message === 'Account is blocked') {
      return res.status(403).json({
        success: false,
        error: `Your account has been ${error.message.split(' ').pop()}. Contact administrator.`,
        code: 'ACCOUNT_RESTRICTED'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
      code: 'LOGIN_ERROR'
    });
  }
};

/**
 * @route   POST /api/auth/outsourcing/login
 * @desc    Login only for outsourcing workers (third_party_worker) or admin
 * @access  Public
 */
exports.outsourcingLogin = async (req, res) => {
  try {
    const emailInput = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    const user = await User.findByCredentials(emailInput, password);
    const outsourcingType = normalizeOutsourcingType(user?.metadata?.outsourcingType || null);
    const normalizedDepartment = normalizeDepartment(user?.department || null);
    const hasOutsourcingDepartment =
      normalizedDepartment === 'outsourcing' ||
      normalizedDepartment === 'outsource' ||
      normalizedDepartment === 'external_workforce';
    const allowed =
      user.role === ROLES.ADMIN ||
      user.role === ROLES.FREELANCER ||
      hasOutsourcingDepartment ||
      outsourcingType === 'third_party_worker' ||
      outsourcingType === 'freelancer';

    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: 'This account cannot access outsourcing portal',
        code: 'OUTSOURCING_ACCESS_DENIED'
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateModifiedOnly: true });

    const sessionJti = crypto.randomUUID();
    const token = generateToken(user, { jti: sessionJti });
    const refreshToken = generateRefreshToken(user, { jti: sessionJti });
    const session = await persistSession(req, res, user, refreshToken, { jti: sessionJti });

    return res.status(200).json({
      success: true,
      message: 'Outsourcing login successful',
      data: {
        user: {
          _id: user._id,
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          department: user.department,
          metadata: user.metadata || {},
          assignedProjects: normalizeProjectAssignments(user.metadata || {}),
          lastLogin: user.lastLogin
        },
        token,
        refreshToken,
        sessionId: session?._id || null,
        jti: sessionJti,
        expiresIn: '7d'
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Outsourcing login error');
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }
    if (error.message === 'Account is deactivated') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Contact administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Outsourcing login failed. Please try again.',
      code: 'LOGIN_ERROR'
    });
  }
};

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
exports.refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || parseCookie(req, 'refreshToken');

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        code: 'USER_INVALID'
      });
    }

    const session = await Session.findOne({
      user: user._id,
      $or: [
        { jti: decoded.jti },
        { refreshTokenHash: hashToken(refreshToken) }
      ],
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Refresh session is invalid or expired',
        code: 'SESSION_INVALID'
      });
    }

    session.lastUsedAt = new Date();
    await session.save();

    // Generate new access token
    const newToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      jwtConfig.accessSecret,
      { expiresIn: jwtConfig.accessExpiresIn, jwtid: session.jti || decoded.jti }
    );

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        expiresIn: '7d'
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Refresh token error');

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Refresh token expired. Please login again.',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private (all authenticated users)
 */
exports.getMe = async (req, res) => {
  try {
    const cacheKey = getProfileCacheKey(req.user.id);
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const rawMetadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
    const metadata = JSON.parse(JSON.stringify(rawMetadata || {}));
    if (metadata.hr && typeof metadata.hr === 'object' && Object.prototype.hasOwnProperty.call(metadata.hr, 'notes')) {
      delete metadata.hr.notes;
    }
    const profile = metadata.profile && typeof metadata.profile === 'object' ? metadata.profile : {};
    const profileMeta = metadata.profileMeta && typeof metadata.profileMeta === 'object' ? metadata.profileMeta : {};
    const activities = await ActivityLog.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('action module metadata createdAt')
      .lean();

    const completion = profileMeta.completion || calculateProfileCompletion(profile, user);
    const payload = {
      user: {
          _id: user._id,
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          department: user.department,
          profileImage: user.profileImage,
          metadata,
          assignedProjects: normalizeProjectAssignments(metadata),
          profile: {
            basic: profile.basic || {},
            professional: profile.professional || {},
            skills: Array.isArray(profile.skills) ? profile.skills : [],
            experience: Array.isArray(profile.experience) ? profile.experience : [],
            education: Array.isArray(profile.education) ? profile.education : [],
            projects: Array.isArray(profile.projects) ? profile.projects : [],
            certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
            achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
            socialLinks: profile.socialLinks || {},
            preferences: profile.preferences || {},
            resumeUrl: profile.resumeUrl || '',
            completion,
            lastUpdated: profileMeta.lastUpdated || user.updatedAt,
            viewsCount: profileMeta.viewsCount || 0,
            suggestions: buildProfileSuggestions(profile, user),
          },
          activityHistory: activities,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
      }
    };

    await setCache(cacheKey, payload, 120);
    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    logger.error({ err: error }, 'Get me error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
      code: 'FETCH_PROFILE_ERROR'
    });
  }
};

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user profile
 * @access  Private (all authenticated users)
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, profileImage, bio, skills, experience, projects, resumeUrl, section, value } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (profileImage) user.profileImage = profileImage;
    const metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
    const existingProfile = metadata.profile && typeof metadata.profile === 'object' ? metadata.profile : {};
    const updatePayload = { bio, skills, experience, projects, resumeUrl };
    if (section && value !== undefined) {
      updatePayload[section] = value;
    }
    const nextProfile = sanitizeProfileInput(updatePayload);
    if (Object.keys(nextProfile).length > 0) {
      const mergedProfile = {
        ...existingProfile,
        ...nextProfile,
        basic: { ...(existingProfile.basic || {}), ...(nextProfile.basic || {}) },
        professional: { ...(existingProfile.professional || {}), ...(nextProfile.professional || {}) },
        socialLinks: { ...(existingProfile.socialLinks || {}), ...(nextProfile.socialLinks || {}) },
        preferences: { ...(existingProfile.preferences || {}), ...(nextProfile.preferences || {}) },
      };
      const profileCompletion = calculateProfileCompletion(mergedProfile, user);
      user.metadata = {
        ...metadata,
        profile: mergedProfile,
        profileMeta: {
          ...(metadata.profileMeta || {}),
          completion: profileCompletion,
          lastUpdated: new Date().toISOString(),
          viewsCount: Number(metadata?.profileMeta?.viewsCount || 0),
        },
      };
    }

    await user.save({ validateModifiedOnly: true });
    await setCache(getProfileCacheKey(req.user.id), null, 1);
    await writeAuthActivity(req, 'auth.profile_updated', user, {
      updatedFields: Object.keys(req.body || {})
    });

    const userMetadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
    const userProfile = userMetadata.profile && typeof userMetadata.profile === 'object' ? userMetadata.profile : {};

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          _id: user._id,
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          department: user.department,
          profileImage: user.profileImage,
          profile: {
            basic: userProfile.basic || {},
            professional: userProfile.professional || {},
            skills: Array.isArray(userProfile.skills) ? userProfile.skills : [],
            experience: Array.isArray(userProfile.experience) ? userProfile.experience : [],
            education: Array.isArray(userProfile.education) ? userProfile.education : [],
            projects: Array.isArray(userProfile.projects) ? userProfile.projects : [],
            certifications: Array.isArray(userProfile.certifications) ? userProfile.certifications : [],
            achievements: Array.isArray(userProfile.achievements) ? userProfile.achievements : [],
            socialLinks: userProfile.socialLinks || {},
            preferences: userProfile.preferences || {},
            resumeUrl: userProfile.resumeUrl || ''
          }
        }
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Update profile error');
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      code: 'UPDATE_PROFILE_ERROR'
    });
  }
};

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Resume file is required' });
    }
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ success: false, error: 'Only PDF resumes are allowed' });
    }

    let resumeUrl = null;
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploaded = await cloudinary.uploader.upload(dataUri, {
        folder: 'profiles/resumes',
        resource_type: 'raw',
        public_id: `resume_${req.user.id}_${Date.now()}`
      });
      resumeUrl = uploaded.secure_url;
    } else {
      resumeUrl = `data:application/pdf;base64,${req.file.buffer.toString('base64')}`;
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
    const existingProfile = metadata.profile && typeof metadata.profile === 'object' ? metadata.profile : {};
    const mergedProfile = { ...existingProfile, resumeUrl };
    const profileCompletion = calculateProfileCompletion(mergedProfile, user);
    user.metadata = {
      ...metadata,
      profile: mergedProfile,
      profileMeta: {
        ...(metadata.profileMeta || {}),
        completion: profileCompletion,
        lastUpdated: new Date().toISOString(),
        viewsCount: Number(metadata?.profileMeta?.viewsCount || 0),
      },
    };
    await user.save({ validateModifiedOnly: true });
    await setCache(getProfileCacheKey(req.user.id), null, 1);

    return res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: { resumeUrl }
    });
  } catch (error) {
    logger.error({ err: error }, 'Upload resume error');
    return res.status(500).json({ success: false, error: 'Failed to upload resume' });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Avatar file is required' });
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, error: 'Only PNG, JPG or WEBP avatars are allowed' });
    }

    let avatarUrl = null;
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploaded = await cloudinary.uploader.upload(dataUri, {
        folder: 'profiles/avatars',
        resource_type: 'image',
        public_id: `avatar_${req.user.id}_${Date.now()}`
      });
      avatarUrl = uploaded.secure_url;
    } else {
      avatarUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.profileImage = avatarUrl;
    const metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
    const profile = metadata.profile && typeof metadata.profile === 'object' ? metadata.profile : {};
    const completion = calculateProfileCompletion(profile, user);
    user.metadata = {
      ...metadata,
      profileMeta: {
        ...(metadata.profileMeta || {}),
        completion,
        lastUpdated: new Date().toISOString(),
        viewsCount: Number(metadata?.profileMeta?.viewsCount || 0),
      }
    };
    await user.save({ validateModifiedOnly: true });
    await setCache(getProfileCacheKey(req.user.id), null, 1);

    return res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { avatarUrl }
    });
  } catch (error) {
    logger.error({ err: error }, 'Upload avatar error');
    return res.status(500).json({ success: false, error: 'Failed to upload avatar' });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
exports.logout = async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken || parseCookie(req, 'refreshToken');
    const sessionFilter = {
      user: req.user.id,
      revokedAt: null,
      $or: []
    };

    if (refreshToken) {
      sessionFilter.$or.push({ refreshTokenHash: hashToken(refreshToken) });
    }

    if (req.authTokenJti) {
      sessionFilter.$or.push({ jti: req.authTokenJti });
    }

    if (sessionFilter.$or.length > 0) {
      await Session.updateMany(sessionFilter, { revokedAt: new Date() });
    }

    res.clearCookie?.('refreshToken', { path: '/api/auth' });
    await writeAuthActivity(req, 'auth.logout', { _id: req.user.id });
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Logout error');
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
};

/**
 * @route   POST /api/auth/logout-all
 * @desc    Revoke every other active session for the current user (every
 *          other browser/device), leaving the session that made this
 *          request untouched. Self-service equivalent of the Super Admin
 *          "Revoke all sessions" action, scoped to the caller's own account.
 * @access  Private
 */
exports.logoutAllOtherSessions = async (req, res) => {
  try {
    const filter = { user: req.user.id, revokedAt: null };
    if (req.authTokenJti) {
      filter.jti = { $ne: req.authTokenJti };
    }

    const { modifiedCount } = await Session.updateMany(filter, { revokedAt: new Date() });

    await writeAuthActivity(req, 'auth.logout_all_other_sessions', { _id: req.user.id }, { revokedCount: modifiedCount });

    res.status(200).json({
      success: true,
      message: modifiedCount
        ? `Logged out of ${modifiedCount} other device${modifiedCount === 1 ? '' : 's'}.`
        : 'No other active sessions found.',
      data: { revokedCount: modifiedCount }
    });
  } catch (error) {
    logger.error({ err: error }, 'Logout all sessions error');
    res.status(500).json({
      success: false,
      error: 'Failed to log out other sessions',
      code: 'LOGOUT_ALL_ERROR'
    });
  }
};

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify if token is valid
 * @access  Public
 */
exports.verifyToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const decoded = jwt.verify(token, jwtConfig.accessSecret);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Invalid token or user inactive',
        code: 'TOKEN_INVALID'
      });
    }

    const session = decoded.jti
      ? await Session.findOne({
          user: user._id,
          jti: decoded.jti,
          revokedAt: null,
          expiresAt: { $gt: new Date() }
        }).select('_id')
      : null;

    if (!session) {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Session expired or logged out',
        code: 'SESSION_INVALID'
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      data: {
        userId: user._id,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(401).json({
      success: false,
      valid: false,
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }
};
