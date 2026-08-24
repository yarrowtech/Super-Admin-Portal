const mongoose = require('mongoose');
const Portfolio = require('../models/Portfolio');
const Project = require('../models/common/Project');
const Media = require('../models/department/Media');
const LawContract = require('../models/law/LawContract');
const LegalDocument = require('../models/law/LegalDocument.v2');
const { buildDefaultSections, buildDefaultPlaybook } = require('../models/Portfolio');
const { ROLES } = require('../config/roles');
const { PROJECT_REGISTRY } = require('../utils/projectAccess');

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, 'superadmin'];
exports.ADMIN_ROLES = ADMIN_ROLES;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const PROJECT_SUMMARY_FIELDS = 'name projectCode status logo themeColor';
const PROJECT_DETAIL_FIELDS = 'name projectCode description status priority logo themeColor client startDate endDate deadline budget technologies progress projectManager';

const groupCounts = (rows) => Object.fromEntries(rows.map((r) => [r._id || 'unspecified', r.count]));

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Only the company's real, named business projects (see PROJECT_REGISTRY) are
// eligible for a Digital Portfolio — excludes auto-generated test/dummy
// `Project` documents (e.g. "Manager Project <timestamp>") that some portals
// create for their own testing and have no real business meaning.
const buildRealProjectFilter = () => {
  const tokens = PROJECT_REGISTRY.flatMap((project) => [project.code, project.name, ...(project.aliases || [])])
    .map((token) => String(token || '').trim())
    .filter(Boolean)
    .map((token) => new RegExp(`^${escapeRegex(token)}$`, 'i'));
  return { $or: [{ name: { $in: tokens } }, { projectCode: { $in: tokens } }] };
};

