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
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
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

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      const searchMatch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q);
      const deptMatch = departmentFilter === 'all' || e.department === departmentFilter;
      return searchMatch && deptMatch;
    });
  }, [employees, search, departmentFilter]);

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
          subtitle="Search employees, inspect profiles, and review department-wise distribution"
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

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employee..."
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          {departments.map((d) => (
            <option key={d} value={d}>
              {d === 'all' ? 'All Departments' : d}
            </option>
          ))}
        </select>
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
            { state: 'Active', value: activeCount },
            { state: 'Inactive', value: inactiveCount },
          ]}
          xKey="state"
          bars={[{ key: 'value', color: '#16a34a' }]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Department</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {employeesQuery.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-neutral-500">Loading employees...</td>
              </tr>
            )}
            {!employeesQuery.isLoading && filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-neutral-500">No employee found.</td>
              </tr>
            )}
            {!employeesQuery.isLoading &&
              filteredEmployees.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-sm">{e.name}</td>
                  <td className="px-4 py-3 text-sm">{e.email}</td>
                  <td className="px-4 py-3 text-sm">{e.department}</td>
                  <td className="px-4 py-3 text-sm">{e.role}</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      type="button"
                      onClick={() => setSelectedEmployee(e)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Employee Profile</h3>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-semibold dark:bg-neutral-700"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <p><span className="font-semibold">Name:</span> {selectedEmployee.name}</p>
              <p><span className="font-semibold">Email:</span> {selectedEmployee.email}</p>
              <p><span className="font-semibold">Department:</span> {selectedEmployee.department}</p>
              <p><span className="font-semibold">Role:</span> {selectedEmployee.role}</p>
              <p><span className="font-semibold">Status:</span> {selectedEmployee.isActive ? 'Active' : 'Inactive'}</p>
              <p><span className="font-semibold">Phone:</span> {selectedEmployee.phone}</p>
              <p className="md:col-span-2"><span className="font-semibold">Address:</span> {selectedEmployee.address}</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
};

export default CEOEmployees;
