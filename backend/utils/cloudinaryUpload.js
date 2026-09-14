const { v2: cloudinary } = require('cloudinary');

let configured = false;

const isCloudinaryConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const ensureConfigured = () => {
  if (configured || !isCloudinaryConfigured()) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  configured = true;
};

// Uploads a multer file buffer to Cloudinary as a raw resource. Falls back to
// an inline base64 data URI when Cloudinary isn't configured (matches the
// existing fallback used by the legacy Law reference-PDF upload), so local
// dev without credentials still works instead of throwing.
const uploadBufferToCloudinary = async (file, { folder, resourceType = 'raw' } = {}) => {
  if (!isCloudinaryConfigured()) {
    return {
      url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      publicId: null,
      provider: 'inline',
    };
  }
  ensureConfigured();
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  const uploaded = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: resourceType,
    use_filename: true,
    unique_filename: true,
  });
  return {
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    provider: 'cloudinary',
  };
};

module.exports = { uploadBufferToCloudinary, isCloudinaryConfigured };
