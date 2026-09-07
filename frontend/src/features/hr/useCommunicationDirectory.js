import { useQuery } from '@tanstack/react-query';
import { hrApi } from '../../services/hr';

export const fetchCommunicationPages = async (fetchPage, token, key, params = {}) => {
  const rows = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await fetchPage(token, { ...params, page, limit: 100 });
    const data = response?.data || {};
    rows.push(...(data[key] || []));
    totalPages = Number(data.totalPages) || 1;
    page += 1;
  } while (page <= totalPages);
  return rows;
};

export const useCommunicationDirectory = (token) => useQuery({
  queryKey: ['hr', 'communication-directory', token],
  queryFn: () => fetchCommunicationPages(hrApi.getEmployees, token, 'users', { isActive: 'true', accountStatus: 'active' }),
  enabled: Boolean(token),
  staleTime: 60000,
});
export const employeeName = (user) => `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
