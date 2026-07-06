const multer = require('multer');

const MAX_FILE_SIZE_MB = Number(process.env.MEDIA_UPLOAD_MAX_SIZE_MB || 50);
const MAX_FILE_SIZE_BYTES = Math.max(1, MAX_FILE_SIZE_MB) * 1024 * 1024;

const allowedMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    return cb(null, true);
  },
});

const uploadMediaFile = () => upload.single('file');

module.exports = { uploadMediaFile };
