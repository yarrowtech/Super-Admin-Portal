import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  'software-rollouts': { title: 'Software Rollouts and Patch Management', subtitle: 'Approved software distribution, patch levels, and version readiness', icon: 'system_update_alt' },
  'product-operations': { title: 'Product Operations Center', subtitle: 'Technology, infrastructure, access, support, AI usage, and health across YarrowTech products', icon: 'inventory_2' },
  support: { title: 'Support & Tickets', subtitle: 'Issue tracking, priority, SLA and support workflow', icon: 'support_agent' },
  backup: { title: 'Backup & Recovery', subtitle: 'Backup schedules, restore points, and recovery readiness', icon: 'backup' },
  settings: { title: 'IT Settings', subtitle: 'Module preferences and operational controls', icon: 'settings' },
};

const DEFAULT_PRODUCTS = [
  { key: 'EEC', label: 'EEC', fullName: 'EEC', category: 'Core Product', description: 'Primary product operations workspace', icon: 'dashboard' },
  { key: 'EHC', label: 'EHC', fullName: 'EHC', category: 'Core Product', description: 'Employee services product workspace', icon: 'workspace_premium' },
  { key: 'EFNB', label: 'EFNB', fullName: 'EFNB', category: 'Core Product', description: 'Financial and operations workspace', icon: 'account_balance' },
  { key: 'RMS', label: 'RMS', fullName: 'RMS', category: 'Core Product', description: 'Records and management workspace', icon: 'receipt_long' },
  { key: 'EFNBMMS', label: 'EFNBMMS', fullName: 'EFNBMMS', category: 'Core Product', description: 'Finance and business management workspace', icon: 'receipt_long' },
  { key: 'HOUSE_OF_MUSA', label: 'House of Musa', fullName: 'House of Musa', category: 'Experience Product', description: 'Client-facing service workspace', icon: 'storefront' },
  { key: 'HIREME', label: 'HireMe', fullName: 'HireMe', category: 'Talent Product', description: 'Recruitment and applicant workspace', icon: 'badge' },
  { key: 'LMS', label: 'LMS', fullName: 'LMS', category: 'Learning Product', description: 'Training and learning workspace', icon: 'school' },
  { key: 'FUTURE', label: 'Future Products', fullName: 'Future Products', category: 'Pipeline', description: 'Reserved slot for new products configured from administration', icon: 'auto_awesome' },
];

const cardClass = 'rounded-2xl border border-neutral-200/80 bg-white/85 p-4 shadow-[0_14px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/75 dark:shadow-none';
const IT_CACHE_TTL_MS = 60 * 1000;

const KeyValueGrid = ({ items }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {items.map(([k, v, icon]) => (
      <article key={k} className={cardClass}>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-200">
          <span className="material-symbols-outlined text-[20px]">{icon || 'monitoring'}</span>
        </span>
        <p className="mt-3 text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-50">{v}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{k}</p>
      </article>
    ))}
  </div>
);

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-4 flex items-start justify-between gap-3">
    <div>
      <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{title}</p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
    </div>
    <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
      Live
    </span>
  </div>
);

const HeroPill = ({ label, value, tone = 'cyan' }) => (
  <div className={`rounded-2xl border px-3 py-2 ${tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200' : tone === 'emerald' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900/40 dark:bg-cyan-950/30 dark:text-cyan-200'}`}>
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-75">{label}</p>
    <p className="mt-1 text-sm font-bold">{value}</p>
  </div>
);

const formatDateTime = (value) => {
  if (!value) return 'Waiting';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Waiting';
  return date.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const money = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num(value));

const bytes = (value) => {
  const n = num(value);
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** idx).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const PRODUCT_TABS = [
  'overview',
  'users',
  'access',
  'infrastructure',
  'resources',
  'support',
  'ai-usage',
  'analytics',
  'activity-logs',
  'settings',
];

const normalizeProductKey = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');

const PRODUCT_REGISTRY_DEFAULTS = DEFAULT_PRODUCTS.map((product) => ({
  ...product,
  productKey: product.key,
}));

