import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
export { default as MediaDepartmentPortal } from '../media/MediaPortal';

/* ─── Shared primitives ───────────────────────────────────────────────── */

const KPI = ({ icon, label, value, sub, color = 'text-primary' }) => (
  <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
    <div className="flex items-center gap-2 mb-1">
      <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
    </div>
    <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
    {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
  </div>
);

const Section = ({ title, icon, children }) => (
  <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
    <div className="flex items-center gap-2 border-b border-neutral-100 p-4 dark:border-neutral-800">
      <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const EmptyState = ({ icon, text }) => (
  <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
    <span className="material-symbols-outlined text-4xl mb-2">{icon}</span>
    <p className="text-sm">{text}</p>
  </div>
);

const Badge = ({ label, color = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300' }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>
);

const stageColor = (stage = '') => {
  const s = stage.toLowerCase();
  if (s.includes('won') || s.includes('closed')) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
  if (s.includes('lost')) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
  if (s.includes('negotiat') || s.includes('proposal')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  if (s.includes('prospect') || s.includes('lead')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
};

/* ─── Sales Portal ──────────────────────────────────────────────────────── */

const SALES_WORKFLOW = [
  { step: 1, label: 'Lead Captured',    icon: 'person_add',        color: 'text-blue-600' },
  { step: 2, label: 'Qualified',        icon: 'verified_user',     color: 'text-violet-600' },
  { step: 3, label: 'Proposal Sent',    icon: 'send',              color: 'text-amber-600' },
  { step: 4, label: 'Negotiation',      icon: 'handshake',         color: 'text-orange-600' },
  { step: 5, label: 'Deal Closed',      icon: 'task_alt',          color: 'text-green-600' },
];

export const SalesDepartmentPortal = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    departmentApi.getSalesDashboard(token)
      .then(res => setData(res?.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const pipeline = data?.pipelineByStage || [];
  const recentLeads = data?.recentLeads || [];
  const targets = data?.targets || [];
  const totalLeads = data?.totalLeads ?? pipeline.reduce((s, p) => s + (p.count || 0), 0);
  const pipelineValue = data?.totalPipelineValue ?? pipeline.reduce((s, p) => s + (p.value || 0), 0);
  const wonDeals = data?.wonDeals ?? pipeline.find(p => p.stage?.toLowerCase().includes('won'))?.count ?? 0;
  const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Sales Dashboard</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Pipeline, leads and growth metrics</p>
      </div>

      {/* Workflow steps */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-3">Sales Workflow</p>
        <div className="flex items-center gap-1 overflow-x-auto">
          {SALES_WORKFLOW.map((s, i) => (
            <React.Fragment key={s.step}>
              <div className="flex shrink-0 flex-col items-center gap-1 text-center px-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-neutral-50 border-2 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 ${s.color}`}>
                  <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
                </div>
                <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 max-w-16 leading-tight">{s.label}</span>
              </div>
              {i < SALES_WORKFLOW.length - 1 && (
                <div className="h-0.5 w-6 shrink-0 bg-neutral-200 dark:bg-neutral-700" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI icon="person"          label="Total Leads"      value={totalLeads}                         color="text-blue-600 dark:text-blue-400" />
        <KPI icon="currency_rupee"  label="Pipeline Value"   value={`₹${Number(pipelineValue).toLocaleString('en-IN')}`} color="text-green-600 dark:text-green-400" />
        <KPI icon="task_alt"        label="Won Deals"        value={wonDeals}                           color="text-emerald-600 dark:text-emerald-400" />
        <KPI icon="percent"         label="Conversion"       value={`${conversionRate}%`}               color="text-violet-600 dark:text-violet-400" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pipeline by stage */}
        <Section title="Pipeline by Stage" icon="bar_chart">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-neutral-400">
              <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
            </div>
          ) : pipeline.length === 0 ? (
            <EmptyState icon="analytics" text="No pipeline data yet." />
          ) : (
            <div className="space-y-2">
              {pipeline.map((stage, i) => {
                const max = Math.max(...pipeline.map(p => p.value || p.count || 0), 1);
                const current = stage.value || stage.count || 0;
                const pct = Math.round((current / max) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge label={stage.stage || stage.name || `Stage ${i + 1}`} color={stageColor(stage.stage || '')} />
                        <span className="text-xs text-neutral-500">{stage.count || 0} deals</span>
                      </div>
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        ₹{Number(stage.value || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Recent leads */}
        <Section title="Recent Leads" icon="person_search">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-neutral-400">
              <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
            </div>
          ) : recentLeads.length === 0 ? (
            <EmptyState icon="person_off" text="No recent leads." />
          ) : (
            <div className="space-y-2">
              {recentLeads.slice(0, 8).map((lead, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {lead.name || lead.companyName || lead.email || `Lead #${i + 1}`}
                    </p>
                    {lead.email && <p className="text-xs text-neutral-500">{lead.email}</p>}
                  </div>
                  <Badge label={lead.stage || lead.status || 'New'} color={stageColor(lead.stage || lead.status || '')} />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Sales targets */}
        {targets.length > 0 && (
          <Section title="Sales Targets" icon="flag">
            <div className="space-y-3">
              {targets.map((t, i) => {
                const pct = t.target > 0 ? Math.min(100, Math.round((t.achieved / t.target) * 100)) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t.label || t.name || `Target ${i + 1}`}</span>
                      <span className="text-xs font-semibold text-primary">{pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mt-0.5">
                      <span>Achieved: {t.achieved ?? 0}</span>
                      <span>Target: {t.target ?? 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Performance summary */}
        <Section title="Performance Summary" icon="trending_up">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Avg Deal Size',   value: data?.avgDealSize   ? `₹${Number(data.avgDealSize).toLocaleString('en-IN')}` : '—' },
              { label: 'Win Rate',        value: data?.winRate        ? `${data.winRate}%` : `${conversionRate}%` },
              { label: 'Sales Cycle',     value: data?.avgSalesCycle  ? `${data.avgSalesCycle} days` : '—' },
              { label: 'Active Reps',     value: data?.activeReps     ?? '—' },
            ].map(m => (
              <div key={m.label} className="rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{m.label}</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
};

/* ─── Research Portal ───────────────────────────────────────────────────── */

const RESEARCH_WORKFLOW = [
  { step: 1, label: 'Problem Definition', icon: 'quiz',          color: 'text-blue-600' },
  { step: 2, label: 'Data Collection',    icon: 'database',      color: 'text-violet-600' },
  { step: 3, label: 'Analysis',           icon: 'analytics',     color: 'text-amber-600' },
  { step: 4, label: 'Review',             icon: 'rate_review',   color: 'text-orange-600' },
  { step: 5, label: 'Publication',        icon: 'publish',       color: 'text-green-600' },
];

export const ResearchDepartmentPortal = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    departmentApi.getResearchDashboard(token)
      .then(res => setData(res?.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const deptStats = data?.departmentStats || [];
  const recentRecords = data?.recentRecords || [];
  const totalRecords = data?.totalRecords ?? recentRecords.length;
  const activeProjects = data?.activeProjects ?? deptStats.reduce((s, d) => s + (d.active || d.count || 0), 0);
  const completedProjects = data?.completedProjects ?? 0;
  const teamSize = data?.teamSize ?? deptStats.length;

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Research Dashboard</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Research operations, records and analytics</p>
      </div>

      {/* Workflow */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-3">Research Workflow</p>
        <div className="flex items-center gap-1 overflow-x-auto">
          {RESEARCH_WORKFLOW.map((s, i) => (
            <React.Fragment key={s.step}>
              <div className="flex shrink-0 flex-col items-center gap-1 text-center px-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-neutral-50 border-2 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 ${s.color}`}>
                  <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
                </div>
                <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 max-w-16 leading-tight">{s.label}</span>
              </div>
              {i < RESEARCH_WORKFLOW.length - 1 && (
                <div className="h-0.5 w-6 shrink-0 bg-neutral-200 dark:bg-neutral-700" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI icon="folder_open"   label="Total Records"    value={totalRecords}        color="text-blue-600 dark:text-blue-400" />
        <KPI icon="play_circle"   label="Active Projects"  value={activeProjects}      color="text-amber-600 dark:text-amber-400" />
        <KPI icon="task_alt"      label="Completed"        value={completedProjects}   color="text-green-600 dark:text-green-400" />
        <KPI icon="group"         label="Departments"      value={teamSize}            color="text-violet-600 dark:text-violet-400" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Department breakdown */}
        <Section title="Department Breakdown" icon="apartment">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-neutral-400">
              <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
            </div>
          ) : deptStats.length === 0 ? (
            <EmptyState icon="domain_disabled" text="No department data available." />
          ) : (
            <div className="space-y-2">
              {deptStats.map((dept, i) => {
                const max = Math.max(...deptStats.map(d => d.count || d.records || 0), 1);
                const count = dept.count || dept.records || 0;
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 capitalize">
                        {dept.department || dept.name || `Dept ${i + 1}`}
                      </span>
                      <span className="text-xs text-neutral-500">{count} records</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Recent records */}
        <Section title="Recent Records" icon="history">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-neutral-400">
              <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
            </div>
          ) : recentRecords.length === 0 ? (
            <EmptyState icon="folder_off" text="No recent records." />
          ) : (
            <div className="space-y-2">
              {recentRecords.slice(0, 8).map((rec, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {rec.title || rec.name || `Record #${i + 1}`}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {rec.department || rec.category || ''}{rec.createdAt ? ` · ${new Date(rec.createdAt).toLocaleDateString('en-IN')}` : ''}
                    </p>
                  </div>
                  <Badge
                    label={rec.status || 'Active'}
                    color={rec.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}
                  />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Research highlights */}
        <Section title="Research Highlights" icon="lightbulb">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Published Papers', value: data?.publishedPapers  ?? '—' },
              { label: 'Ongoing Studies',  value: data?.ongoingStudies   ?? activeProjects },
              { label: 'Data Sources',     value: data?.dataSources      ?? '—' },
              { label: 'Collaborators',    value: data?.collaborators    ?? '—' },
            ].map(m => (
              <div key={m.label} className="rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{m.label}</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Activity feed */}
        {(data?.activityFeed || []).length > 0 && (
          <Section title="Activity Feed" icon="timeline">
            <div className="space-y-2">
              {(data.activityFeed || []).slice(0, 6).map((act, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="material-symbols-outlined text-[16px] text-primary mt-0.5 shrink-0">circle</span>
                  <div>
                    <p className="text-neutral-800 dark:text-neutral-200">{act.message || act.action || act.text}</p>
                    {act.createdAt && <p className="text-xs text-neutral-400">{new Date(act.createdAt).toLocaleDateString('en-IN')}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </main>
  );
};
