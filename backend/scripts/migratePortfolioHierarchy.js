// Migrates the legacy embedded Portfolio.sections[].items[] checklist into the
// new Brand → Portfolio → Category → Asset hierarchy (PortfolioGroup /
// PortfolioCategory / PortfolioAsset collections).
//
// Non-destructive: the original Portfolio.sections[]/items[] data is never
// modified or deleted — this only creates new, additive documents. Idempotent:
// re-running skips anything already tagged with a matching legacySectionId /
// legacyItemId.
//
// Mapping:
//   section  -> PortfolioGroup   (title/description/order preserved)
//   item     -> PortfolioCategory (title = item title, e.g. "Blogs")
//             + one seed PortfolioAsset inside it, carrying the item's
//               existing notes/link/status/image forward (an item today is
//               already one real row of content, not just a category label).
//
// Usage:
//   node backend/scripts/migratePortfolioHierarchy.js            (dry run — prints summary only)
//   node backend/scripts/migratePortfolioHierarchy.js --apply    (writes data)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Portfolio = require('../models/Portfolio');
const PortfolioGroup = require('../models/portfolio/PortfolioGroup');
const PortfolioCategory = require('../models/portfolio/PortfolioCategory');
const PortfolioAsset = require('../models/portfolio/PortfolioAsset');
const { PROJECT_REGISTRY } = require('../utils/projectAccess');

const APPLY = process.argv.includes('--apply');

const normalize = (v) => String(v || '').trim().toLowerCase();

const resolveBrandCode = (portfolio) => {
  const nameKey = normalize(portfolio.projectName);
  const codeKey = normalize(portfolio.projectCode);
  const match = PROJECT_REGISTRY.find((project) => {
    const tokens = [project.code, project.name, ...(project.aliases || [])].map(normalize).filter(Boolean);
    return tokens.includes(nameKey) || tokens.includes(codeKey);
  });
  return match?.brandCode || null;
};

const ITEM_STATUS_MAP = {
  'not-started': 'backlog',
  'in-progress': 'in_progress',
  done: 'published',
};

const run = async () => {
  await connectDB();

  const portfolios = await Portfolio.find().lean();
  console.log(`Found ${portfolios.length} portfolio document(s).`);

  const summary = { portfolios: 0, groupsCreated: 0, groupsSkipped: 0, categoriesCreated: 0, categoriesSkipped: 0, assetsCreated: 0, assetsSkipped: 0 };

  for (const portfolio of portfolios) {
    summary.portfolios += 1;
    const brandCode = resolveBrandCode(portfolio);
    const sections = [...(portfolio.sections || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

    console.log(`\nPortfolio "${portfolio.projectName}" (${portfolio._id}) — brand: ${brandCode || 'unmatched'} — ${sections.length} section(s)`);

    for (const section of sections) {
      const legacySectionId = String(section._id);
      let group = await PortfolioGroup.findOne({ portfolioId: portfolio._id, legacySectionId });

      if (group) {
        summary.groupsSkipped += 1;
      } else {
        summary.groupsCreated += 1;
        console.log(`  + group "${section.title}"`);
        if (APPLY) {
          group = await PortfolioGroup.create({
            portfolioId: portfolio._id,
            brandCode: brandCode || '',
            title: section.title,
            description: section.description || '',
            order: section.order || 0,
            legacySectionId,
          });
        }
      }

      const items = [...(section.items || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
      for (const item of items) {
        const legacyItemId = String(item._id);
        let category = await PortfolioCategory.findOne({ groupId: group?._id, legacyItemId });

        if (category) {
          summary.categoriesSkipped += 1;
        } else {
          summary.categoriesCreated += 1;
          console.log(`    + category "${item.title}"`);
          if (APPLY && group) {
            category = await PortfolioCategory.create({
              portfolioId: portfolio._id,
              groupId: group._id,
              title: item.title,
              order: item.order || 0,
              legacyItemId,
            });
          }
        }

        const existingAsset = await PortfolioAsset.findOne({ categoryId: category?._id, legacyItemId });
        if (existingAsset) {
          summary.assetsSkipped += 1;
        } else {
          summary.assetsCreated += 1;
          const noteParts = [item.notes || '', item.link ? `Link: ${item.link}` : ''].filter(Boolean);
          console.log(`      + seed asset "${item.title}"`);
          if (APPLY && category) {
            await PortfolioAsset.create({
              categoryId: category._id,
              groupId: group._id,
              portfolioId: portfolio._id,
              title: item.title,
              status: ITEM_STATUS_MAP[item.status] || 'backlog',
              description: noteParts.join(' — '),
              notes: item.notes || '',
              legacyItemId,
            });
          }
        }
      }
    }
  }

  console.log('\n--- Summary ---');
  console.log(summary);
  console.log(APPLY ? '\nApplied.' : '\nDry run only — re-run with --apply to write these changes.');
};

// The production-safe implementation owns connection lifecycle and execution.
// The legacy implementation above is intentionally retained for review history
// but is no longer invoked.
require('./migratePortfolioHierarchy.safe');
