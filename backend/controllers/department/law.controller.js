const logger = require('../../utils/logger');
const Law = require('../../models/department/Law');
const { v2: cloudinary } = require('cloudinary');

const LAW_SECTIONS = [
  'dashboard',
  'agreements',
  'privacy-policy',
  'disputes-fraud',
  'ip-copyright',
  'work-hire',
  'third-party',
  'alerts',
  'ai-insights',
  'documents',
  'contracts',
  'compliance',
  'cases',
  'risk-advisory',
  'policy-review',
  'ip-management',
  'reporting'
];

const cleanString = (value) => (typeof value === 'string' ? value.trim() : value);

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => cleanString(tag)).filter(Boolean).slice(0, 20);
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  return [];
};

const buildPayload = (body = {}, userId) => {
  const payload = {
    section: cleanString(body.section),
    title: cleanString(body.title),
    description: cleanString(body.description) || '',
    status: cleanString(body.status) || 'Draft',
    priority: cleanString(body.priority) || 'Medium',
    owner: cleanString(body.owner) || '',
    referenceNumber: cleanString(body.referenceNumber) || '',
    tags: normalizeTags(body.tags),
    notes: cleanString(body.notes) || '',
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    updatedBy: userId
  };

  if (body.dueDate) {
    const parsedDate = new Date(body.dueDate);
    if (!Number.isNaN(parsedDate.getTime())) {
      payload.dueDate = parsedDate;
    }
  } else if (body.dueDate === '' || body.dueDate === null) {
    payload.dueDate = undefined;
  }

  return payload;
};

const sendError = (res, error, fallback, status = 500) => {
  res.status(status).json({
    success: false,
    error: fallback,
    details: error.message
  });
};

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

exports.getDashboard = async (req, res) => {
  try {
    const scope = req.projectId ? { projectId: req.projectId } : {};
    const [totalRecords, needsAttention, bySection, byStatus, recentRecords] = await Promise.all([
      Law.countDocuments(scope),
      Law.countDocuments({ ...scope, $or: [{ status: 'Attention' }, { priority: 'Critical' }] }),
      Law.aggregate([{ $match: scope }, { $group: { _id: '$section', count: { $sum: 1 } } }]),
      Law.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Law.find(scope).sort({ updatedAt: -1 }).limit(6)
    ]);

    res.status(200).json({
      success: true,
      data: {
        message: 'Welcome to Legal Department Dashboard',
        permissions: ['legal_documents', 'compliance_management', 'contract_review', 'legal_advice'],
        totals: {
          totalRecords,
          needsAttention,
          sections: LAW_SECTIONS.length
        },
        bySection,
        byStatus,
        recentRecords
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Law dashboard error');
    sendError(res, error, 'Failed to fetch Law dashboard');
  }
};

exports.getRecords = async (req, res) => {
  try {
    const { section, status, priority, search } = req.query;
    const query = req.projectId ? { projectId: req.projectId } : {};

    if (section) query.section = section;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const records = await Law.find(query).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    logger.error({ err: error }, 'Get law records error');
    sendError(res, error, 'Failed to fetch Law records');
  }
};

exports.createRecord = async (req, res) => {
  try {
    const payload = buildPayload(req.body, req.user?.id || req.user?._id);
    payload.projectId = req.projectId;

    if (!payload.section || !payload.title) {
      return res.status(400).json({
        success: false,
        error: 'section and title are required'
      });
    }

    const record = await Law.create({
      ...payload,
      createdBy: req.user?.id || req.user?._id
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    logger.error({ err: error }, 'Create law record error');
    sendError(res, error, 'Failed to create Law record');
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const payload = buildPayload(req.body, req.user?.id || req.user?._id);
    payload.projectId = req.projectId;
    if (!payload.dueDate) delete payload.dueDate;

    const record = await Law.findOneAndUpdate({ _id: req.params.id, projectId: req.projectId }, payload, {
      new: true,
      runValidators: true
    });

    if (!record) {
      return res.status(404).json({ success: false, error: 'Law record not found' });
    }

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    logger.error({ err: error }, 'Update law record error');
    sendError(res, error, 'Failed to update Law record');
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const record = await Law.findOneAndDelete({ _id: req.params.id, projectId: req.projectId });

    if (!record) {
      return res.status(404).json({ success: false, error: 'Law record not found' });
    }

    res.status(200).json({ success: true, message: 'Law record deleted successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Delete law record error');
    sendError(res, error, 'Failed to delete Law record');
  }
};

exports.getContracts = async (req, res) => {
  try {
    const contracts = await Law.find({ projectId: req.projectId, section: { $in: ['agreements', 'contracts'] } }).sort({ updatedAt: -1 });
    res.status(200).json({
      success: true,
      data: {
        message: 'Contract Management',
        contracts
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Law contracts error');
    sendError(res, error, 'Failed to fetch contracts');
  }
};

exports.getCompliance = async (req, res) => {
  try {
    const compliance = await Law.find({ projectId: req.projectId, section: { $in: ['privacy-policy', 'compliance'] } }).sort({ updatedAt: -1 });
    res.status(200).json({
      success: true,
      data: {
        message: 'Compliance Management',
        compliance
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Law compliance error');
    sendError(res, error, 'Failed to fetch compliance data');
  }
};

exports.uploadReferencePdfs = async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.status(400).json({ success: false, error: 'At least one PDF is required' });
    }
    if (files.some((file) => file.mimetype !== 'application/pdf')) {
      return res.status(400).json({ success: false, error: 'Only PDF files are allowed' });
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
          return {
            url: `data:application/pdf;base64,${file.buffer.toString('base64')}`,
            publicId: null,
            originalName: file.originalname,
            bytes: file.size,
            provider: 'inline'
          };
        }

        const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const uploaded = await cloudinary.uploader.upload(dataUri, {
          folder: `law/references/${req.projectId}`,
          resource_type: 'raw',
          use_filename: true,
          unique_filename: true
        });

        return {
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          originalName: file.originalname,
          bytes: file.size,
          provider: 'cloudinary'
        };
      })
    );

    return res.status(201).json({ success: true, data: uploads });
  } catch (error) {
    logger.error({ err: error }, 'Upload law reference pdfs error');
    return res.status(500).json({ success: false, error: 'Failed to upload reference PDFs', details: error.message });
  }
};
