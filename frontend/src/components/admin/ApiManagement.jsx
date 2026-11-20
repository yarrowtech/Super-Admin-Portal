import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/client';
import PortalHeader from '../common/PortalHeader';
import ExistingProjectApis from './ExistingProjectApis';
import { scopeApiManagement } from './apiManagementScope';
import { GLOBAL_SECTIONS, NAV_GROUPS, SECTION_DESCRIPTIONS, slug } from './api-management/config';
import { Action, Badge, Empty, Field, Icon, Notice, Panel, Select } from './api-management/ManagementUI';
import ManagementNavigation from './api-management/ManagementNavigation';
import { Overview, ProjectDirectory } from './api-management/ProjectOverview';
import { Documentation, ProviderCredential, ProviderSettings } from './api-management/ProjectSettings';
import EndpointManager from './api-management/EndpointManager';
import { ConnectionEditor, ConnectionList, PortalClients } from './api-management/PortalConnections';
import { DeliveryPanel, McpPanel, MonitoringPanel, SynchronizationPanel } from './api-management/OperationsPanels';

export default function ApiManagement() {
  const { user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const projectId = new URLSearchParams(location.search).get('project') || '';
  const connectionId = new URLSearchParams(location.search).get('connection') || '';
  const section = NAV_GROUPS.flatMap(([, items]) => items.map(([name]) => name)).find(name => slug(name) === location.pathname.split('/')[3]) || 'API Dashboard';
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const inFlight = useRef(false);
  const editable = user?.role === 'super_admin';
  const query = useQuery({
    queryKey: ['api-management', 'registry', user?._id || user?.id || user?.role],
    queryFn: ({ signal }) => apiClient.get('/api/api-management/state', token, { cache: false, forceRefresh: true, signal }),
    enabled: Boolean(token), staleTime: 0, refetchOnWindowFocus: false, retry: 1,
  });
  const registry = query.data;
  const state = scopeApiManagement(registry, projectId);
  const project = registry?.projects.find(item => item._id === projectId);
  const api = state?.apis.find(item => item.projectId === projectId);
  const send = (path, data, method = 'post') => apiClient[method](`/api/api-management${path}`, data, token);

  const run = async (operation, success = 'Changes saved') => {
    if (inFlight.current) return { ok: false };
    inFlight.current = true; setBusy(true); setFeedback(null);
    try {
      const data = await operation();
      const refreshed = await query.refetch();
      setFeedback({ tone: refreshed.error ? 'warning' : 'success', text: refreshed.error ? `${success}. Refresh to retrieve the latest state.` : success });
      return { ok: true, data };
    } catch (error) {
      setFeedback({ tone: 'error', text: error.message || 'The operation could not be completed. Try again.' });
      return { ok: false, error: error.message || 'The operation could not be completed.' };
    } finally { inFlight.current = false; setBusy(false); }
  };
  const navigateSection = (next, nextProject = projectId, nextConnection = '', keepFeedback = false) => {
    if (!keepFeedback) setFeedback(null);
    const search = new URLSearchParams();
    if (nextProject) search.set('project', nextProject);
    if (nextConnection) search.set('connection', nextConnection);
    navigate(`/admin/api-management/${slug(next)}${search.size ? `?${search}` : ''}`);
  };
  const chooseProject = id => navigateSection('API Configuration', id);
  const openConnection = connection => {
    const provider = registry.apis.find(item => item._id === connection.apiId);
    if (provider) navigateSection('Connection Configuration', provider.projectId, connection._id);
  };
  const context = { registry, state, project, api, editable, busy, run, send, chooseProject, navigateSection, openConnection };
  const renderSection = () => {
    if (section === 'API Dashboard') return <><Overview {...context} /><ExistingProjectApis integrations={registry.existingIntegrations || []} projects={registry.projects} projectId={projectId} {...context} /></>;
    if (section === 'Registered Project APIs') return <><ProjectDirectory {...context} /><ExistingProjectApis integrations={registry.existingIntegrations || []} projects={registry.projects} projectId={projectId} {...context} /></>;
    if (['Connected Portals', 'Authentication'].includes(section)) return <PortalClients {...context} />;
    if (section === 'MCP Management') return <McpPanel {...context} />;
    if (!project) return <Panel title="Choose a project" icon="folder_open"><Empty title={projectId ? 'This project is unavailable' : 'Select a project to continue'} description={projectId ? 'The project may have been removed. Choose another project from the selector above.' : 'Endpoints, credentials, sharing rules and connections are managed within their owning project.'} icon="folder_open" /></Panel>;
    if (section === 'API Configuration') return <ProviderSettings {...context} />;
    if (section === 'API Credentials') return <ProviderCredential {...context} />;
    if (['API Endpoints', 'Project Data Sharing'].includes(section)) return <EndpointManager {...context} />;
    if (section === 'API Documentation') return <Documentation {...context} token={token} client={apiClient} />;
    if (section === 'Connection Configuration') return <ConnectionEditor {...context} connectionId={connectionId} />;
    if (['Portal API Mapping', 'Permission Manager', 'Connection Health'].includes(section)) return <>
      {section === 'Connection Health' && <Panel title="Provider configuration" icon="monitor_heart"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">{api?.name || 'No API registered'}</p><p className="mt-1 break-all text-xs text-neutral-500">{api?.baseUrl || 'Provider URL not configured'}</p></div><Badge tone={api?.enabled ? 'info' : 'neutral'}>{api?.enabled ? 'Provider enabled' : 'Provider disabled'}</Badge></div><p className="mt-3 text-xs text-neutral-500">Provider enablement is configuration state. Connection tests below verify actual approved read access.</p></Panel>}
      <Panel title="Project-to-portal connections" icon="hub" description="Test a saved mapping, review its permissions, then activate it." action={editable && <Action variant="accent" icon="add" disabled={!api || busy} onClick={() => navigateSection('Connection Configuration')}>Configure connection</Action>}><ConnectionList {...context} /></Panel>
    </>;
    if (['Data Fetching', 'Data Push'].includes(section)) return <DeliveryPanel {...context} writes={section === 'Data Push'} />;
    if (['Synchronization', 'Webhooks'].includes(section)) return <SynchronizationPanel {...context} webhooks={section === 'Webhooks'} />;
    return <MonitoringPanel {...context} section={section} />;
  };

  return <div className="min-w-0 pt-14 lg:pt-0">
    <PortalHeader title="API Management" subtitle="Project connections & controlled data sharing" icon="api" user={user} onRefresh={() => query.refetch()} refreshing={query.isFetching || busy} />
    <div className="lg:flex lg:items-start lg:gap-5">
      <ManagementNavigation section={section} onNavigate={navigateSection} disabled={busy} />
      <main className="min-w-0 flex-1" aria-busy={busy || query.isPending}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400">API Management / {project?.name || 'Organization'}</p><h1 className="text-xl font-bold tracking-tight sm:text-2xl">{section}</h1><p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{SECTION_DESCRIPTIONS[section]}</p></div>{!editable && <Badge>Administrator · read only</Badge>}</div>
        {feedback && <div id="api-management-feedback" role={feedback.tone === 'error' ? 'alert' : 'status'} className={`sticky top-20 z-30 lg:top-3 mb-4 flex items-start gap-3 rounded-xl border p-3 text-sm ${feedback.tone === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300' : feedback.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'}`}><Icon name={feedback.tone === 'error' ? 'error_outline' : 'check_circle'} className="shrink-0" /><p className="min-w-0 flex-1">{feedback.text}</p><button aria-label="Dismiss notification" className="shrink-0 rounded focus-visible:outline-2" onClick={() => setFeedback(null)}><Icon name="close" /></button></div>}
        {query.isPending ? <div role="status" aria-label="Loading API registry" className="space-y-4"><div className="h-32 animate-pulse rounded-2xl bg-neutral-200/60 dark:bg-neutral-800" /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map(index => <div key={index} className="h-24 animate-pulse rounded-2xl bg-neutral-200/60 dark:bg-neutral-800" />)}</div><div className="h-64 animate-pulse rounded-2xl bg-neutral-200/60 dark:bg-neutral-800" /><span className="sr-only">Loading project APIs</span></div> : !registry ? <Panel title="Unable to load API Management"><Empty icon="cloud_off" title="The registry could not be loaded" description={query.error?.message || 'Check your connection and try again.'} action={<Action variant="accent" onClick={() => query.refetch()} loading={query.isFetching}>Retry</Action>} /></Panel> : <>
          {query.error && <div className="mb-4"><Notice tone="warning">The latest refresh failed. Showing the last loaded state. Use Refresh to retry.</Notice></div>}
          <Panel title="Project workspace" icon="folder_open" action={project && <Badge>{project.projectCode || project.name}</Badge>}>
            <div className="grid items-end gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
              <Field label="Source project" hint={project ? 'All project data and connection settings below belong to this project.' : 'Choose a project to configure its APIs and sharing permissions.'}><Select value={projectId} options={registry.projects} placeholder="All projects · overview" disabled={busy} onChange={event => navigateSection(section, event.target.value)} /></Field>
              {project && !api && editable && <Action variant="accent" icon="add_link" loading={busy} onClick={() => run(() => send('/apis', { projectId }), 'Project API identity registered')}>Register project API</Action>}
              {project && api && <div className="flex flex-wrap gap-2 pb-1"><Badge tone={api.enabled ? 'info' : 'neutral'}>{api.enabled ? 'Provider enabled' : 'Provider disabled'}</Badge><Badge>{state.endpoints.length} endpoints</Badge><Badge>{state.connections.length} portal mappings</Badge></div>}
            </div>
            {!project && GLOBAL_SECTIONS.has(section) && <p className="mt-3 text-xs text-neutral-500">Portal clients are organization-wide. Access to each project is configured independently.</p>}
          </Panel>
          <div key={`${section}:${projectId}:${api?._id || 'unregistered'}:${connectionId}`}>{renderSection()}</div>
        </>}
      </main>
    </div>
  </div>;
}
