const PortfolioFile = require('../../models/portfolio/PortfolioFile');
const { uploadMediaFile, deleteCloudinaryAsset } = require('../media/media.service');
const {
  ValidationError,
  NotFoundError,
  assertId,
  audit,
  resolveCategoryChain,
  resolveAssetChain,
  getPortfolioProjectId,
  userSummary,
} = require('./portfolioShared');

const POPULATE = [
  { path: 'uploadedBy', select: 'firstName lastName email profileImage' },
  { path: 'assetId', select: 'title status' },
  { path: 'versions.uploadedBy', select: 'firstName lastName email profileImage' },
];

const fileTypeFromMime = (mime = '') => {
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  return 'document';
};

const shape = (doc) => {
  const f = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
  const current = f.versions?.find((v) => v.version === f.currentVersion) || f.versions?.[f.versions.length - 1] || null;
  return {
    _id: f._id,
    name: f.name,
    fileType: f.fileType,
    linkUrl: f.linkUrl,
    currentVersion: f.currentVersion,
    versionCount: f.versions?.length || 0,
    url: f.fileType === 'link' ? f.linkUrl : current?.url || '',
    thumbnailUrl: current?.thumbnailUrl || '',
    mimeType: current?.mimeType || '',
    sizeBytes: current?.sizeBytes || 0,
    uploadedBy: userSummary(f.uploadedBy),
    asset: f.assetId ? { _id: f.assetId._id || f.assetId, title: f.assetId.title } : null,
    assetId: f.assetId?._id || f.assetId || null,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
};

const listFiles = async (categoryId, { type, assetId } = {}) => {
  await resolveCategoryChain(categoryId);
  const filter = { categoryId, deletedAt: null };
  if (type && type !== 'all') filter.fileType = type;
  if (assetId) filter.assetId = assetId;
  const files = await PortfolioFile.find(filter).sort({ updatedAt: -1 }).populate(POPULATE).lean();
  return files.map(shape);
};

const listVersions = async (fileId) => {
  assertId(fileId, 'file id');
  const file = await PortfolioFile.findById(fileId).populate('versions.uploadedBy', 'firstName lastName email profileImage').lean();
  if (!file || file.deletedAt) throw new NotFoundError('File not found');
  return (file.versions || [])
    .slice()
    .sort((a, b) => b.version - a.version)
    .map((v) => ({ ...v, uploadedBy: userSummary(v.uploadedBy) }));
};

// Handles both a real upload (`file` from multer) and a `link` entry (`linkUrl`).
const uploadFile = async (categoryId, { file, body }, actor) => {
  const category = await resolveCategoryChain(categoryId);
  const isLink = !file && body.linkUrl;
  if (!file && !isLink) throw new ValidationError('A file or a link URL is required');

  let assetId = null;
  if (body.assetId) {
    const asset = await resolveAssetChain(body.assetId, { categoryId });
    assetId = asset._id;
  }

  const base = {
    categoryId: category._id,
    groupId: category.groupId,
    portfolioId: category.portfolioId,
    assetId,
    uploadedBy: actor?.id,
    updatedBy: actor?.id,
    currentVersion: 1,
  };

  let doc;
  if (isLink) {
    doc = await PortfolioFile.create({
      ...base,
      name: (body.name && body.name.trim()) || body.linkUrl,
      fileType: 'link',
      linkUrl: String(body.linkUrl).trim(),
      versions: [{ version: 1, note: body.note || '', uploadedBy: actor?.id }],
    });
  } else {
    const projectId = await getPortfolioProjectId(category.portfolioId);
    const uploaded = await uploadMediaFile({ file, section: 'portfolio-file', projectId });
    doc = await PortfolioFile.create({
      ...base,
      name: (body.name && body.name.trim()) || uploaded.originalName || 'file',
      fileType: fileTypeFromMime(uploaded.mimeType),
      versions: [{
        version: 1,
        url: uploaded.url,
        storageKey: uploaded.storageKey,
        storageProvider: uploaded.storageProvider,
        thumbnailUrl: uploaded.thumbnailUrl,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.fileSizeBytes,
        note: body.note || '',
        uploadedBy: actor?.id,
      }],
    });
  }

  await audit(actor, 'FILE_UPLOADED', 'PortfolioFile', doc._id, {
    categoryId: String(categoryId), name: doc.name, fileType: doc.fileType, assetId: assetId ? String(assetId) : null,
  });
  return shape(await doc.populate(POPULATE));
};

const findFileOrThrow = async (fileId) => {
  assertId(fileId, 'file id');
  const file = await PortfolioFile.findOne({ _id: fileId, deletedAt: null });
  if (!file) throw new NotFoundError('File not found');
  return file;
};

// Replace = append a new version; the previous versions are kept (spec §12).
const replaceFile = async (fileId, { file, body }, actor) => {
  const doc = await findFileOrThrow(fileId);
  if (doc.fileType === 'link') {
    if (!body.linkUrl) throw new ValidationError('A new link URL is required');
    const nextVersion = doc.currentVersion + 1;
    doc.linkUrl = String(body.linkUrl).trim();
    doc.versions.push({ version: nextVersion, note: body.note || '', uploadedBy: actor?.id });
    doc.currentVersion = nextVersion;
  } else {
    if (!file) throw new ValidationError('A replacement file is required');
    const projectId = await getPortfolioProjectId(doc.portfolioId);
    const uploaded = await uploadMediaFile({ file, section: 'portfolio-file', projectId });
    const nextVersion = doc.currentVersion + 1;
    doc.fileType = fileTypeFromMime(uploaded.mimeType);
    doc.versions.push({
      version: nextVersion,
      url: uploaded.url,
      storageKey: uploaded.storageKey,
      storageProvider: uploaded.storageProvider,
      thumbnailUrl: uploaded.thumbnailUrl,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.fileSizeBytes,
      note: body.note || '',
      uploadedBy: actor?.id,
    });
    doc.currentVersion = nextVersion;
  }
  doc.updatedBy = actor?.id;
  await doc.save();
  await audit(actor, 'FILE_REPLACED', 'PortfolioFile', doc._id, { name: doc.name, version: doc.currentVersion });
  return shape(await doc.populate(POPULATE));
};

const updateFile = async (fileId, body, actor) => {
  const doc = await findFileOrThrow(fileId);
  const changed = [];
  if (body.name !== undefined) { doc.name = String(body.name).trim(); changed.push('name'); }
  if (body.assetId !== undefined) {
    if (body.assetId) {
      const asset = await resolveAssetChain(body.assetId, { categoryId: doc.categoryId });
      doc.assetId = asset._id;
    } else {
      doc.assetId = null;
    }
    changed.push('assetId');
  }
  if (!changed.length) return shape(await doc.populate(POPULATE));
  doc.updatedBy = actor?.id;
  await doc.save();
  await audit(actor, 'FILE_UPDATED', 'PortfolioFile', doc._id, { fields: changed });
  return shape(await doc.populate(POPULATE));
};

const archiveFile = async (fileId, actor) => {
  const doc = await findFileOrThrow(fileId);
  doc.deletedAt = new Date();
  doc.deletedBy = actor?.id;
  await doc.save();
  await audit(actor, 'ARCHIVED', 'PortfolioFile', doc._id, {});
  return { _id: doc._id, archived: true };
};

module.exports = { listFiles, listVersions, uploadFile, replaceFile, updateFile, archiveFile };
