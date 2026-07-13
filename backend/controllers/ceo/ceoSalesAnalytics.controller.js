const logger = require('../../utils/logger');
const mongoose = require('mongoose');
const SalesQuery = require('../../models/department/SalesQuery');
const { getCache, setCache } = require('../../services/cache.service');

const dayBucketExpr = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field } });

// "Location" in the CEO analytics is the City + State pair, not the free-text
// registered address — a full street address is too granular to group/filter on.
const cityStateExpr = {
  $trim: {
    input: {
      $concat: [
        { $ifNull: ['$city', ''] },
        {
          $cond: [
            { $and: [{ $ne: [{ $ifNull: ['$city', ''] }, ''] }, { $ne: [{ $ifNull: ['$state', ''] }, ''] }] },
            ', ',
            '',
          ],
        },
        { $ifNull: ['$state', ''] },
      ],
    },
  },
};

const submitterDisplayName = (u) => {
  if (!u) return 'Unassigned';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email || 'Unassigned';
};

/**
 * @route   GET /api/dept/ceo/sales-query-analytics
 * @desc    Sales Query submissions analytics for the CEO dashboard, filterable
 *          by product, buyer category, city/state and team member.
 * @access  Private (CEO, Admin)
 */
exports.getSalesQueryAnalytics = async (req, res) => {
  try {
    const { projectCode, buyerCategory, location, teamMember, from, to } = req.query;

    const cacheKey = `ceo:sales-analytics:${projectCode || ''}|${buyerCategory || ''}|${location || ''}|${teamMember || ''}|${from || ''}|${to || ''}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    const now = new Date();
    const rangeEnd = to ? new Date(to) : now;
    const rangeStart = from ? new Date(from) : new Date(new Date(rangeEnd).setDate(rangeEnd.getDate() - 90));

    const match = { createdAt: { $gte: rangeStart, $lte: rangeEnd } };
    if (projectCode) {
      match.$or = [{ 'project.code': projectCode }, { 'projects.code': projectCode }];
    }
    if (buyerCategory) match.buyerCategory = buyerCategory;
    if (location) match.$expr = { $eq: [cityStateExpr, location] };
    if (teamMember && mongoose.isValidObjectId(teamMember)) {
      match.submittedBy = new mongoose.Types.ObjectId(teamMember);
    }

    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [
      totalCount,
      weekCount,
      qualityAgg,
      byBuyerCategory,
      byProduct,
      byLocation,
      byTeamMember,
      trendRows,
      filterProjects,
      filterBuyerCategories,
      filterLocations,
      filterTeamMembers,
    ] = await Promise.all([
      SalesQuery.countDocuments(match),
      SalesQuery.countDocuments({ ...match, createdAt: { ...match.createdAt, $gte: oneWeekAgo } }),
      SalesQuery.aggregate([
        { $match: { ...match, qualityRating: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$qualityRating' }, count: { $sum: 1 } } },
      ]),
      SalesQuery.aggregate([
        { $match: match },
        { $group: { _id: { $ifNull: ['$buyerCategory', 'Uncategorized'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      SalesQuery.aggregate([
        { $match: match },
        {
          $addFields: {
            effectiveProjects: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$projects', []] } }, 0] },
                '$projects',
                { $cond: [{ $ifNull: ['$project.name', false] }, ['$project'], []] },
              ],
            },
          },
        },
        { $unwind: '$effectiveProjects' },
        { $group: { _id: '$effectiveProjects.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      SalesQuery.aggregate([
        { $match: match },
        { $addFields: { cityState: cityStateExpr } },
        { $group: { _id: { $cond: [{ $eq: ['$cityState', ''] }, 'Unknown', '$cityState'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      SalesQuery.aggregate([
        { $match: match },
        { $group: { _id: '$submittedBy', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $addFields: { user: { $arrayElemAt: ['$user', 0] } } },
      ]),
      SalesQuery.aggregate([
        { $match: match },
        { $group: { _id: dayBucketExpr('$createdAt'), count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      SalesQuery.aggregate([
        {
          $addFields: {
            effectiveProjects: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$projects', []] } }, 0] },
                '$projects',
                { $cond: [{ $ifNull: ['$project.name', false] }, ['$project'], []] },
              ],
            },
          },
        },
        { $unwind: '$effectiveProjects' },
        { $group: { _id: { code: '$effectiveProjects.code', name: '$effectiveProjects.name' } } },
        { $match: { '_id.code': { $ne: null } } },
      ]),
      SalesQuery.distinct('buyerCategory', { buyerCategory: { $nin: [null, ''] } }),
      SalesQuery.aggregate([
        { $match: { $or: [{ city: { $nin: [null, ''] } }, { state: { $nin: [null, ''] } }] } },
        { $addFields: { cityState: cityStateExpr } },
        { $match: { cityState: { $ne: '' } } },
        { $group: { _id: '$cityState' } },
        { $sort: { _id: 1 } },
      ]),
      SalesQuery.aggregate([
        { $match: { submittedBy: { $ne: null } } },
        { $group: { _id: '$submittedBy' } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $addFields: { user: { $arrayElemAt: ['$user', 0] } } },
      ]),
    ]);

    const payload = {
      summary: {
        totalSubmissions: totalCount,
        submissionsThisWeek: weekCount,
        avgQualityRating: Number((qualityAgg?.[0]?.avg || 0).toFixed(2)),
        ratedSubmissions: qualityAgg?.[0]?.count || 0,
        reportingTeamMembers: byTeamMember.length,
      },
      byBuyerCategory: byBuyerCategory.map((row) => ({ category: row._id, count: row.count })),
      byProduct: byProduct.map((row) => ({ product: row._id || 'Unknown', count: row.count })),
      byLocation: byLocation.map((row) => ({ location: row._id || 'Unknown', count: row.count })),
      byTeamMember: byTeamMember.map((row) => ({
        userId: row._id ? String(row._id) : null,
        name: submitterDisplayName(row.user),
        count: row.count,
      })),
      trend: trendRows.map((row) => ({ date: row._id, count: row.count })),
      filters: {
        products: filterProjects
          .map((row) => ({ code: row._id.code, name: row._id.name }))
          .filter((p) => p.code),
        buyerCategories: filterBuyerCategories.filter(Boolean).sort(),
        locations: filterLocations.map((row) => row._id).filter(Boolean).sort(),
        teamMembers: filterTeamMembers
          .filter((row) => row.user)
          .map((row) => ({ userId: String(row._id), name: submitterDisplayName(row.user) }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      },
      appliedFilters: {
        projectCode: projectCode || '',
        buyerCategory: buyerCategory || '',
        location: location || '',
        teamMember: teamMember || '',
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
      },
    };

    await setCache(cacheKey, payload, 30);

    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    logger.error({ err: error }, 'CEO sales query analytics error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales query analytics',
      details: error.message,
    });
  }
};