// Read-only rollup pulled live from the Media and Law modules for one project —
// no data is duplicated or written back; this only reads what those portals
// already track so the portfolio page can show a single project-wide picture.
const buildCrossPortalSummary = async (projectId) => {
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [
    mediaBySection,
    mediaRecent,
    contractsByStatus,
    contractsRecent,
    contractsExpiringSoon,
    documentsByStatus,
    documentsRecent,
  ] = await Promise.all([
    Media.aggregate([{ $match: { projectId } }, { $group: { _id: '$section', count: { $sum: 1 } } }]),
    Media.find({ projectId }).select('title section status thumbnailUrl updatedAt').sort({ updatedAt: -1 }).limit(6).lean(),
    LawContract.aggregate([{ $match: { projectId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    LawContract.find({ projectId }).select('title status approvalStatus expiryDate updatedAt').sort({ updatedAt: -1 }).limit(6).lean(),
    LawContract.countDocuments({ projectId, expiryDate: { $gte: new Date(), $lte: thirtyDaysOut } }),
    LegalDocument.aggregate([{ $match: { projectId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    LegalDocument.find({ projectId }).select('title type status priority updatedAt').sort({ updatedAt: -1 }).limit(6).lean(),
  ]);

  return {
    media: {
      total: mediaBySection.reduce((sum, r) => sum + r.count, 0),
      bySection: groupCounts(mediaBySection),
      recent: mediaRecent,
    },
    law: {
      contracts: {
        total: contractsByStatus.reduce((sum, r) => sum + r.count, 0),
        byStatus: groupCounts(contractsByStatus),
        expiringSoon: contractsExpiringSoon,
        recent: contractsRecent,
      },
      documents: {
        total: documentsByStatus.reduce((sum, r) => sum + r.count, 0),
        byStatus: groupCounts(documentsByStatus),
        recent: documentsRecent,
      },
    },
  };
};

// GET /api/portfolios — any authenticated user
exports.listPortfolios = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ projectName: re }, { projectCode: re }, { summary: re }, { tags: re }];
    }
    const portfolios = await Portfolio.find(filter)
      .populate('project', PROJECT_SUMMARY_FIELDS)
      .sort({ updatedAt: -1 })
      .lean();

    const projectIds = portfolios.map((p) => p.project?._id).filter(Boolean);
    let mediaCounts = {};
    let contractCounts = {};
    let documentCounts = {};
    if (projectIds.length) {
      const [mediaRows, contractRows, documentRows] = await Promise.all([
        Media.aggregate([{ $match: { projectId: { $in: projectIds } } }, { $group: { _id: '$projectId', count: { $sum: 1 } } }]),
        LawContract.aggregate([{ $match: { projectId: { $in: projectIds } } }, { $group: { _id: '$projectId', count: { $sum: 1 } } }]),
        LegalDocument.aggregate([{ $match: { projectId: { $in: projectIds } } }, { $group: { _id: '$projectId', count: { $sum: 1 } } }]),
      ]);
      mediaCounts = groupCounts(mediaRows);
      contractCounts = groupCounts(contractRows);
      documentCounts = groupCounts(documentRows);
    }

    const enriched = portfolios.map((p) => {
      const pid = p.project?._id ? String(p.project._id) : null;
      return {
        ...p,
        mediaCount: pid ? mediaCounts[pid] || 0 : 0,
        lawCount: pid ? (contractCounts[pid] || 0) + (documentCounts[pid] || 0) : 0,
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/portfolios/projects — projects available to attach a portfolio to (admin)
exports.listPortfolioProjects = async (req, res) => {
  try {
    const [projects, portfolios] = await Promise.all([
      Project.find(buildRealProjectFilter()).select('name projectCode status').sort({ name: 1 }).lean(),
      Portfolio.find().select('project').lean(),
    ]);
    const withPortfolio = new Set(portfolios.map((p) => String(p.project)));
    const data = projects.map((project) => ({
      ...project,
      hasPortfolio: withPortfolio.has(String(project._id)),
    }));
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/portfolios/:id — any authenticated user
exports.getPortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, error: 'Invalid portfolio id' });
    const portfolio = await Portfolio.findById(id).populate('project', PROJECT_SUMMARY_FIELDS);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    return res.json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/portfolios/:id/overview — any authenticated user.
// Full project basics (logo, client, dates, budget, technologies, manager)
// plus a live read-only rollup from Media and Law for the same project.
exports.getPortfolioOverview = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, error: 'Invalid portfolio id' });
    const portfolio = await Portfolio.findById(id).select('project');
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });

    const project = await Project.findById(portfolio.project)
      .select(PROJECT_DETAIL_FIELDS)
      .populate('projectManager', 'firstName lastName email')
      .lean();
    if (!project) return res.status(404).json({ success: false, error: 'Linked project not found' });

    const crossPortal = await buildCrossPortalSummary(portfolio.project);
    return res.json({ success: true, data: { project, crossPortal } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/portfolios (admin) — creates the portfolio seeded with the default template
exports.createPortfolio = async (req, res) => {
  try {
    const { project: projectId, summary, coverImage, liveUrl, tags, status } = req.body;
    if (!projectId || !isValidId(projectId)) {
      return res.status(400).json({ success: false, error: 'A valid project is required' });
    }
    const project = await Project.findOne({ $and: [{ _id: projectId }, buildRealProjectFilter()] }).select('name projectCode');
    if (!project) return res.status(404).json({ success: false, error: 'Project not found or not eligible for a digital portfolio' });

    const existing = await Portfolio.findOne({ project: projectId });
    if (existing) {
      return res.status(409).json({ success: false, error: 'A portfolio already exists for this project' });
    }

    const portfolio = await Portfolio.create({
      project: projectId,
      projectName: project.name,
      projectCode: project.projectCode,
      summary: summary || '',
      coverImage: coverImage || undefined,
      liveUrl: liveUrl || '',
      tags: Array.isArray(tags) ? tags : [],
      status: status || 'active',
      sections: buildDefaultSections(),
      playbook: buildDefaultPlaybook(),
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.status(201).json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/portfolios/:id (admin) — top-level portfolio fields
exports.updatePortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, error: 'Invalid portfolio id' });
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });

    const { summary, coverImage, liveUrl, tags, status } = req.body;
    if (summary !== undefined) portfolio.summary = summary;
    if (coverImage !== undefined) portfolio.coverImage = coverImage;
    if (liveUrl !== undefined) portfolio.liveUrl = liveUrl;
    if (Array.isArray(tags)) portfolio.tags = tags;
    if (status !== undefined) portfolio.status = status;
    portfolio.updatedBy = req.user.id;

    await portfolio.save();
    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/portfolios/:id (admin)
exports.deletePortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, error: 'Invalid portfolio id' });
    const portfolio = await Portfolio.findByIdAndDelete(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    return res.json({ success: true, data: { _id: id } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---- Sections (admin) ----

// POST /api/portfolios/:id/sections
exports.addSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ success: false, error: 'Section title is required' });
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });

    portfolio.sections.push({ title: title.trim(), order: portfolio.sections.length, items: [] });
    portfolio.updatedBy = req.user.id;
    await portfolio.save();
    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.status(201).json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/portfolios/:id/sections/:sectionId
exports.updateSection = async (req, res) => {
  try {
    const { id, sectionId } = req.params;
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    const section = portfolio.sections.id(sectionId);
    if (!section) return res.status(404).json({ success: false, error: 'Section not found' });

    const { title, order } = req.body;
    if (title !== undefined) section.title = title;
    if (order !== undefined) section.order = order;
    portfolio.updatedBy = req.user.id;
    await portfolio.save();
    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/portfolios/:id/sections/:sectionId
exports.deleteSection = async (req, res) => {
  try {
    const { id, sectionId } = req.params;
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    const section = portfolio.sections.id(sectionId);
    if (!section) return res.status(404).json({ success: false, error: 'Section not found' });
    section.deleteOne();
    portfolio.updatedBy = req.user.id;
    await portfolio.save();
    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---- Items (admin) ----

// POST /api/portfolios/:id/sections/:sectionId/items
exports.addItem = async (req, res) => {
  try {
    const { id, sectionId } = req.params;
    const { title, notes, link, status } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ success: false, error: 'Item title is required' });
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    const section = portfolio.sections.id(sectionId);
    if (!section) return res.status(404).json({ success: false, error: 'Section not found' });

    section.items.push({
      title: title.trim(),
      notes: notes || '',
      link: link || '',
      status: status || 'not-started',
      order: section.items.length,
    });
    portfolio.updatedBy = req.user.id;
    await portfolio.save();
    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.status(201).json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/portfolios/:id/sections/:sectionId/items/:itemId
exports.updateItem = async (req, res) => {
  try {
    const { id, sectionId, itemId } = req.params;
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    const section = portfolio.sections.id(sectionId);
    if (!section) return res.status(404).json({ success: false, error: 'Section not found' });
    const item = section.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' });

    const { title, notes, link, status, order } = req.body;
    if (title !== undefined) item.title = title;
    if (notes !== undefined) item.notes = notes;
    if (link !== undefined) item.link = link;
    if (status !== undefined) item.status = status;
    if (order !== undefined) item.order = order;
    portfolio.updatedBy = req.user.id;
    await portfolio.save();
    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/portfolios/:id/sections/:sectionId/items/:itemId
exports.deleteItem = async (req, res) => {
  try {
    const { id, sectionId, itemId } = req.params;
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    const section = portfolio.sections.id(sectionId);
    if (!section) return res.status(404).json({ success: false, error: 'Section not found' });
    const item = section.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
    item.deleteOne();
    portfolio.updatedBy = req.user.id;
    await portfolio.save();
    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---- Strategy Playbook — slides (admin) ----

// POST /api/portfolios/:id/playbook/slides
exports.addPlaybookSlide = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ success: false, error: 'Slide title is required' });
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });

    portfolio.playbook.push({ title: title.trim(), order: portfolio.playbook.length, blocks: [] });
    portfolio.updatedBy = req.user.id;
    await portfolio.save();
    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.status(201).json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/portfolios/:id/playbook/slides/:slideId
exports.updatePlaybookSlide = async (req, res) => {
  try {
    const { id, slideId } = req.params;
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    const slide = portfolio.playbook.id(slideId);
    if (!slide) return res.status(404).json({ success: false, error: 'Slide not found' });

    const { title, order } = req.body;
    if (title !== undefined) slide.title = title;
    if (order !== undefined) slide.order = order;
    portfolio.updatedBy = req.user.id;
    await portfolio.save();
    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/portfolios/:id/playbook/slides/:slideId
exports.deletePlaybookSlide = async (req, res) => {
  try {
    const { id, slideId } = req.params;
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    const slide = portfolio.playbook.id(slideId);
    if (!slide) return res.status(404).json({ success: false, error: 'Slide not found' });
    slide.deleteOne();
    portfolio.updatedBy = req.user.id;
    await portfolio.save();
    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---- Strategy Playbook — blocks (admin) ----

const applyBlockFields = (block, body) => {
  const { title, icon, badgeNumber, subtitle, type, text, items, groups, footer, tone, order } = body;
  if (title !== undefined) block.title = title;
  if (icon !== undefined) block.icon = icon;
  if (badgeNumber !== undefined) block.badgeNumber = badgeNumber;
  if (subtitle !== undefined) block.subtitle = subtitle;
  if (type !== undefined) block.type = type;
  if (text !== undefined) block.text = text;
  if (Array.isArray(items)) block.items = items;
  if (Array.isArray(groups)) block.groups = groups;
  if (footer !== undefined) block.footer = footer;
  if (tone !== undefined) block.tone = tone;
  if (order !== undefined) block.order = order;
};

// POST /api/portfolios/:id/playbook/slides/:slideId/blocks
exports.addPlaybookBlock = async (req, res) => {
  try {
    const { id, slideId } = req.params;
    const { title } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ success: false, error: 'Block title is required' });
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    const slide = portfolio.playbook.id(slideId);
    if (!slide) return res.status(404).json({ success: false, error: 'Slide not found' });

    const block = { title: title.trim(), order: slide.blocks.length };
    applyBlockFields(block, req.body);
    slide.blocks.push(block);
    portfolio.updatedBy = req.user.id;
    await portfolio.save();
    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.status(201).json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/portfolios/:id/playbook/slides/:slideId/blocks/:blockId
exports.updatePlaybookBlock = async (req, res) => {
  try {
    const { id, slideId, blockId } = req.params;
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    const slide = portfolio.playbook.id(slideId);
    if (!slide) return res.status(404).json({ success: false, error: 'Slide not found' });
    const block = slide.blocks.id(blockId);
    if (!block) return res.status(404).json({ success: false, error: 'Block not found' });

    applyBlockFields(block, req.body);
    portfolio.updatedBy = req.user.id;
    await portfolio.save();
    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/portfolios/:id/playbook/slides/:slideId/blocks/:blockId
exports.deletePlaybookBlock = async (req, res) => {
  try {
    const { id, slideId, blockId } = req.params;
    const portfolio = await Portfolio.findById(id);
    if (!portfolio) return res.status(404).json({ success: false, error: 'Portfolio not found' });
    const slide = portfolio.playbook.id(slideId);
    if (!slide) return res.status(404).json({ success: false, error: 'Slide not found' });
    const block = slide.blocks.id(blockId);
    if (!block) return res.status(404).json({ success: false, error: 'Block not found' });
    block.deleteOne();
    portfolio.updatedBy = req.user.id;
    await portfolio.save();
    await portfolio.populate('project', PROJECT_SUMMARY_FIELDS);
    return res.json({ success: true, data: portfolio });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
