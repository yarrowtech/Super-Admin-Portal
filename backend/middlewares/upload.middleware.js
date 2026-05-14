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
    files: 5
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    return cb(null, true);
  }
});

const uploadSingle = (fieldName = 'file') => upload.single(fieldName);
const uploadMany = (fieldName = 'files', maxCount = 5) => upload.array(fieldName, maxCount);

module.exports = {
  uploadSingle,
  uploadMany
};
