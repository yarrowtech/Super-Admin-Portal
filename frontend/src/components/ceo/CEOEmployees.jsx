import React, { useEffect, useMemo, useState } from 'react';
import { ceoApi } from '../../services/ceo';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../common/PortalHeader';
import Button from '../common/Button';
import { PieChartCard, BarChartCard } from './charts/ChartCards';
import { useQuery } from '@tanstack/react-query';

const normalizeEmployees = (payload) => {
  const base = payload?.data || payload || [];
  if (!Array.isArray(base)) return [];
  return base.map((emp) => ({
    id: emp?._id || emp?.id,
    name: [emp?.firstName, emp?.lastName].filter(Boolean).join(' ') || emp?.name || 'Unknown',
    email: emp?.email || 'N/A',
    role: emp?.role || 'N/A',
    department: emp?.department || 'Unassigned',
    isActive: emp?.isActive !== false,
    phone: emp?.phone || emp?.phoneNumber || 'N/A',
    address: emp?.address || 'N/A',
    joinedAt: emp?.createdAt || emp?.updatedAt || null,
  }));
};

const CEOEmployees = () => {
  const { token } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  const employeesQuery = useQuery({
    queryKey: ['ceo-employees-list', token, refreshTick],
    queryFn: async () => normalizeEmployees((await ceoApi.getAllEmployees(token))?.data || {}),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    setEmployees(employeesQuery.data || []);
    setError(employeesQuery.error?.message || '');
  }, [employeesQuery.data, employeesQuery.error]);

  const departments = useMemo(
    () => ['all', ...new Set(employees.map((e) => e.department).filter(Boolean))],
    [employees]
  );

  const departmentSummary = useMemo(() => {
    return departments
      .filter((d) => d !== 'all')
      .map((d) => ({
        department: d,
        count: employees.filter((e) => e.department === d).length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [departments, employees]);

  const activeCount = useMemo(() => employees.filter((e) => e.isActive).length, [employees]);
  const inactiveCount = useMemo(() => employees.length - activeCount, [employees, activeCount]);

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Employees"
          subtitle="Headcount and department-wise distribution"
          icon="groups"
          showSearch={false}
          showNotifications
          showThemeToggle
        >
          <Button type="button" variant="ghost" onClick={() => setRefreshTick((x) => x + 1)}>Refresh</Button>
        </PortalHeader>

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Total Employees</p>
          <p className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{employees.length}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-900/40 dark:bg-green-900/20">
          <p className="text-xs uppercase tracking-wide text-green-700 dark:text-green-300">Active</p>
          <p className="text-2xl font-black text-green-700 dark:text-green-200">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-300 bg-neutral-100 p-3 dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-xs uppercase tracking-wide text-neutral-700 dark:text-neutral-300">Inactive</p>
          <p className="text-2xl font-black text-neutral-800 dark:text-neutral-100">{inactiveCount}</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {departmentSummary.slice(0, 4).map((d) => (
          <div key={d.department} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-xs uppercase tracking-wide text-neutral-500">{d.department}</p>
            <p className="text-xl font-bold">{d.count}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PieChartCard
          title="Employees by Department"
          data={departmentSummary.map((d) => ({ department: d.department, value: d.count }))}
          nameKey="department"
          valueKey="value"
        />
        <BarChartCard
          title="Active vs Inactive Employees"
          data={[
            { state: 'Active', employees: activeCount },
            { state: 'Inactive', employees: inactiveCount },
          ]}
          xKey="state"
          bars={[{ key: 'employees', label: 'Employees', color: '#16a34a' }]}
        />
      </div>

      </div>
    </main>
  );
};

export default CEOEmployees;
