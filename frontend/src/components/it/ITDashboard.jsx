import React, { useEffect, useMemo, useState } from 'react';
import { itApi } from '../../services/it';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../common/PortalHeader';

const SECTION_META = {
  dashboard: { title: 'IT Overview Dashboard', subtitle: 'Infrastructure, security, and operations command center', icon: 'dashboard' },
  monitoring: { title: 'System Monitoring', subtitle: 'Server health, uptime, CPU/memory, traffic and incident posture', icon: 'monitor_heart' },
  'user-access': { title: 'User Access Management', subtitle: 'Provisioning, temporary access, and account control', icon: 'manage_accounts' },
  assets: { title: 'Asset Management', subtitle: 'Hardware/software inventory with assignment tracking', icon: 'inventory_2' },
  'network-infra': { title: 'Network & Infrastructure', subtitle: 'Servers, cloud infrastructure, and API health', icon: 'dns' },
  'security-logs': { title: 'Security & Threat Logs', subtitle: 'Threat detection, login tracking, and IP risk events', icon: 'shield' },
  'audit-logs': { title: 'Data & System Logs', subtitle: 'Audit trails across all modules', icon: 'history' },
  deployments: { title: 'DevOps & Deployment', subtitle: 'CI/CD status, releases, and project deployment tracking', icon: 'deployed_code' },
  support: { title: 'Support & Tickets', subtitle: 'Issue tracking, priority, SLA and support workflow', icon: 'support_agent' },
  backup: { title: 'Backup & Recovery', subtitle: 'Backup schedules, restore points, and recovery readiness', icon: 'backup' },
  settings: { title: 'IT Settings', subtitle: 'Module preferences and operational controls', icon: 'settings' },
};

const cardClass = 'rounded-xl border border-neutral-800 bg-neutral-900 p-4';

const KeyValueGrid = ({ items }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {items.map(([k, v, icon]) => (
      <article key={k} className={cardClass}>
        <span className="material-symbols-outlined text-cyan-300">{icon || 'monitoring'}</span>
        <p className="mt-2 text-2xl font-black text-white">{v}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{k}</p>
      </article>
    ))}
  </div>
);

