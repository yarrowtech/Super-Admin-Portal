const cloudinary = require('cloudinary').v2;
const logger = require('../../utils/logger');
const Sales = require('../../models/department/Sales');
const SalesQuery = require('../../models/department/SalesQuery');

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
    const [totalLeads, pipelineByStage, totalValueAgg, recentLeads] = await Promise.all([
      Sales.countDocuments(),
      Sales.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$stage', 'unclassified'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Sales.aggregate([
        {
          $group: {
            _id: null,
            totalValue: { $sum: { $ifNull: ['$value', 0] } },
          },
        },
      ]),
      Sales.find().sort({ createdAt: -1 }).limit(10),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalLeads,
        totalPipelineValue: totalValueAgg?.[0]?.totalValue || 0,
        pipelineByStage,
        recentLeads,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch sales dashboard');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales dashboard',
      details: error.message,
    });
  }
};

exports.listQueries = async (req, res) => {
  try {
    const queries = await SalesQuery.find().sort({ createdAt: -1 }).limit(50);
    return res.status(200).json({ success: true, data: { queries } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch sales queries');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales queries',
      details: error.message,
    });
  }
};

exports.createQuery = async (req, res) => {
  try {
    const body = req.body || {};
    const project = typeof body.project === 'string' ? JSON.parse(body.project) : body.project;
    const answers = typeof body.answers === 'string' ? JSON.parse(body.answers) : body.answers;

    if (!project?.name || !body.buyerCategory || !(body.businessName || body.buyerName)) {
      return res.status(400).json({
        success: false,
        error: 'Project, buyer category, and a buyer/business name are required',
      });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const images = files.length ? await uploadQueryImages(files) : [];

    const query = await SalesQuery.create({
      department: req.user?.department,
      project,
      buyerCategory: body.buyerCategory,
      buyerName: body.buyerName,
      businessName: body.businessName,
      phone: body.phone,
      email: body.email,
      location: body.location,
      businessType: body.businessType,
      productCategory: body.productCategory,
      images,
      qualityRating: Number(body.qualityRating) || 0,
      moq: body.moq,
      priceRange: body.priceRange,
      leadTime: body.leadTime,
      paymentTerms: body.paymentTerms,
      brandSection: body.brandSection,
      onlineCollaboration: body.onlineCollaboration,
      answers: Array.isArray(answers) ? answers : [],
      notes: body.notes,
      submittedBy: req.user?._id,
    });

    return res.status(201).json({ success: true, data: { query } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create sales query');
    return res.status(500).json({
      success: false,
      error: 'Failed to create sales query',
      details: error.message,
    });
  }
};
