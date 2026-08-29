const multer = require('multer');

const MAX_FILE_SIZE_MB = Number(process.env.UPLOAD_MAX_SIZE_MB || 10);
const MAX_FILE_SIZE_BYTES = Math.max(1, MAX_FILE_SIZE_MB) * 1024 * 1024;

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    return cb(null, true);
  }
});

const runUpload = (middleware) => (req, res, next) => {
  middleware(req, res, (err) => {
    if (!err) return next();
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : Number(err.statusCode) || 400;
    return res.status(status).json({
      success: false,
      error: err.message || 'File upload failed',
      code: err.code || 'UPLOAD_REJECTED',
    });
  });
};

const uploadSingle = (fieldName = 'file') => runUpload(upload.single(fieldName));
const uploadMany = (fieldName = 'files', maxCount = 5) => runUpload(upload.array(fieldName, maxCount));

const jpegOnlyUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'image/jpeg') {
      const err = new Error('Only JPG/JPEG photos are allowed');
      err.statusCode = 400;
      return cb(err);
    }
    return cb(null, true);
  }
});

const uploadJpegImages = (fieldName = 'images', maxCount = 8) => runUpload(jpegOnlyUpload.array(fieldName, maxCount));

// Browsers/OSes are inconsistent about the mimetype they attach to a .csv
// file (text/csv, application/vnd.ms-excel from Excel-on-Windows, or a bare
// text/plain) — accept the realistic set rather than just 'text/csv'.
const CSV_MIME_TYPES = new Set(['text/csv', 'application/vnd.ms-excel', 'application/csv', 'text/plain']);
const csvOnlyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!CSV_MIME_TYPES.has(file.mimetype) && !file.originalname?.toLowerCase().endsWith('.csv')) {
      const err = new Error('Only CSV files are allowed');
      err.statusCode = 400;
      return cb(err);
    }
    return cb(null, true);
  }
});
const uploadCsv = (fieldName = 'file') => runUpload(csvOnlyUpload.single(fieldName));

module.exports = {
  uploadSingle,
  uploadMany,
  uploadJpegImages,
  uploadCsv
};
