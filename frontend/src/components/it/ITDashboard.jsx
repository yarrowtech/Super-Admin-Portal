import React, { useEffect, useMemo, useState } from 'react';
import { itApi } from '../../services/it';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../common/PortalHeader';

const SECTION_META = {
  dashboard: { title: 'System Overview', subtitle: 'Independent IT control layer with cross-module visibility', icon: 'dashboard' },
  'user-access': { title: 'User Access Management', subtitle: 'Provisioning, temporary access, and account control', icon: 'manage_accounts' },
  'roles-permissions': { title: 'Role & Permission Engine', subtitle: 'Granular RBAC across modules and features', icon: 'admin_panel_settings' },
  'api-integrations': { title: 'API & Integrations', subtitle: 'Internal APIs, keys, tokens, and webhook orchestration', icon: 'integration_instructions' },
  infrastructure: { title: 'Infrastructure Monitoring', subtitle: 'Server, database, and API performance posture', icon: 'dns' },
  'security-logs': { title: 'Security & Compliance', subtitle: 'Login activity, suspicious behavior, and enforcement', icon: 'security' },
  'audit-logs': { title: 'Data & System Logs', subtitle: 'Audit trails across all modules', icon: 'history' },
  'access-requests': { title: 'Access Request Workflow', subtitle: 'Employee -> IT -> LAW -> Admin approval chain', icon: 'approval' },
  deployments: { title: 'Deployment & DevOps', subtitle: 'Version control, releases, feature flags, rollback posture', icon: 'deployed_code' },
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
        const [overview, userAccess, roles, infra, api, security, logs, requests, deployments, events] = await Promise.all([
          itApi.getSystemOverview(token),
          itApi.getUserAccessSummary(token),
          itApi.getRolesPermissions(token),
          itApi.getInfrastructureSummary(token),
          itApi.getApiIntegrations(token),
          itApi.getSecurityCompliance(token),
          itApi.getSystemLogs(token),
          itApi.getAccessRequests(token),
          itApi.getDeployments(token),
          itApi.getEventIntegrations(token),
        ]);
        setData({
          overview: overview?.data || {},
          userAccess: userAccess?.data || {},
          roles: roles?.data || {},
          infra: infra?.data || {},
          api: api?.data || {},
          security: security?.data || {},
          logs: logs?.data || {},
          requests: requests?.data || {},
          deployments: deployments?.data || {},
          events: events?.data || {},
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
      return <KeyValueGrid items={[['Active Users', o.activeUsers || 0, 'groups'], ['Active Sessions', o.activeSessions || 0, 'devices'], ['Server Status', o.serverStatus || '-', 'dns'], ['API Health', o.apiHealth || '-', 'api'], ['Security Alerts', o.securityAlerts || 0, 'warning']]} />;
    }
    if (activeSection === 'user-access') {
      const x = data.userAccess || {};
      return <KeyValueGrid items={[['Total Users', x.totalUsers || 0, 'group'], ['Temporary Access', x.temporaryAccess || 0, 'timer'], ['Blocked Users', x.blockedUsers || 0, 'block'], ['Role Buckets', (x.roleBreakdown || []).length, 'schema']]} />;
    }
    if (activeSection === 'roles-permissions') {
      const roles = data.roles?.roles || [];
      return <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{roles.map((r) => <article key={r.role} className={cardClass}><p className="text-lg font-bold text-white">{r.role}</p><p className="text-sm text-neutral-400">Users: {r.users}</p><p className="text-sm text-neutral-400">Permission count: {r.permissionCount}</p></article>)}</div>;
    }
    if (activeSection === 'api-integrations') {
      const x = data.api || {};
      return <div className="space-y-3"><KeyValueGrid items={[['Internal APIs', (x.internalApis || []).length, 'hub'], ['Webhook Events', (x.webhooks || []).length, 'webhook'], ['Active API Keys', x.apiKeys?.active || 0, 'key'], ['Expiring Keys', x.apiKeys?.expiringSoon || 0, 'warning']]} /><article className={cardClass}><p className="text-sm font-semibold text-neutral-300">Event Hooks</p><p className="mt-2 text-sm text-neutral-400">{(x.webhooks || []).join(' | ') || 'No hooks configured'}</p></article></div>;
    }
    if (activeSection === 'infrastructure') {
      const h = data.infra?.serverHealth || {};
      return <KeyValueGrid items={[['CPU %', h.cpu || 0, 'memory'], ['Memory %', h.memory || 0, 'storage'], ['DB Connections', h.dbConnections || 0, 'database'], ['API Latency (ms)', h.apiLatencyMs || 0, 'speed']]} />;
    }
    if (activeSection === 'security-logs') {
      const x = data.security || {};
      return <KeyValueGrid items={[['Login Events', x.loginEvents || 0, 'login'], ['Suspicious Events', x.suspiciousEvents || 0, 'report'], ['MFA', x.mfaEnabled ? 'Enabled' : 'Disabled', 'verified_user'], ['LAW Compliance Lock', x.lawComplianceLock ? 'Enforced' : 'Off', 'gpp_good']]} />;
    }
    if (activeSection === 'audit-logs') {
      const x = data.logs || {};
      return <KeyValueGrid items={[['Audit Entries', x.auditEntries || 0, 'description'], ['Activity Entries', x.activityEntries || 0, 'event_note'], ['Recent Audit Items', (x.recentAudit || []).length, 'history'], ['Logging State', 'Active', 'check_circle']]} />;
    }
    if (activeSection === 'access-requests') {
      const x = data.requests || {};
      return <div className="space-y-3"><KeyValueGrid items={[['Pending Requests', x.pendingRequests || 0, 'hourglass'], ['Workflow Steps', (x.workflow || []).length, 'alt_route'], ['LAW Gate', 'Mandatory', 'policy'], ['Admin Approval', 'Required', 'approval']]} /><article className={cardClass}><p className="text-sm font-semibold text-neutral-300">Compliance Rule</p><p className="mt-1 text-sm text-neutral-400">{x.complianceRule}</p></article></div>;
    }
    if (activeSection === 'deployments') {
      const x = data.deployments || {};
      return <KeyValueGrid items={[['Deployments (Month)', x.deploymentsThisMonth || 0, 'rocket_launch'], ['Latest Version', x.latestVersion || '-', 'new_releases'], ['Feature Flags Active', x.featureFlags?.active || 0, 'flag'], ['Rollback Ready', x.rollbackReady ? 'Yes' : 'No', 'undo']]} />;
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
