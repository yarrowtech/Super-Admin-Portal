const asyncHandler = require('../../../utils/asyncHandler');
const documentsService = require('../services/documents.service');

exports.getDocuments = asyncHandler(async (req, res) => {
  const data = await documentsService.getDocuments(req.user);
  res.json({
    success: true,
    data,
  });
});
