import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { ceoApi } from '../../services/ceo';

const cardClass = 'min-h-0 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';
const TEAL = '#0d9488';
const PRODUCT_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#db2777'];

const StatTile = ({ label, value, note }) => (
  <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
    <p className="text-lg font-black text-neutral-900 dark:text-neutral-100">{value}</p>
    <p className="mt-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
    {note && <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">{note}</p>}
  </div>
);

const SelectFilter = ({ label, value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="min-h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs font-semibold text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
  >
    <option value="">{label}</option>
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

const EmptyState = ({ label }) => (
  <div className="flex h-full min-h-[10rem] items-center justify-center text-xs text-neutral-400 dark:text-neutral-500">
    {label}
  </div>
);

const CEOSalesQueryAnalytics = ({ token, compact = false }) => {
  const [period, setPeriod] = useState('30d');
  const [projectCode, setProjectCode] = useState('');
  const [buyerCategory, setBuyerCategory] = useState('');
  const [location, setLocation] = useState('');
  const [teamMember, setTeamMember] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    setLoading(true);
    setError('');

    const now = new Date();
    const from = new Date(now);
    if (period === '7d') from.setDate(from.getDate() - 7);
    else if (period === '90d') from.setDate(from.getDate() - 90);
    else from.setDate(from.getDate() - 30);

    ceoApi
      .getSalesQueryAnalytics(token, {
        projectCode,
        buyerCategory,
        location,
        teamMember,
        from: from.toISOString(),
        to: now.toISOString(),
      })
      .then((response) => {
        if (!alive) return;
        setData(response?.data?.data || response?.data || null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || 'Failed to load sales query analytics.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [token, period, projectCode, buyerCategory, location, teamMember]);

  const filters = data?.filters || {};
  const summary = data?.summary || {};
  const byBuyerCategory = data?.byBuyerCategory || [];
  const byProduct = data?.byProduct || [];
  const byLocation = data?.byLocation || [];
  const byTeamMember = data?.byTeamMember || [];
  const trend = data?.trend || [];

  const productOptions = useMemo(
    () => (filters.products || []).map((p) => ({ value: p.code, label: p.name })),
    [filters.products]
  );
  const buyerCategoryOptions = useMemo(
    () => (filters.buyerCategories || []).map((c) => ({ value: c, label: c })),
    [filters.buyerCategories]
  );
  const locationOptions = useMemo(
    () => (filters.locations || []).map((l) => ({ value: l, label: l })),
    [filters.locations]
  );
  const teamMemberOptions = useMemo(
    () => (filters.teamMembers || []).map((m) => ({ value: m.userId, label: m.name })),
    [filters.teamMembers]
  );

  return (
    <section className={`rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-black text-neutral-900 dark:text-neutral-100">Sales Query Analytics</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {['7d', '30d', '90d'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={`min-h-8 rounded-lg px-2.5 text-xs font-bold uppercase transition-colors ${
                period === item
                  ? 'bg-teal-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <SelectFilter label="All Products" value={projectCode} onChange={setProjectCode} options={productOptions} />
        <SelectFilter label="All Buyer Categories" value={buyerCategory} onChange={setBuyerCategory} options={buyerCategoryOptions} />
        <SelectFilter label="All Locations" value={location} onChange={setLocation} options={locationOptions} />
        <SelectFilter label="All Team Members" value={teamMember} onChange={setTeamMember} options={teamMemberOptions} />
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <StatTile label="Total Submissions" value={summary.totalSubmissions ?? 0} />
            <StatTile label="This Week" value={summary.submissionsThisWeek ?? 0} />
            <StatTile label="Avg Quality Rating" value={`${summary.avgQualityRating ?? 0}/5`} note={`${summary.ratedSubmissions ?? 0} rated`} />
            <StatTile label="Team Strength" value={summary.reportingTeamMembers ?? 0} note="reps reporting" />
            <StatTile label="Locations Covered" value={byLocation.length} />
          </div>

          <div className={`grid grid-cols-1 ${compact ? 'gap-2' : 'gap-3'}`}>
            <article className={cardClass}>
              <h3 className="mb-1 text-[11px] font-bold uppercase text-neutral-500 dark:text-neutral-400">Submissions Trend</h3>
              <div className={compact ? 'h-[12rem]' : 'h-56'}>
                {trend.length === 0 ? (
                  <EmptyState label="No submissions in this range" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" name="Submissions" stroke={TEAL} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>

            <div className={`grid grid-cols-1 ${compact ? 'gap-2 xl:grid-cols-2' : 'gap-3 xl:grid-cols-2'}`}>
              <article className={cardClass}>
                <h3 className="mb-1 text-[11px] font-bold uppercase text-neutral-500 dark:text-neutral-400">By Buyer Category</h3>
                <div className={compact ? 'h-[13rem]' : 'h-64'}>
                  {byBuyerCategory.length === 0 ? (
                    <EmptyState label="No data" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byBuyerCategory} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Submissions" fill={TEAL} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </article>

              <article className={cardClass}>
                <h3 className="mb-1 text-[11px] font-bold uppercase text-neutral-500 dark:text-neutral-400">By Product</h3>
                <div className={compact ? 'h-[13rem]' : 'h-64'}>
                  {byProduct.length === 0 ? (
                    <EmptyState label="No data" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byProduct} dataKey="count" nameKey="product" outerRadius={compact ? 58 : 78} label={({ product, percent }) => `${product} ${(percent * 100).toFixed(0)}%`}>
                          {byProduct.map((entry, index) => (
                            <Cell key={entry.product} fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </article>

              <article className={cardClass}>
                <h3 className="mb-1 text-[11px] font-bold uppercase text-neutral-500 dark:text-neutral-400">By Location (Top 10)</h3>
                <div className={compact ? 'h-[13rem]' : 'h-64'}>
                  {byLocation.length === 0 ? (
                    <EmptyState label="No location data" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byLocation} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="location" width={90} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Submissions" fill={TEAL} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </article>

              <article className={cardClass}>
                <h3 className="mb-1 text-[11px] font-bold uppercase text-neutral-500 dark:text-neutral-400">Team Strength — Submissions by Rep</h3>
                <div className={compact ? 'h-[13rem]' : 'h-64'}>
                  {byTeamMember.length === 0 ? (
                    <EmptyState label="No submissions attributed yet" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byTeamMember} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Submissions" fill={TEAL} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </article>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default memo(CEOSalesQueryAnalytics);
