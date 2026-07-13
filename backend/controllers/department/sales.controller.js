const cloudinary = require('cloudinary').v2;
const logger = require('../../utils/logger');
const SalesQuery = require('../../models/department/SalesQuery');
const SalesQuestion = require('../../models/department/SalesQuestion');
const { ROLES } = require('../../config/roles');
const { getCache, setCache, deleteCache, deleteCachePrefix } = require('../../services/cache.service');

const SALES_DASHBOARD_CACHE_KEY = 'sales:dashboard';
const CEO_ANALYTICS_CACHE_PREFIX = 'ceo:sales-analytics:';

const invalidateSalesQueryCaches = () => Promise.all([
  deleteCache(SALES_DASHBOARD_CACHE_KEY),
  deleteCachePrefix(CEO_ANALYTICS_CACHE_PREFIX),
]);

const isAdmin = (req) => req.user?.role === ROLES.ADMIN;
const isSales = (req) => req.user?.role === ROLES.SALES;
const normalizeProjectCode = (value) => String(value || '').trim().toUpperCase();

const DEFAULT_QUESTIONS = [
  { question: 'Do they currently use any similar software or system?', options: ['Yes', 'No', 'Not sure'] },
  { question: 'Approximate business size (staff count)', options: ['1-5', '6-20', '21-50', '50+'] },
  { question: 'Monthly transaction / order volume', options: ['Low (under 100)', 'Medium (100-500)', 'High (500+)'] },
  { question: 'Estimated monthly budget for this service', options: ['Under ₹10,000', '₹10,000 - ₹50,000', '₹50,000 - ₹1,00,000', 'Above ₹1,00,000'] },
  { question: 'How urgent is their requirement?', options: ['Immediate', 'Within 1 month', 'Within 3 months', 'Just exploring'] },
  { question: 'Interested in a live product demo?', options: ['Yes', 'No', 'Maybe later'] },
  { question: 'Was the decision maker met during this visit?', options: ['Yes, fully', 'Yes, partially', 'No'] },
  { question: 'Overall interest level after this visit', options: ['Very interested', 'Somewhat interested', 'Not interested'] },
];

const ensureDefaultQuestions = async (formType) => {
  const count = await SalesQuestion.countDocuments({ formType, projectCode: { $in: [null, ''] } });
  if (count > 0) return;
  await SalesQuestion.insertMany(
    SALES_ASSESSMENT_QUESTIONS.map((q, index) => ({ ...q, formType, order: index }))
  );
};

const SALES_ASSESSMENT_QUESTIONS = [
  { question: 'What is your average monthly sales turnover?', options: ['Under ₹1 Lakh', '₹1–5 Lakhs', '₹5–10 Lakhs', '₹10–50 Lakhs', 'Above ₹50 Lakhs'] },
  { question: 'What is your current stock availability?', options: ['Under 100 Units', '100–500 Units', '500–1,000 Units', 'Above 1,000 Units'] },
  { question: 'Do you have a manufacturing factory?', options: ['Yes', 'No'] },
  { question: 'Do you have a warehouse/store?', options: ['Yes', 'No', 'Both Factory & Warehouse'] },
  { question: 'What is your production capacity per month?', options: ['Under 1,000 Units', '1,000–5,000 Units', '5,000–10,000 Units', 'Above 10,000 Units'] },
  { question: 'What is your current team strength?', options: ['1–10 Employees', '11–25 Employees', '26–50 Employees', '51–100 Employees', 'Above 100 Employees'] },
  { question: 'Do you have a dedicated sales team?', options: ['Yes', 'No'] },
  { question: 'Do you have a quality control (QC) team?', options: ['Yes', 'No'] },
  { question: 'Do you have an inventory/stock monitoring system?', options: ['Yes', 'No', 'Planning to Implement'] },
  { question: 'What are the biggest challenges in your business?', options: ['Stock Management', 'Production Delay', 'Logistics', 'Raw Material', 'Sales', 'Cash Flow', 'Customer Acquisition', 'Workforce'] },
  { question: 'Can you fulfill large-volume orders?', options: ['Yes', 'No', 'Depends on Quantity'] },
  { question: 'What is your average order fulfillment time?', options: ['Same Day', '1–3 Days', '4–7 Days', 'More than 7 Days'] },
  { question: 'Which areas do you currently supply?', options: ['Local', 'District', 'State', 'Pan India', 'International'] },
  { question: 'What support do you expect from us?', options: ['More Orders', 'Better Pricing', 'Marketing Support', 'Faster Payments', 'Logistics Support', 'Technology Integration', 'Dedicated Relationship Manager'] },
  { question: 'Additional Business Remarks', options: [] },
];

