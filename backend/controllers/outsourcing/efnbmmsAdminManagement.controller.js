const logger = require('../../utils/logger');
const { createEfnbmmsProxyService } = require('../../services/efnbmmsProxy.service');

const service = createEfnbmmsProxyService({
  label: 'EFNBMMS admin-management API',
  baseUrlKeys: ['EFNBMMS_ADMIN_MANAGEMENT_API_URL', 'EFMBMMS_ADMIN_MANAGEMENT_API_URL'],
  tokenKeys: ['EFNBMMS_API_TOKEN', 'EFMBMMS_API_TOKEN'],
});

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const getPayloadArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
};

const getAdminId = (item = {}) => String(item.id || item.adminId || item._id || '').trim();

const integrationContext = Object.freeze({
  source: 'efnbmms',
  api: 'admin-management',
  role: 'admin',
  mode: 'server_to_server_api',
});

const fetchAdminManagementRows = async (requestId) => {
  const upstream = await service.request('GET', '', { requestId });
  if (!upstream.ok) {
    const error = new Error(upstream.data?.error || upstream.data?.message || 'EFNBMMS admin-management request failed');
    error.status = upstream.status || 502;
    error.upstream = upstream.data;
    throw error;
  }
  return getPayloadArray(upstream.data);
};

const filterRows = (rows = [], query = {}) => {
  const search = normalizeText(query.search || query.q);
  const status = normalizeText(query.status);

  return rows.filter((item) => {
    const matchesSearch =
      !search ||
      [
        item.businessName,
        item.email,
        item.mobile,
        item.adminId,
        item.id,
        ...(Array.isArray(item.restaurantNames) ? item.restaurantNames : []),
      ]
        .map(normalizeText)
        .some((value) => value.includes(search));

    const activeValue = item.isActive === false ? 'inactive' : 'active';
    const matchesStatus = !status || status === 'all' || status === activeValue;
    return matchesSearch && matchesStatus;
  });
};

const paginateRows = (rows = [], query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 25, 1), 100);
  const start = (page - 1) * limit;
  return {
    page,
    limit,
    total: rows.length,
    totalPages: rows.length === 0 ? 0 : Math.ceil(rows.length / limit),
    items: rows.slice(start, start + limit),
  };
};

const buildSummary = (rows = []) => {
  const active = rows.filter((item) => item.isActive !== false).length;
  const totalRestaurants = rows.reduce((sum, item) => sum + (Number(item.totalRestaurants) || 0), 0);
  const totalStaff = rows.reduce((sum, item) => sum + (Number(item.totalStaff) || 0), 0);

  return {
    admins: {
      total: rows.length,
      active,
      inactive: rows.length - active,
    },
    restaurants: {
      total: totalRestaurants,
    },
    staff: {
      total: totalStaff,
    },
  };
};

const listAdminManagement = async (req, res) => {
  try {
    const rows = await fetchAdminManagementRows(req.headers['x-request-id']);
    const filtered = filterRows(rows, req.query);
    const pagination = paginateRows(filtered, req.query);
    return res.status(200).json({
      success: true,
      data: {
        integration: integrationContext,
        items: pagination.items,
        summary: buildSummary(rows),
        filteredSummary: buildSummary(filtered),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
        },
      },
    });
  } catch (error) {
    const status = Number(error.status) || 502;
    logger.error({ err: error }, 'EFNBMMS admin-management list failed');
    return res.status(status).json({
      success: false,
      error: error.message || 'Failed to fetch EFNBMMS admin-management data',
      code: 'EFNBMMS_ADMIN_MANAGEMENT_FAILED',
    });
  }
};

const getAdminManagementSummary = async (req, res) => {
  try {
    const rows = await fetchAdminManagementRows(req.headers['x-request-id']);
    return res.status(200).json({
      success: true,
      data: {
        integration: integrationContext,
        ...buildSummary(rows),
      },
    });
  } catch (error) {
    const status = Number(error.status) || 502;
    logger.error({ err: error }, 'EFNBMMS admin-management summary failed');
    return res.status(status).json({
      success: false,
      error: error.message || 'Failed to fetch EFNBMMS admin-management summary',
      code: 'EFNBMMS_ADMIN_MANAGEMENT_SUMMARY_FAILED',
    });
  }
};

const getAdminManagementDetail = async (req, res) => {
  try {
    const rows = await fetchAdminManagementRows(req.headers['x-request-id']);
    const key = normalizeText(req.params.adminId);
    const item = rows.find((row) => normalizeText(getAdminId(row)) === key || normalizeText(row.email) === key);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'EFNBMMS admin-management record not found',
        code: 'EFNBMMS_ADMIN_MANAGEMENT_NOT_FOUND',
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        integration: integrationContext,
        item,
      },
    });
  } catch (error) {
    const status = Number(error.status) || 502;
    logger.error({ err: error }, 'EFNBMMS admin-management detail failed');
    return res.status(status).json({
      success: false,
      error: error.message || 'Failed to fetch EFNBMMS admin-management detail',
      code: 'EFNBMMS_ADMIN_MANAGEMENT_DETAIL_FAILED',
    });
  }
};

module.exports = {
  listAdminManagement,
  getAdminManagementSummary,
  getAdminManagementDetail,
};
