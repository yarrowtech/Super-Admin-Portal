const asyncHandler = require('../../utils/asyncHandler');
const documentsService = require('../../services/report.service');
const EmployeeDocument = require('../../models/employee/EmployeeDocument');

exports.getDocuments = asyncHandler(async (req, res) => {
  const data = await documentsService.getDocuments(req.user);
  res.json({
    success: true,
    data,
  });
});

exports.uploadDocument = asyncHandler(async (req, res) => {
  const { title, type, fileName, mimeType, contentBase64, fileUrl } = req.body || {};

  if (!title || (!contentBase64 && !fileUrl)) {
    return res.status(400).json({
      success: false,
      error: 'title and file content are required',
    });
  }

  let normalizedFileUrl = fileUrl;
  if (!normalizedFileUrl && contentBase64) {
    const safeMime = mimeType || 'application/octet-stream';
    normalizedFileUrl = `data:${safeMime};base64,${contentBase64}`;
  }

  const metadata = {
    fileName: fileName || `${title}.bin`,
    mimeType: mimeType || 'application/octet-stream',
    size: Number(req.body?.size || 0),
  };

  const doc = await EmployeeDocument.create({
    user: req.user._id,
    title: String(title).trim(),
    type: type || 'document',
    fileUrl: normalizedFileUrl,
    uploadedBy: req.user._id,
    metadata,
  });

  res.status(201).json({
    success: true,
    data: {
      id: doc._id,
      title: doc.title,
      type: doc.type,
      updatedAt: doc.updatedAt,
    },
  });
});

exports.downloadDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const doc = await EmployeeDocument.findOne({ _id: id, user: req.user._id });
  if (!doc) {
    return res.status(404).json({
      success: false,
      error: 'Document not found',
    });
  }

  res.json({
    success: true,
    data: {
      id: doc._id,
      title: doc.title,
      type: doc.type,
      downloadUrl: doc.fileUrl,
      fileName: doc.metadata?.fileName || `${doc.title}.bin`,
      mimeType: doc.metadata?.mimeType || 'application/octet-stream',
    },
  });
});