const ensureProjectDefaultQuestions = async (projectCode, projectName) => {
  const normalizedProjectCode = normalizeProjectCode(projectCode);
  if (!normalizedProjectCode) return;

  const existing = await SalesQuestion.find({ projectCode: normalizedProjectCode }).select('question');
  const existingQuestions = new Set(existing.map((item) => String(item.question || '').trim().toLowerCase()));
  const missing = SALES_ASSESSMENT_QUESTIONS.filter((q) => !existingQuestions.has(q.question.trim().toLowerCase()));
  if (!missing.length) return;

  const lastOrder = await SalesQuestion.findOne({ projectCode: normalizedProjectCode }).sort({ order: -1 }).select('order');
  const startOrder = lastOrder?.order ?? -1;
  await SalesQuestion.insertMany(
    missing.map((q, index) => ({
      ...q,
      projectCode: normalizedProjectCode,
      projectName: String(projectName || normalizedProjectCode).trim(),
      formType: 'generic',
      buyerCategoryId: '',
      buyerCategoryLabel: 'All Selections',
      order: startOrder + index + 1,
    }))
  );
};

const EDITABLE_QUERY_FIELDS = [
  'project', 'projects', 'buyerCategory', 'buyerName', 'businessName', 'phone', 'phones', 'gstNumber', 'email', 'location', 'city', 'state',
  'businessType', 'productCategory', 'productCategories', 'qualityRating', 'moq', 'priceRange',
  'leadTime', 'paymentTerms', 'brandSection', 'brandSections', 'brandNames', 'onlineCollaboration', 'notes', 'answers', 'images',
];

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const uploadQueryImages = (files = []) => Promise.all(
  files.map(async (file) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return {
        url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        name: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageProvider: 'inline',
      };
    }

    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder: 'sales/query-images',
      resource_type: 'image',
      use_filename: true,
      unique_filename: true,
    });

    return {
      url: uploaded.secure_url,
      name: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageProvider: 'cloudinary',
      storageKey: uploaded.public_id,
    };
  })
);

exports.getDashboard = async (req, res) => {
  try {
    const cached = await getCache(SALES_DASHBOARD_CACHE_KEY);
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalLeads, newThisWeek, leadsByCategory, leadsByProject, recentLeads] = await Promise.all([
      SalesQuery.countDocuments(),
      SalesQuery.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      SalesQuery.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$buyerCategory', 'Uncategorized'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      SalesQuery.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$project.name', 'Unspecified'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      SalesQuery.find().sort({ createdAt: -1 }).limit(10),
    ]);

    const data = { totalLeads, newThisWeek, leadsByCategory, leadsByProject, recentLeads };
    await setCache(SALES_DASHBOARD_CACHE_KEY, data, 45);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch sales dashboard');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales dashboard',
    });
  }
};

exports.listQueries = async (req, res) => {
  try {
    const { mine, project, buyerCategory, search, limit } = req.query;
    const filter = {};

    if (isSales(req) || mine === 'true' || mine === '1') {
      filter.submittedBy = req.user?._id;
    }
    const clauses = [];
    if (project) clauses.push({ $or: [{ 'project.code': project }, { 'projects.code': project }] });
    if (buyerCategory) filter.buyerCategory = buyerCategory;
    if (search) {
      const regex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      clauses.push({ $or: [
        { businessName: regex },
        { buyerName: regex },
        { phone: regex },
        { phones: regex },
        { gstNumber: regex },
        { email: regex },
        { location: regex },
      ] });
    }
    if (clauses.length) filter.$and = clauses;

    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 2000);

    const queries = await SalesQuery.find(filter)
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .populate('submittedBy', 'firstName lastName email');

    return res.status(200).json({ success: true, data: { queries } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch sales queries');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales queries',
    });
  }
};