const ITDashboard = ({ activeSection }) => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({});

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError('');
      try {
        const [overview, monitoring, userAccess, infra, security, logs, deployments, events, assets, networkInfra, threatLogs, devopsCicd, backupRecovery, supportTickets, auditLogs] = await Promise.all([
          itApi.getSystemOverview(token),
          itApi.getMonitoring(token),
          itApi.getUserAccessSummary(token),
          itApi.getInfrastructureSummary(token),
          itApi.getSecurityCompliance(token),
          itApi.getSystemLogs(token),
          itApi.getDeployments(token),
          itApi.getEventIntegrations(token),
          itApi.getAssets(token, { page: 1, limit: 10 }),
          itApi.getNetworkInfra(token),
          itApi.getThreatLogs(token, { page: 1, limit: 10 }),
          itApi.getDevopsCicd(token),
          itApi.getBackupRecovery(token),
          itApi.getSupportTickets(token, { page: 1, limit: 10 }),
          itApi.getAuditLogs(token, { page: 1, limit: 10 }),
        ]);
        setData({
          overview: overview?.data || {},
          monitoring: monitoring?.data || {},
          userAccess: userAccess?.data || {},
          infra: infra?.data || {},
          security: security?.data || {},
          logs: logs?.data || {},
          deployments: deployments?.data || {},
          events: events?.data || {},
          assets: assets?.data || {},
          networkInfra: networkInfra?.data || {},
          threatLogs: threatLogs?.data || {},
          devopsCicd: devopsCicd?.data || {},
          backupRecovery: backupRecovery?.data || {},
          supportTickets: supportTickets?.data || {},
          auditLogs: auditLogs?.data || {},
        });
      } catch (err) {
        setError(err.message || 'Failed to load IT system layer data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const meta = SECTION_META[activeSection] || SECTION_META.dashboard;

  const content = useMemo(() => {
    if (activeSection === 'dashboard') {
      const o = data.overview || {};
      const m = data.monitoring?.kpis || {};
      return <KeyValueGrid items={[['Active Systems', m.activeSystems || 0, 'dns'], ['Downtime (min)', m.downtimeMinutes || 0, 'timer_off'], ['Tickets Open', m.ticketsOpen || 0, 'support'], ['Security Alerts', m.securityAlerts || o.securityAlerts || 0, 'warning'], ['Server Load %', m.serverLoad || 0, 'memory']]} />;
    }
    if (activeSection === 'monitoring') {
      const m = data.monitoring || {};
      return <div className="space-y-3"><KeyValueGrid items={[['Uptime %', (m.trends?.uptime || [0]).slice(-1)[0], 'monitoring'], ['Traffic', (m.trends?.trafficUsage || [0]).slice(-1)[0], 'network_check'], ['Ticket Trend', (m.trends?.ticketTrend || [0]).slice(-1)[0], 'timeline'], ['Load %', m.kpis?.serverLoad || 0, 'speed']]} /><article className={cardClass}><p className="text-sm font-semibold text-neutral-300">Real-time Alerts</p><p className="mt-1 text-sm text-amber-300">Server down, suspicious activity, and failed login attempts stream through security event hooks.</p></article></div>;
    }
    if (activeSection === 'user-access') {
      const x = data.userAccess || {};
      return <KeyValueGrid items={[['Total Users', x.totalUsers || 0, 'group'], ['Temporary Access', x.temporaryAccess || 0, 'timer'], ['Blocked Users', x.blockedUsers || 0, 'block'], ['Role Buckets', (x.roleBreakdown || []).length, 'schema']]} />;
    }
    if (activeSection === 'assets') {
      const rows = data.assets?.items || [];
      return <div className="space-y-3">{rows.map((row) => <article key={row.id} className={cardClass}><div className="flex items-center justify-between"><p className="font-semibold text-white">{row.name}</p><span className={`rounded-full px-2 py-0.5 text-xs ${row.status === 'warning' ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'}`}>{row.status}</span></div><p className="text-sm text-neutral-400">{row.type} • {row.assignedTo}</p></article>)}</div>;
    }
    if (activeSection === 'network-infra') {
      const h = data.infra?.serverHealth || {};
      const n = data.networkInfra || {};
      return <div className="space-y-3"><KeyValueGrid items={[['CPU %', h.cpu || 0, 'memory'], ['Memory %', h.memory || 0, 'storage'], ['DB Connections', h.dbConnections || 0, 'database'], ['API Latency (ms)', h.apiLatencyMs || 0, 'speed']]} /><article className={cardClass}><p className="text-sm font-semibold text-neutral-300">Cloud Provider</p><p className="mt-1 text-sm text-neutral-400">{n.cloud?.provider} • {n.cloud?.activeInstances} instances</p></article></div>;
    }
    if (activeSection === 'security-logs') {
      const x = data.security || {};
      const t = data.threatLogs?.items || [];
      return <div className="space-y-3"><KeyValueGrid items={[['Login Events', x.loginEvents || 0, 'login'], ['Suspicious Events', x.suspiciousEvents || 0, 'report'], ['MFA', x.mfaEnabled ? 'Enabled' : 'Disabled', 'verified_user'], ['LAW Compliance Lock', x.lawComplianceLock ? 'Enforced' : 'Off', 'gpp_good']]} /><article className={cardClass}><p className="text-sm font-semibold text-neutral-300">Recent Threat</p><p className="mt-1 text-sm text-neutral-400">{t[0]?.action || 'No threat events'}</p></article></div>;
    }
    if (activeSection === 'audit-logs') {
      const x = data.auditLogs || {};
      return <KeyValueGrid items={[['Audit Entries', x.pagination?.total || 0, 'description'], ['Recent Audit Items', (x.items || []).length, 'history'], ['Logging State', 'Active', 'check_circle'], ['Security Mode', 'Enforced', 'shield_lock']]} />;
    }
    if (activeSection === 'deployments') {
      const x = data.devopsCicd || data.deployments || {};
      return <KeyValueGrid items={[['Deployments (Month)', x.deploymentsThisMonth || 0, 'rocket_launch'], ['Latest Version', x.latestVersion || '-', 'new_releases'], ['CI/CD Status', x.ciCdStatus || 'green', 'hub'], ['Rollback Ready', x.rollbackReady ? 'Yes' : 'No', 'undo']]} />;
    }
    if (activeSection === 'support') {
      const x = data.supportTickets || {};
      return <KeyValueGrid items={[['Open Tickets', x.total || 0, 'support_agent'], ['Total Pages', x.totalPages || 1, 'table_rows'], ['Current Page', x.currentPage || 1, 'arrow_selector_tool'], ['SLA Monitor', 'Active', 'alarm']]} />;
    }
    if (activeSection === 'backup') {
      const b = data.backupRecovery || {};
      return <KeyValueGrid items={[['Backup Health', b.backupHealth || 'unknown', 'backup'], ['Last Backup', b.lastBackupAt ? 'Completed' : 'N/A', 'schedule'], ['Next Backup', b.nextBackupAt ? 'Scheduled' : 'N/A', 'event_repeat'], ['Restore Points', (b.restorePoints || []).length, 'restore_page']]} />;
    }
    if (activeSection === 'settings') {
      return <KeyValueGrid items={[['WebSocket Stream', 'Enabled', 'sensors'], ['JWT Auth', 'Enabled', 'vpn_key'], ['Pino Logs', 'Enabled', 'article'], ['Architecture', 'Microservice Ready', 'widgets']]} />;
    }
    return null;
  }, [activeSection, data]);

  return (
    <main className="min-h-screen flex-1 overflow-y-auto bg-neutral-950">
      <div className="mx-auto w-full max-w-[1680px] p-3 sm:p-4 lg:p-6 2xl:p-8">
        <PortalHeader
          title={meta.title}
          subtitle={meta.subtitle}
          user={user}
          icon={meta.icon}
          showSearch
          showNotifications
          showThemeToggle
          searchPlaceholder="Search users, logs, infra, APIs..."
        />
        <section className="mb-4 rounded-xl border border-cyan-600/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
          Event bus: <span className="font-semibold">employee.created</span>, <span className="font-semibold">access.requested</span>, <span className="font-semibold">fraud.detected</span>, <span className="font-semibold">employee.terminated</span>
        </section>
        {loading ? <div className="h-40 animate-pulse rounded-xl bg-neutral-900" /> : error ? <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-200">{error}</div> : content}
      </div>
    </main>
  );
};

export default ITDashboard;
