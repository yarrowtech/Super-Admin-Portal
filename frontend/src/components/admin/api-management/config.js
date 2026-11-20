export const NAV_GROUPS = [
  ['Overview', [['API Dashboard', 'space_dashboard']]],
  ['Project APIs', [['Registered Project APIs', 'folder_open'], ['Project Data Sharing', 'share'], ['API Endpoints', 'route'], ['API Documentation', 'description']]],
  ['Portal Connections', [['Connected Portals', 'devices'], ['Portal API Mapping', 'hub'], ['Connection Configuration', 'settings_input_component']]],
  ['Access Control', [['Authentication', 'verified_user'], ['API Credentials', 'key'], ['Permission Manager', 'admin_panel_settings']]],
  ['Data Management', [['Data Fetching', 'download'], ['Data Push', 'upload'], ['Synchronization', 'sync'], ['Webhooks', 'webhook']]],
  ['Monitoring', [['API Logs', 'list_alt'], ['Connection Health', 'monitor_heart'], ['Error Monitoring', 'error_outline'], ['Audit History', 'history']]],
  ['Advanced', [['MCP Management', 'smart_toy'], ['API Configuration', 'tune']]],
];
export const SECTION_DESCRIPTIONS = {
  'API Dashboard': 'A clear view of project APIs, existing integrations and portal access.',
  'Registered Project APIs': 'Find a project and manage its independent API connection.',
  'Project Data Sharing': 'Choose the datasets and fields this project can share.',
  'API Endpoints': 'Register the real endpoints and data contracts for this project.',
  'API Documentation': 'View and export documentation generated from registered endpoints.',
  'Connected Portals': 'Manage portal clients. Access is granted separately for each project.',
  'Portal API Mapping': 'Review which portals can access this project and what they can use.',
  'Connection Configuration': 'Select a portal, approve its fields and review the connection.',
  'Permission Manager': 'Review and change explicit endpoint, field and operation permissions.',
  'API Credentials': 'Update provider credentials securely without exposing stored values.',
  'Authentication': 'Manage server credentials for registered portal clients.',
  'API Configuration': 'Manage the provider URL and existing integration settings.',
  'Synchronization': 'Schedule approved project snapshots and review synchronization activity.',
  'Webhooks': 'Manage authenticated notifications that refresh approved project snapshots.',
  'API Logs': 'Inspect recent gateway request outcomes for the selected project.',
  'Audit History': 'Review who changed project configuration and access.',
  'Error Monitoring': 'Find failed requests and identify connections that need attention.',
  'Connection Health': 'Review connection tests and provider configuration status.',
  'MCP Management': 'Allow compatible AI clients to use approved read operations.',
  'Data Fetching': 'Find the gateway routes for live reads and synchronized snapshots.',
  'Data Push': 'Review explicitly approved create and update routes.',
};
export const GLOBAL_SECTIONS = new Set(['API Dashboard', 'Registered Project APIs', 'Connected Portals', 'Authentication', 'MCP Management']);
export const INPUT = 'min-h-11 w-full min-w-0 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-[var(--portal-accent)] focus:ring-2 focus:ring-[var(--portal-accent)]/15 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:disabled:bg-neutral-800';
export const slug = value => value.toLowerCase().replaceAll(' ', '-');
export const timestamp = value => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not yet';
export const blankEndpoint = apiId => ({ apiId, providerIntegrationId: '', name: '', module: '', dataset: '', path: '/', method: 'GET', operation: 'read', fields: [], sharedFields: [], shared: false, requestSchema: {}, responseSchema: {}, recordsPath: '' });
