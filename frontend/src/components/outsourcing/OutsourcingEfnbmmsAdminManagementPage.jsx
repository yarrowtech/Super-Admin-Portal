import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { outsourcingApi } from '../../services/outsourcing';
import { OutsourcingPageHeader } from '../../features/outsourcing/components/OutsourcingUI';

const unwrapItems = (payload) => payload?.data?.items || payload?.items || [];
const unwrapSummary = (payload) => payload?.data?.summary || payload?.summary || {};

export default function OutsourcingEfnbmmsAdminManagementPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await outsourcingApi.getEfnbmmsAdminManagement(token, { limit: 100 });
      setRows(unwrapItems(response));
      setSummary(unwrapSummary(response));
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load EFNBMMS admin-management data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return rows;
    return rows.filter((item) =>
      [
        item.businessName,
        item.email,
        item.mobile,
        item.adminId,
        item.id,
        ...(Array.isArray(item.restaurantNames) ? item.restaurantNames : []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <OutsourcingPageHeader
        title="EFNBMMS Admin Management"
        subtitle="Live EFNBMMS data fetched through admin-management API. No EFNBMMS login required."
        icon="storefront"
        accent="#f59e0b"
        action={
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Admins', value: summary?.admins?.total || rows.length, icon: 'admin_panel_settings' },
          { label: 'Restaurants', value: summary?.restaurants?.total || 0, icon: 'restaurant' },
          { label: 'Staff', value: summary?.staff?.total || 0, icon: 'groups' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{item.label}</p>
                <p className="mt-1 text-2xl font-black text-neutral-950 dark:text-white">{item.value}</p>
              </div>
              <span className="material-symbols-outlined rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300">
                {item.icon}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-black text-neutral-950 dark:text-white">Admin-management records</h2>
            <p className="text-xs text-neutral-500">Connected to EFNBMMS by server-to-server API token.</p>
          </div>
          <label className="relative block md:w-80">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search business, email, restaurant"
              className="h-11 w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-3 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
            />
          </label>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                  <th className="py-3 pr-4">Business</th>
                  <th className="py-3 pr-4">Contact</th>
                  <th className="py-3 pr-4">Restaurants</th>
                  <th className="py-3 pr-4">Staff</th>
                  <th className="py-3 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((item) => (
                  <tr key={item.id || item.adminId || item.email} className="border-b border-neutral-100 align-top dark:border-neutral-800">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-neutral-950 dark:text-white">{item.businessName || 'Business'}</p>
                      <p className="text-xs text-neutral-500">{item.adminId || item.id || '-'}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-neutral-800 dark:text-neutral-100">{item.email || '-'}</p>
                      <p className="text-xs text-neutral-500">{item.mobile || '-'}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold">{item.totalRestaurants || 0}</p>
                      <p className="max-w-xs truncate text-xs text-neutral-500">
                        {Array.isArray(item.restaurantNames) && item.restaurantNames.length ? item.restaurantNames.join(', ') : '-'}
                      </p>
                    </td>
                    <td className="py-3 pr-4">{item.totalStaff || 0}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.isActive === false ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
                        {item.isActive === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 ? (
              <p className="py-8 text-center text-sm font-semibold text-neutral-500">No EFNBMMS records found.</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