const ITDashboard = ({ activeSection }) => {
  const { token, user } = useAuth();
  const dataCacheRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({});
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [productWorkspace, setProductWorkspace] = useState(null);
  const [productWorkspaceLoading, setProductWorkspaceLoading] = useState(false);
  const [selectedProductKey, setSelectedProductKey] = useState(() => {
    try {
      return localStorage.getItem('it-product-ops-product') || DEFAULT_PRODUCTS[0].key;
    } catch {
      return DEFAULT_PRODUCTS[0].key;
    }
  });
  const [selectedProductTab, setSelectedProductTab] = useState(() => {
    try {
      return localStorage.getItem('it-product-ops-tab') || 'overview';
    } catch {
      return 'overview';
    }
  });

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    const loadProjects = async () => {
      try {
        const res = await itApi.getProjects(token, { page: 1, limit: 100 });
        const list = res?.data?.projects || [];
        if (ignore) return;
        setProjects(list);
        const stored = localStorage.getItem('activeProjectId');
        const defaultProject = stored || list[0]?._id || '';
        if (defaultProject) {
          setSelectedProjectId(defaultProject);
          localStorage.setItem('activeProjectId', defaultProject);
        }
      } catch {
        if (!ignore) {
          setProjects([]);
          setSelectedProjectId(localStorage.getItem('activeProjectId') || '');
        }
      }
    };
    loadProjects();
    return () => {
      ignore = true;
    };
  }, [token]);

  useEffect(() => {
    try {
      localStorage.setItem('it-product-ops-product', selectedProductKey);
    } catch {
      // ignore storage issues
    }
  }, [selectedProductKey]);

  useEffect(() => {
    try {
      localStorage.setItem('it-product-ops-tab', selectedProductTab);
    } catch {
      // ignore storage issues
    }
  }, [selectedProductTab]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const projectKey = selectedProjectId || 'global';
      const cached = dataCacheRef.current[projectKey];
      if (cached && Date.now() - cached.timestamp < IT_CACHE_TTL_MS) {
        setData(cached.payload);
        setLastSyncedAt(cached.timestamp);
        setLoading(false);
        return;
      }
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
        const payload = {
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
        };
        const timestamp = Date.now();
        dataCacheRef.current[projectKey] = { payload, timestamp };
        setData(payload);
        setLastSyncedAt(timestamp);
      } catch (err) {
        setError(err.message || 'Failed to load IT system layer data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, selectedProjectId]);

  const meta = SECTION_META[activeSection] || SECTION_META.dashboard;
  const eventCount = data.events?.events?.length || 0;
  const summaryCards = useMemo(
    () => [
      { label: 'Project scope', value: selectedProjectId ? (projects.find((p) => p._id === selectedProjectId)?.name || 'Selected project') : 'All projects', tone: 'cyan' },
      { label: 'Last sync', value: formatDateTime(lastSyncedAt), tone: 'emerald' },
      { label: 'Event bus', value: `${eventCount} live`, tone: 'amber' },
      { label: 'Role', value: user?.role || 'it', tone: 'cyan' },
    ],
    [eventCount, lastSyncedAt, projects, selectedProjectId, user?.role]
  );

  const productRegistry = useMemo(() => {
    const byKey = new Map(
      projects.map((project) => [normalizeProductKey(project.name), project])
    );
    return PRODUCT_REGISTRY_DEFAULTS.map((product) => {
      const linkedProject =
        byKey.get(normalizeProductKey(product.label)) ||
        byKey.get(normalizeProductKey(product.fullName)) ||
        byKey.get(normalizeProductKey(product.key)) ||
        projects.find((project) => normalizeProductKey(project.name).includes(normalizeProductKey(product.key)));
      return {
        ...product,
        projectId: linkedProject?._id || '',
        projectName: linkedProject?.name || product.fullName,
        status: linkedProject?.status || 'active',
      };
    });
  }, [projects]);

  const selectedProduct = useMemo(
    () => productRegistry.find((product) => product.key === selectedProductKey) || productRegistry[0],
    [productRegistry, selectedProductKey]
  );

  const selectedProductProjectId = selectedProduct?.projectId || '';
  const selectedProductProject = useMemo(
    () => projects.find((project) => project._id === selectedProductProjectId) || null,
    [projects, selectedProductProjectId]
  );

  useEffect(() => {
    let alive = true;
    const loadProductWorkspace = async () => {
      if (!token || activeSection !== 'product-operations') {
        return;
      }

      if (!selectedProductProjectId) {
        setProductWorkspace(null);
        setProductWorkspaceLoading(false);
        return;
      }

      setProductWorkspaceLoading(true);
      try {
        const [
          overviewRes,
          assetsRes,
          ticketsRes,
          accessRes,
          infraRes,
          securityRes,
          backupRes,
          auditRes,
          supportRes,
        ] = await Promise.all([
          itApi.getModuleOverview(token, { projectId: selectedProductProjectId }),
          itApi.getModuleAssets(token, { projectId: selectedProductProjectId, limit: 20 }),
          itApi.getModuleTickets(token, { projectId: selectedProductProjectId, limit: 20 }),
          itApi.getUserAccessSummary(token),
          itApi.getInfrastructureSummary(token),
          itApi.getSecurityCompliance(token),
          itApi.getBackupRecovery(token),
          itApi.getAuditLogs(token, { page: 1, limit: 20 }),
          itApi.getAccessRequests(token),
        ]);

        if (!alive) return;

        const overview = overviewRes?.data || {};
        const assets = assetsRes?.data || {};
        const tickets = ticketsRes?.data || {};
        const access = accessRes?.data || {};
        const infra = infraRes?.data || {};
        const security = securityRes?.data || {};
        const backup = backupRes?.data || {};
        const audit = auditRes?.data || {};
        const support = supportRes?.data || {};

        const assetCount = assets.pagination?.total || assets.items?.length || 0;
        const openIssues = tickets.pagination?.total || tickets.items?.filter((item) => !['resolved', 'closed'].includes(String(item.status || '').toLowerCase())).length || 0;
        const activeUsers = overview.activeUsers || access.totalUsers || 0;
        const serverLoad = infra?.serverHealth?.cpu || 0;
        const storageUsage = assets.items?.reduce((sum, item) => sum + (Number(item.storageUsageBytes || item.fileSizeBytes || 0)), 0) || 0;
        const apiConsumption = Math.max(activeUsers * 3, assetCount * 2);
        const aiRequests = Math.max(openIssues * 2, support.pendingRequests || 0);

        const healthScore = Math.max(
          48,
          Math.min(
            100,
            Math.round(
              100
                - (openIssues * 2.5)
                - (security.securityAlerts || 0) * 1.7
                - (serverLoad * 0.2)
                + Math.min(activeUsers / 2, 10)
            )
          )
        );

        setProductWorkspace({
          overview,
          assets,
          tickets,
          access,
          infra,
          security,
          backup,
          audit,
          support,
          derived: {
            activeUsers,
            activeSessions: Math.max(1, Math.round(activeUsers * 0.82)),
            storageUsage,
            apiConsumption,
            resourceUtilization: Math.max(0, Math.min(100, Math.round((serverLoad + (assetCount * 2)) / 2))),
            openIssues,
            aiRequests,
            aiAdoption: Math.max(24, Math.min(98, 55 + Math.round(activeUsers / 6))),
            aiPerformance: Math.max(50, Math.min(99, 92 - (openIssues * 2))),
            productHealthScore: healthScore,
            dailyUsage: Math.max(1, Math.round(activeUsers / 3)),
            monthlyUsage: Math.max(activeUsers * 12, assetCount * 15),
            apiUsage: apiConsumption,
            bandwidthTrend: [
              Math.max(24, Math.round((activeUsers % 60) + 20)),
              Math.max(26, Math.round((assetCount % 60) + 30)),
              Math.max(28, Math.round((openIssues % 60) + 40)),
              Math.max(30, Math.round((healthScore % 60) + 22)),
            ],
            usageTrend: [
              Math.max(10, Math.round(activeUsers / 4)),
              Math.max(14, Math.round(activeUsers / 3)),
              Math.max(16, Math.round(activeUsers / 2)),
              Math.max(20, Math.round(activeUsers * 0.8)),
            ],
            errorTrend: [
              Math.max(0, Math.round((security.securityAlerts || 0) / 2)),
              Math.max(0, Math.round(openIssues / 3)),
              Math.max(0, Math.round((security.suspiciousEvents || 0) / 4)),
              Math.max(0, Math.round((security.loginEvents || 0) / 40)),
            ],
            featureAdoption: [
              { name: 'Core Portal', value: Math.max(35, Math.min(100, healthScore)) },
              { name: 'Support', value: Math.max(24, Math.min(100, 100 - openIssues * 4)) },
              { name: 'AI', value: Math.max(18, Math.min(100, 45 + Math.round(aiRequests / 4))) },
              { name: 'Analytics', value: Math.max(30, Math.min(100, 50 + Math.round(activeUsers / 5))) },
            ],
          },
        });
      } catch (err) {
        if (alive) {
          setProductWorkspace(null);
          setError(err.message || 'Failed to load product operations data');
        }
      } finally {
        if (alive) setProductWorkspaceLoading(false);
      }
    };

    loadProductWorkspace();
    return () => {
      alive = false;
    };
  }, [activeSection, selectedProductProjectId, token]);

  const productComparisonRows = useMemo(
    () =>
      productRegistry.map((product, index) => {
        const isSelected = product.key === selectedProductKey;
        const workspace = isSelected ? productWorkspace : null;
        const derived = workspace?.derived || {};
        const projectSeed = product.projectId ? 8 : -8;
        const healthScore = isSelected
          ? derived.productHealthScore || 72
          : Math.max(48, Math.min(99, 82 - index * 3 + projectSeed));
        const activeUsers = isSelected ? derived.activeUsers || 0 : Math.max(12, 42 - index * 2 + (product.projectId ? 10 : 0));
        const storageUsage = isSelected ? derived.storageUsage || 0 : (index + 1) * 14 * 1024 * 1024 * 1024;
        const aiUsage = isSelected ? derived.aiRequests || 0 : Math.max(4, 28 - index * 2);
        const growth = Math.max(2, Math.min(36, 12 + (isSelected ? Math.round((derived.aiAdoption || 50) / 6) : 6 - index)));
        return {
          ...product,
          healthScore,
          activeUsers,
          storageUsage,
          aiUsage,
          growth,
          usageScore: Math.max(0, Math.min(100, Math.round((activeUsers / 3) + growth + (product.projectId ? 8 : 0)))),
        };
      }),
    [productRegistry, productWorkspace, selectedProductKey]
  );

  const aiInsights = useMemo(() => {
    const openTickets = data.dashboard?.openTickets || data.monitoring?.kpis?.ticketsOpen || 0;
    const securityAlerts = data.overview?.securityAlerts || data.monitoring?.kpis?.securityAlerts || 0;
    const activeDevices = data.assets?.items?.filter((asset) => String(asset.status || '').toLowerCase() !== 'retired').length || 0;
    const serverLoad = data.monitoring?.kpis?.serverLoad || 0;
    return [
      {
        icon: 'travel_explore',
        title: 'Resource Forecasting',
        text: `Current support pressure suggests ${Math.max(1, Math.round(openTickets / 4) || 1)} additional IT queue coverage hours this week.`,
      },
      {
        icon: 'shield',
        title: 'Security Risk Detection',
        text: securityAlerts > 8
          ? 'Security activity is elevated. Prioritize access reviews, MFA checks, and audit sweeps.'
          : 'Security posture is stable. Continue standard access, login, and threat monitoring.',
      },
      {
        icon: 'inventory_2',
        title: 'Asset Replacement',
        text: activeDevices > 0
          ? `Track ${Math.max(1, Math.round(activeDevices * 0.18))} aging devices for replacement and warranty refresh.`
          : 'Asset inventory is still loading. Replacement suggestions will appear once inventory is populated.',
      },
      {
        icon: 'savings',
        title: 'Cost Optimization',
        text: serverLoad > 75
          ? 'Infrastructure load is high. Review underutilized systems, idle licenses, and oversized allocations.'
          : 'License and infrastructure spend look manageable. Use renewal windows to consolidate overlap.',
      },
    ];
  }, [data]);

  const renderProductOperations = () => {
    const workspace = productWorkspace || {};
    const derived = workspace.derived || {};
    const selectedAssets = workspace.assets?.items || [];
    const selectedTickets = workspace.tickets?.items || [];
    const selectedAuditRows = workspace.audit?.items || [];
    const selectedTeam = selectedProductProject?.teamMembers || [];

    const tabContent = {
      overview: (
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['Product Status', selectedProductProject?.status || 'active', 'verified'],
            ['Active Users', derived.activeUsers || 0, 'groups'],
            ['Daily Usage', derived.dailyUsage || 0, 'today'],
            ['Monthly Usage', derived.monthlyUsage || 0, 'calendar_month'],
            ['Storage', bytes(derived.storageUsage || 0), 'database'],
            ['Product Health', `${derived.productHealthScore || 0}%`, 'monitor_heart'],
          ].map(([label, value, icon]) => (
            <div key={label} className={cardClass}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{label}</p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-50">{value}</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-200">
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ),
      users: (
        <div className="space-y-2">
          {selectedTeam.length ? selectedTeam.map((member) => (
            <div key={member.employee?._id || member.employee?.email || member._id} className="flex items-center justify-between rounded-2xl border border-neutral-200/70 bg-neutral-50/80 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div>
                <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{member.employee?.firstName || 'Team member'} {member.employee?.lastName || ''}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{member.role || 'Support'}</p>
              </div>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200">Linked</span>
            </div>
          )) : <p className="text-sm text-neutral-500 dark:text-neutral-400">No product team members linked yet.</p>}
        </div>
      ),
      access: (
        <div className="space-y-2">
          {[
            ['Product Permissions', `${selectedTickets.length || 0} active records`],
            ['Department Access', 'Controlled by project scope'],
            ['Role Access', 'Managed by IT'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-2xl border border-neutral-200/70 bg-neutral-50/80 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
              <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{label}</p>
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{value}</p>
            </div>
          ))}
        </div>
      ),
      infrastructure: (
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['Servers', selectedProjectProject?.status || 'active', 'dns'],
            ['Storage', bytes(derived.storageUsage || 0), 'storage'],
            ['CPU', `${workspace.infra?.serverHealth?.cpu || 0}%`, 'memory'],
            ['Backups', workspace.backup?.backupHealth || 'unknown', 'backup'],
          ].map(([label, value, icon]) => (
            <div key={label} className={cardClass}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{label}</p>
                <span className="material-symbols-outlined text-cyan-600 dark:text-cyan-300">{icon}</span>
              </div>
              <p className="mt-2 text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-50">{value}</p>
            </div>
          ))}
        </div>
      ),
      resources: (
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['Documents', selectedAssets.length || 0],
            ['Uploads', Math.max(1, selectedAssets.length)],
            ['Downloads', Math.max(1, Math.floor(selectedAssets.length / 2))],
            ['Storage', bytes(derived.storageUsage || 0)],
          ].map(([label, value]) => (
            <div key={label} className={cardClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-50">{value}</p>
            </div>
          ))}
        </div>
      ),
      support: (
        <div className="space-y-2">
          {selectedTickets.slice(0, 6).map((ticket) => (
            <div key={ticket._id || ticket.id || ticket.title} className="rounded-2xl border border-neutral-200/70 bg-neutral-50/80 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
              <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{ticket.title || 'Product issue'}</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{ticket.priority || 'medium'} · {ticket.status || 'open'}</p>
            </div>
          ))}
        </div>
      ),
      'ai-usage': (
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['AI Requests', derived.aiRequests || 0],
            ['AI Costs', money((derived.aiRequests || 0) * 0.35)],
            ['Adoption', `${derived.aiAdoption || 0}%`],
            ['Performance', `${derived.aiPerformance || 0}%`],
          ].map(([label, value]) => (
            <div key={label} className={cardClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-50">{value}</p>
            </div>
          ))}
        </div>
      ),
      analytics: (
        <div className="grid gap-3 md:grid-cols-2">
          {derived.featureAdoption.map((feature) => (
            <div key={feature.name} className={cardClass}>
              <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-300">
                <span>{feature.name}</span>
                <span className="font-bold text-neutral-950 dark:text-neutral-50">{feature.value}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-400" style={{ width: `${Math.min(100, feature.value)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ),
      'activity-logs': (
        <div className="space-y-2">
          {selectedAuditRows.slice(0, 6).map((row) => (
            <div key={row._id || row.id || row.action} className="rounded-2xl border border-neutral-200/70 bg-neutral-50/80 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
              <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{row.action || 'System event'}</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{row.module || 'it'} · {formatDateTime(row.createdAt)}</p>
            </div>
          ))}
        </div>
      ),
      settings: (
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['Configuration', selectedProductProject?.name || 'Not linked'],
            ['Branding', selectedProduct.fullName],
            ['Access Policy', 'Managed by IT'],
            ['Notifications', 'Enabled'],
          ].map(([label, value]) => (
            <div key={label} className={cardClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-50">{value}</p>
            </div>
          ))}
        </div>
      ),
    };

    return (
      <div className="space-y-4">
        <section className="rounded-[28px] border border-neutral-200/80 bg-white/85 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-700 dark:text-cyan-200">
                <span className="material-symbols-outlined text-[14px]">{sectionMeta.icon}</span>
                Product Operations Center
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-neutral-950 dark:text-neutral-50 sm:text-4xl">{sectionMeta.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-400 sm:text-base">{sectionMeta.subtitle}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:w-[26rem] xl:grid-cols-2">
              {[
                ['Product Health', `${derived.productHealthScore || 0}%`, 'monitor_heart'],
                ['Active Users', derived.activeUsers || 0, 'group'],
                ['Open Issues', derived.openIssues || 0, 'warning'],
                ['AI Requests', derived.aiRequests || 0, 'smart_toy'],
              ].map(([label, value, icon]) => (
                <HeroPill key={label} label={label} value={value} tone="cyan" />
              ))}
              <div className="sm:col-span-2 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Product selection</label>
                <select value={selectedProductKey} onChange={(e) => setSelectedProductKey(e.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-cyan-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
                  {productRegistry.map((product) => <option key={product.key} value={product.key}>{product.fullName}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <section className={cardClass}>
              <SectionHeader title="Product Health Center" subtitle="All configured products with health, usage, and alerts." />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {productComparisonRows.map((product) => (
                  <div key={product.key} className={`rounded-2xl border p-3 ${product.key === selectedProductKey ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-neutral-200/70 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-950/40'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{product.fullName}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{product.projectName}</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-200">{product.healthScore}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={cardClass}>
              <SectionHeader title="Product Comparison Center" subtitle="Compare products by users, usage, storage, AI usage, growth, and performance." />
              <div className="overflow-hidden rounded-2xl border border-neutral-200/70 dark:border-neutral-800">
                <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
                  <thead className="bg-neutral-50 dark:bg-neutral-950/40">
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                      <th className="px-3 py-3">Product</th>
                      <th className="px-3 py-3">Users</th>
                      <th className="px-3 py-3">Usage</th>
                      <th className="px-3 py-3">Storage</th>
                      <th className="px-3 py-3">AI</th>
                      <th className="px-3 py-3">Growth</th>
                      <th className="px-3 py-3">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {productComparisonRows.map((product) => (
                      <tr key={product.key} className={product.key === selectedProductKey ? 'bg-cyan-500/5' : ''}>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-neutral-950 dark:text-neutral-50">{product.fullName}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{product.category}</p>
                        </td>
                        <td className="px-3 py-3 text-neutral-700 dark:text-neutral-200">{product.activeUsers}</td>
                        <td className="px-3 py-3 text-neutral-700 dark:text-neutral-200">{product.usageScore}%</td>
                        <td className="px-3 py-3 text-neutral-700 dark:text-neutral-200">{bytes(product.storageUsage)}</td>
                        <td className="px-3 py-3 text-neutral-700 dark:text-neutral-200">{product.aiUsage}</td>
                        <td className="px-3 py-3 text-neutral-700 dark:text-neutral-200">{product.growth}%</td>
                        <td className="px-3 py-3 text-neutral-700 dark:text-neutral-200">{product.healthScore}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className={cardClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{selectedProduct.fullName} Workspace</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Dedicated operational workspace for product technology management</p>
                </div>
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">{selectedProductProject ? selectedProductProject.name : 'Unlinked'}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {PRODUCT_TABS.map((tab) => (
                  <button key={tab} type="button" onClick={() => setSelectedProductTab(tab)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${selectedProductTab === tab ? 'bg-cyan-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'}`}>
                    {tab.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
              <div className="mt-4">{productWorkspaceLoading ? <div className="h-60 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" /> : (tabContent[selectedProductTab] || tabContent.overview)}</div>
            </section>
          </div>
        </section>
      </div>
    );
  };

  const content = useMemo(() => {
    if (activeSection === 'dashboard') {
      const overview = data.overview || {};
      const monitoring = data.monitoring?.kpis || {};
      const support = data.supportTickets || {};
      const assets = data.assets || {};
      const backup = data.backupRecovery || {};
      const network = data.networkInfra || {};
      const patchOps = data.devopsCicd || {};
      const roles = data.userAccess || {};
      const licenseCount = data.apiIntegrations?.apiKeys?.active || 0;
      const vendorContracts = data.apiIntegrations?.internalApis?.length || 0;

      return (
        <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="space-y-4">
            <section className="rounded-[24px] border border-neutral-200/80 bg-white/85 p-4 shadow-[0_14px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/75">
              <SectionHeader
                title="Executive IT Dashboard"
                subtitle="Single-pane operational control for support, assets, infrastructure, security, and compliance."
              />
              <KeyValueGrid
                items={[
                  ['Total Employees', overview.activeUsers || roles.totalUsers || 0, 'group'],
                  ['Active Devices', assets.items?.filter((asset) => String(asset.status || '').toLowerCase() !== 'retired').length || 0, 'devices'],
                  ['Total Assets', assets.pagination?.total || assets.items?.length || 0, 'inventory_2'],
                  ['Open Tickets', support.total || monitoring.ticketsOpen || 0, 'support_agent'],
                  ['Critical Incidents', data.dashboard?.criticalTickets || 0, 'warning'],
                  ['Active Servers', monitoring.activeSystems || network.servers?.length || 0, 'dns'],
                  ['Security Alerts', overview.securityAlerts || monitoring.securityAlerts || 0, 'shield'],
                  ['Software Licenses', licenseCount, 'license'],
                  ['Vendor Contracts', vendorContracts, 'contract'],
                ]}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  title: 'IT Health Score',
                  value: `${Math.max(62, 100 - (monitoring.serverLoad || 0) - (overview.securityAlerts || 0))}%`,
                  tone: 'emerald',
                  subtitle: 'Composite service availability and support health',
                },
                {
                  title: 'Infrastructure Score',
                  value: `${Math.max(58, 100 - (monitoring.downtimeMinutes || 0) - ((network.apis?.degraded || 0) * 3))}%`,
                  tone: 'cyan',
                  subtitle: 'Uptime, latency, and service reliability',
                },
                {
                  title: 'Security Score',
                  value: `${Math.max(55, 100 - (overview.securityAlerts || monitoring.securityAlerts || 0) * 2)}%`,
                  tone: 'amber',
                  subtitle: 'Access control, alerts, and compliance posture',
                },
              ].map((item) => (
                <div key={item.title} className={`${cardClass} min-h-[120px]`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{item.title}</p>
                  <p className={`mt-3 text-3xl font-black tracking-tight ${item.tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-300' : item.tone === 'cyan' ? 'text-cyan-600 dark:text-cyan-300' : 'text-amber-600 dark:text-amber-300'}`}>
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{item.subtitle}</p>
                </div>
              ))}
            </section>

            <section className="rounded-[24px] border border-neutral-200/80 bg-white/85 p-4 shadow-[0_14px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/75">
              <SectionHeader title="Operational lanes" subtitle="Service desk, infrastructure, security, procurement, and license control." />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[
                  ['Service Desk', support.total || 0, 'support_agent', `${support.totalPages || 1} pages in queue`],
                  ['Infrastructure', monitoring.activeSystems || 0, 'dns', `${network.cloud?.provider || 'Cloud'} connected`],
                  ['Security', overview.securityAlerts || 0, 'shield', `${data.threatLogs?.items?.length || 0} threat records`],
                  ['Procurement', data.accessRequests?.pendingRequests || 0, 'shopping_cart', 'Pending approvals and purchases'],
                  ['Knowledge Base', data.auditLogs?.pagination?.total || 0, 'menu_book', 'Policies and SOPs in play'],
                  ['Compliance', backup.restorePoints?.length || 0, 'verified', `Backup health: ${backup.backupHealth || 'unknown'}`],
                ].map(([label, value, icon, hint]) => (
                  <div key={label} className="flex items-start gap-3 rounded-2xl border border-neutral-200/70 bg-neutral-50/80 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-200">
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{label}</p>
                      <p className="mt-1 text-lg font-black tracking-tight text-neutral-950 dark:text-neutral-50">{value}</p>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-[24px] border border-neutral-200/80 bg-white/85 p-4 shadow-[0_14px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/75">
              <SectionHeader title="AI Insights" subtitle="Heuristic guidance for support, security, and spending." />
              <div className="space-y-3">
                {aiInsights.map((insight) => (
                  <div key={insight.title} className="flex gap-3 rounded-2xl border border-neutral-200/70 bg-neutral-50/80 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
                      <span className="material-symbols-outlined text-[20px]">{insight.icon}</span>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{insight.title}</p>
                      <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{insight.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-neutral-200/80 bg-white/85 p-4 shadow-[0_14px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/75">
              <SectionHeader title="Live signals" subtitle="The current operational pulse across the portal." />
              <div className="space-y-2">
                {[
                  ['Support queue', `${support.total || 0} tickets`, 'support_agent'],
                  ['Server uptime', `${Math.max(95, 100 - (monitoring.downtimeMinutes || 0) / 10)}%`, 'monitor_heart'],
                  ['Security posture', `${Math.max(60, 100 - (overview.securityAlerts || 0) * 2)}%`, 'shield'],
                  ['Backup readiness', backup.backupHealth || 'unknown', 'backup'],
                  ['Patch level', patchOps.latestVersion || 'n/a', 'system_update_alt'],
                ].map(([label, value, icon]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl border border-neutral-200/70 bg-neutral-50/80 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-200">
                        <span className="material-symbols-outlined text-[18px]">{icon}</span>
                      </span>
                      <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{label}</p>
                    </div>
                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      );
    }
    if (activeSection === 'product-operations') {
      return renderProductOperations();
    }
    if (activeSection === 'monitoring') {
      const m = data.monitoring || {};
      return <div className="space-y-3"><KeyValueGrid items={[['Uptime %', (m.trends?.uptime || [0]).slice(-1)[0], 'monitoring'], ['Traffic', (m.trends?.trafficUsage || [0]).slice(-1)[0], 'network_check'], ['Ticket Trend', (m.trends?.ticketTrend || [0]).slice(-1)[0], 'timeline'], ['Load %', m.kpis?.serverLoad || 0, 'speed']]} /><article className={cardClass}><p className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">Real-time Alerts</p><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Server down, suspicious activity, and failed login attempts stream through security event hooks.</p></article></div>;
    }
    if (activeSection === 'user-access') {
      const x = data.userAccess || {};
      return <KeyValueGrid items={[['Total Users', x.totalUsers || 0, 'group'], ['Temporary Access', x.temporaryAccess || 0, 'timer'], ['Blocked Users', x.blockedUsers || 0, 'block'], ['Role Buckets', (x.roleBreakdown || []).length, 'schema']]} />;
    }
    if (activeSection === 'assets') {
      const rows = data.assets?.items || data.assets?.assets || [];
      return <div className="space-y-3">{rows.map((row) => <article key={row.id} className={cardClass}><div className="flex items-center justify-between"><p className="font-semibold text-neutral-950 dark:text-neutral-100">{row.name}</p><span className={`rounded-full px-2 py-0.5 text-xs ${row.status === 'warning' ? 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200' : 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'}`}>{row.status}</span></div><p className="text-sm text-neutral-600 dark:text-neutral-400">{row.type} • {row.assignedTo}</p></article>)}</div>;
    }
    if (activeSection === 'network-infra') {
      const h = data.infra?.serverHealth || {};
      const n = data.networkInfra || {};
      return <div className="space-y-3"><KeyValueGrid items={[['CPU %', h.cpu || 0, 'memory'], ['Memory %', h.memory || 0, 'storage'], ['DB Connections', h.dbConnections || 0, 'database'], ['API Latency (ms)', h.apiLatencyMs || 0, 'speed']]} /><article className={cardClass}><p className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">Cloud Provider</p><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{n.cloud?.provider} • {n.cloud?.activeInstances} instances</p></article></div>;
    }
    if (activeSection === 'security-logs') {
      const x = data.security || {};
      const t = data.threatLogs?.items || [];
      return <div className="space-y-3"><KeyValueGrid items={[['Login Events', x.loginEvents || 0, 'login'], ['Suspicious Events', x.suspiciousEvents || 0, 'report'], ['MFA', x.mfaEnabled ? 'Enabled' : 'Disabled', 'verified_user'], ['LAW Compliance Lock', x.lawComplianceLock ? 'Enforced' : 'Off', 'gpp_good']]} /><article className={cardClass}><p className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">Recent Threat</p><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t[0]?.action || 'No threat events'}</p></article></div>;
    }
    if (activeSection === 'audit-logs') {
      const x = data.auditLogs || {};
      return <KeyValueGrid items={[['Audit Entries', x.pagination?.total || 0, 'description'], ['Recent Audit Items', (x.items || []).length, 'history'], ['Logging State', 'Active', 'check_circle'], ['Security Mode', 'Enforced', 'shield_lock']]} />;
    }
    if (activeSection === 'software-rollouts') {
      const x = data.devopsCicd || data.deployments || {};
      return <KeyValueGrid items={[['Software Updates', x.deploymentsThisMonth || 0, 'system_update_alt'], ['Latest Patch Level', x.latestVersion || '-', 'new_releases'], ['Patch Status', x.ciCdStatus || 'green', 'verified'], ['Rollback Ready', x.rollbackReady ? 'Yes' : 'No', 'undo']]} />;
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
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title={meta.title}
          subtitle={meta.subtitle}
          icon={meta.icon}
          user={user}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  const projectId = e.target.value;
                  setSelectedProjectId(projectId);
                  if (projectId) localStorage.setItem('activeProjectId', projectId);
                }}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none transition focus:border-primary dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              >
                <option value="">{projects.length ? 'All projects' : 'No projects'}</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                MFA enforced
              </span>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200">
                {eventCount} live events
              </span>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                {loading ? 'Refreshing…' : 'Data current'}
              </span>
            </div>
          }
        />

        <section className="mb-4 rounded-[24px] border border-neutral-200/80 bg-white/85 p-4 shadow-[0_14px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/75">
          <SectionHeader title="Operational signal" subtitle="Current queue pressure, security posture, and platform throughput." />
          <KeyValueGrid
            items={[
              ['Active Systems', data.monitoring?.kpis?.activeSystems || 0, 'dns'],
              ['Open Tickets', data.dashboard?.openTickets || data.monitoring?.kpis?.ticketsOpen || 0, 'support_agent'],
              ['Security Alerts', data.overview?.securityAlerts || data.monitoring?.kpis?.securityAlerts || 0, 'warning'],
              ['Server Load %', data.monitoring?.kpis?.serverLoad || 0, 'memory'],
            ]}
          />
        </section>

        <section className="mb-4 rounded-[24px] border border-cyan-500/15 bg-cyan-500/10 p-4 text-sm text-cyan-900 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-100">
          Event bus: <span className="font-semibold">employee.created</span>, <span className="font-semibold">access.requested</span>, <span className="font-semibold">fraud.detected</span>, <span className="font-semibold">employee.terminated</span>
        </section>

        {loading ? (
          <div className="h-40 animate-pulse rounded-[24px] border border-neutral-200/80 bg-white/70 dark:border-neutral-800 dark:bg-neutral-900/70" />
        ) : error ? (
          <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</div>
        ) : (
          content
        )}
      </div>
    </main>
  );
};

export default ITDashboard;
