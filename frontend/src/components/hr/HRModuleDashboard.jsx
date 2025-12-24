import React, { useEffect, useMemo, useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import Button from '../common/Button';
import hrModuleConfig from './hrModuleConfig';

const getValue = (item, path) => {
  if (!path) return '';
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), item);
};

const formatValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  const maybeDate = Date.parse(value);
  if (!Number.isNaN(maybeDate) && typeof value === 'string') {
    return new Date(maybeDate).toLocaleDateString();
  }
  return String(value);
};

const buildStatusCounts = (items) => {
  return items.reduce(
    (acc, item) => {
      const status = (item?.status || '').toString().toLowerCase();
      if (status) {
        acc.status[status] = (acc.status[status] || 0) + 1;
      }
      if (typeof item?.isActive === 'boolean') {
        if (item.isActive) acc.active += 1;
        else acc.inactive += 1;
      }
      return acc;
    },
    { status: {}, active: 0, inactive: 0 }
  );
};

const HRModuleDashboard = () => {
  const { key } = useParams();
  const moduleConfig = hrModuleConfig[key];
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchModule = async () => {
      if (!moduleConfig?.endpoint) return;
      try {
        setLoading(true);
        const res = await apiClient.get(moduleConfig.endpoint, token);
        const data =
          (moduleConfig.dataKey && res?.data?.[moduleConfig.dataKey]) ||
          res?.data?.items ||
          res?.data?.records ||
          res?.data?.data ||
          res?.data ||
          res;
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchModule();
    }
  }, [token, moduleConfig]);

  const counts = useMemo(() => buildStatusCounts(items), [items]);

  const kpis = useMemo(() => {
    const total = items.length;
    if (moduleConfig?.kpiType === 'active') {
      return [
        { title: 'Total Records', value: total, icon: 'summarize', colorScheme: 'blue' },
        { title: 'Active', value: counts.active, icon: 'verified_user', colorScheme: 'green' },
        { title: 'Inactive', value: counts.inactive, icon: 'report_problem', colorScheme: 'orange' },
      ];
    }
    if (moduleConfig?.kpiType === 'status') {
      const pending = counts.status.pending || counts.status.open || 0;
      const approved = counts.status.approved || counts.status.completed || 0;
      const rejected = counts.status.rejected || counts.status.cancelled || 0;
      return [
        { title: 'Total Records', value: total, icon: 'summarize', colorScheme: 'blue' },
        { title: 'Pending/Open', value: pending, icon: 'pending', colorScheme: 'orange' },
        { title: 'Approved/Closed', value: approved || rejected, icon: 'check_circle', colorScheme: 'green' },
      ];
    }
    return [{ title: 'Total Records', value: total, icon: 'summarize', colorScheme: 'blue' }];
  }, [moduleConfig, items, counts]);

  if (!moduleConfig) {
    return (
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Module not found</h1>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="dot-spinner">
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400">Loading module...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
        <div className="flex h-full items-center justify-center">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-red-600">error</span>
              <div>
                <p className="font-semibold text-red-900 dark:text-red-200">Error Loading Module</p>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
            <Button variant="danger" size="sm" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
      <div className="mx-auto max-w-6xl p-5 md:p-6">
        <PortalHeader
          title={moduleConfig.title}
          subtitle={moduleConfig.subtitle}
          user={user}
          icon={moduleConfig.icon}
          showSearch={true}
          showNotifications={true}
          showThemeToggle={true}
          searchPlaceholder={`Search ${moduleConfig.title.toLowerCase()}...`}
        >
          <NavLink to="/hr/system">
            <Button variant="secondary" size="sm">
              Back to HR System
            </Button>
          </NavLink>
        </PortalHeader>

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          {kpis.map((kpi) => (
            <KPICard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              icon={kpi.icon}
              colorScheme={kpi.colorScheme}
            />
          ))}
        </section>

        <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <h2 className="mb-4 text-lg font-bold text-neutral-800 dark:text-neutral-100">Recent Records</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  {moduleConfig.columns.map((column) => (
                    <th key={column.label} className="px-3 py-2 font-semibold text-neutral-600 dark:text-neutral-400">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 8).map((item) => (
                  <tr key={item._id} className="border-b border-neutral-100 dark:border-neutral-800">
                    {moduleConfig.columns.map((column) => (
                      <td key={`${item._id}-${column.label}`} className="px-3 py-2 text-neutral-800 dark:text-neutral-100">
                        {formatValue(getValue(item, column.path))}
                      </td>
                    ))}
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan={moduleConfig.columns.length} className="px-3 py-6 text-center text-sm text-neutral-500">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

export default HRModuleDashboard;