exports.createQuery = async (req, res) => {
  try {
    const body = req.body || {};
    const project = typeof body.project === 'string' ? JSON.parse(body.project) : body.project;
    const projectsRaw = typeof body.projects === 'string' ? JSON.parse(body.projects) : body.projects;
    const projects = Array.isArray(projectsRaw) ? projectsRaw.filter((item) => item?.name) : [];
    const primaryProject = project?.name ? project : projects[0];
    const answers = typeof body.answers === 'string' ? JSON.parse(body.answers) : body.answers;
    const phonesRaw = typeof body.phones === 'string' ? JSON.parse(body.phones) : body.phones;
    const phones = Array.isArray(phonesRaw) ? phonesRaw.filter(Boolean) : [];
    const productCategoriesRaw = typeof body.productCategories === 'string' ? JSON.parse(body.productCategories) : body.productCategories;
    const productCategories = Array.isArray(productCategoriesRaw) ? productCategoriesRaw.filter(Boolean) : [];
    const brandNamesRaw = typeof body.brandNames === 'string' ? JSON.parse(body.brandNames) : body.brandNames;
    const brandNames = Array.isArray(brandNamesRaw) ? brandNamesRaw.filter(Boolean) : [];
    let brandSectionRaw = body.brandSection;
    if (typeof brandSectionRaw === 'string') {
      try {
        brandSectionRaw = JSON.parse(brandSectionRaw);
      } catch {
        // plain string from older clients, keep as-is
      }
    }
    const brandSections = Array.isArray(brandSectionRaw) ? brandSectionRaw.filter(Boolean) : (brandSectionRaw ? [brandSectionRaw] : []);

    if (!primaryProject?.name || !body.buyerCategory || !(body.businessName || body.buyerName)) {
      return res.status(400).json({
        success: false,
        error: 'Product name, buyer category, and a buyer/business name are required',
      });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const images = files.length ? await uploadQueryImages(files) : [];

    const query = await SalesQuery.create({
      department: req.user?.department,
      project: primaryProject,
      projects: projects.length ? projects : [primaryProject],
      buyerCategory: body.buyerCategory,
      buyerName: body.buyerName,
      businessName: body.businessName,
      phone: body.phone || phones[0] || '',
      phones,
      gstNumber: body.gstNumber,
      email: body.email,
      location: body.location,
      city: body.city,
      state: body.state,
      businessType: body.businessType,
      productCategory: body.productCategory || productCategories.join(', '),
      productCategories,
      images,
      qualityRating: Number(body.qualityRating) || 0,
      moq: body.moq,
      priceRange: body.priceRange,
      leadTime: body.leadTime,
      paymentTerms: body.paymentTerms,
      brandSection: brandSections.join(', '),
      brandSections,
      brandNames,
      onlineCollaboration: body.onlineCollaboration,
      answers: Array.isArray(answers) ? answers : [],
      notes: body.notes,
      submittedBy: req.user?._id,
    });

    await invalidateSalesQueryCaches();

    return res.status(201).json({ success: true, data: { query } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create sales query');
    return res.status(500).json({
      success: false,
      error: 'Failed to create sales query',
    });
  }
};

exports.updateQuery = async (req, res) => {
  try {
    const updates = {};
    EDITABLE_QUERY_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (updates.answers && !Array.isArray(updates.answers)) delete updates.answers;
    if (updates.phones && !Array.isArray(updates.phones)) delete updates.phones;
    if (updates.productCategories && !Array.isArray(updates.productCategories)) delete updates.productCategories;
    if (updates.brandNames && !Array.isArray(updates.brandNames)) delete updates.brandNames;
    if (updates.brandSections && !Array.isArray(updates.brandSections)) delete updates.brandSections;
    if (updates.projects && !Array.isArray(updates.projects)) delete updates.projects;
    if (updates.images && !Array.isArray(updates.images)) delete updates.images;
    if (updates.images) {
      updates.images = updates.images
        .filter((image) => image?.url)
        .map((image) => ({
          url: String(image.url || '').trim(),
          name: String(image.name || '').trim(),
          mimeType: String(image.mimeType || '').trim(),
          sizeBytes: Number(image.sizeBytes) || 0,
          storageProvider: String(image.storageProvider || 'external').trim(),
          storageKey: String(image.storageKey || '').trim(),
        }));
    }
    if (updates.qualityRating !== undefined) updates.qualityRating = Number(updates.qualityRating) || 0;

    const filter = { _id: req.params.id };
    if (!isAdmin(req)) {
      filter.submittedBy = req.user?._id;
    }

    const query = await SalesQuery.findOneAndUpdate(filter, updates, { new: true, runValidators: true })
      .populate('submittedBy', 'firstName lastName email');

    if (!query) {
      return res.status(404).json({ success: false, error: 'Submission not found or not accessible' });
    }

    await invalidateSalesQueryCaches();

    return res.status(200).json({ success: true, data: { query } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update sales query');
    return res.status(500).json({
      success: false,
      error: 'Failed to update sales query',
    });
  }
};

exports.deleteQuery = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Only admins can delete submissions' });
    }

    const query = await SalesQuery.findByIdAndDelete(req.params.id);
    if (!query) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    await invalidateSalesQueryCaches();

    return res.status(200).json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete sales query');
    return res.status(500).json({
      success: false,
      error: 'Failed to delete sales query',
    });
  }
};

exports.listQuestions = async (req, res) => {
  try {
    const { projectCode, includeInactive } = req.query;
    const normalizedProjectCode = normalizeProjectCode(projectCode);

    if (!normalizedProjectCode) {
      await Promise.all(['vendor', 'generic'].map(ensureDefaultQuestions));
    }

    const filter = {};
    if (!isAdmin(req) || !(includeInactive === 'true' || includeInactive === '1')) {
      filter.active = true;
    }
    if (normalizedProjectCode) {
      await ensureProjectDefaultQuestions(normalizedProjectCode, normalizedProjectCode);
      filter.projectCode = normalizedProjectCode;
    } else {
      filter.$or = [{ projectCode: { $exists: false } }, { projectCode: '' }, { projectCode: null }];
    }

    const questions = await SalesQuestion.find(filter).sort({ projectCode: 1, order: 1, createdAt: 1 });
    return res.status(200).json({ success: true, data: { questions } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch sales questions');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales questions',
    });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Only admins can manage questions' });
    }

    const { question, options, projectCode, projectName } = req.body;
    const normalizedProjectCode = normalizeProjectCode(projectCode);
    if (!question?.trim()) {
      return res.status(400).json({ success: false, error: 'Question text is required' });
    }
    if (!normalizedProjectCode) {
      return res.status(400).json({ success: false, error: 'Project is required to create a question' });
    }

    const lastOrder = await SalesQuestion.findOne({ projectCode: normalizedProjectCode }).sort({ order: -1 }).select('order');
    const created = await SalesQuestion.create({
      projectCode: normalizedProjectCode,
      projectName: String(projectName || normalizedProjectCode).trim(),
      formType: 'generic',
      buyerCategoryId: '',
      buyerCategoryLabel: 'All Selections',
      question: question.trim(),
      options: Array.isArray(options) ? options.filter(Boolean) : [],
      order: (lastOrder?.order ?? -1) + 1,
    });

    return res.status(201).json({ success: true, data: { question: created } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create sales question');
    return res.status(500).json({
      success: false,
      error: 'Failed to create sales question',
    });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Only admins can manage questions' });
    }

    const updates = {};
    if (req.body.question !== undefined) updates.question = String(req.body.question).trim();
    if (req.body.options !== undefined) updates.options = Array.isArray(req.body.options) ? req.body.options.filter(Boolean) : [];
    if (req.body.order !== undefined) updates.order = Number(req.body.order) || 0;
    if (req.body.active !== undefined) updates.active = Boolean(req.body.active);
    if (req.body.projectCode !== undefined) updates.projectCode = normalizeProjectCode(req.body.projectCode);
    if (req.body.projectName !== undefined) updates.projectName = String(req.body.projectName || '').trim();
    if (req.body.buyerCategoryId !== undefined) updates.buyerCategoryId = String(req.body.buyerCategoryId || '').trim();
    if (req.body.buyerCategoryLabel !== undefined) updates.buyerCategoryLabel = String(req.body.buyerCategoryLabel || '').trim();

    const question = await SalesQuestion.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    return res.status(200).json({ success: true, data: { question } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update sales question');
    return res.status(500).json({
      success: false,
      error: 'Failed to update sales question',
    });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Only admins can manage questions' });
    }

    const question = await SalesQuestion.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    return res.status(200).json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete sales question');
    return res.status(500).json({
      success: false,
      error: 'Failed to delete sales question',
    });
  }
};
