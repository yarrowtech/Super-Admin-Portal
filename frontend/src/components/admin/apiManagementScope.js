// Keep project relationships together when rendering the management workspace.
// Portal registration is organization-wide; connections and data stay scoped.
export function scopeApiManagement(registry, projectId) {
  if (!registry || !projectId) return registry;
  const apis = registry.apis.filter(api => String(api.projectId) === projectId);
  const apiIds = new Set(apis.map(api => String(api._id)));
  const endpoints = registry.endpoints.filter(endpoint => apiIds.has(String(endpoint.apiId)));
  const endpointIds = new Set(endpoints.map(endpoint => String(endpoint._id)));
  const connections = registry.connections.filter(connection => apiIds.has(String(connection.apiId)));
  const connectionIds = new Set(connections.map(connection => String(connection._id)));
  return {
    ...registry, apis, endpoints, connections,
    syncJobs: registry.syncJobs.filter(job => connectionIds.has(String(job.connectionId)) && endpointIds.has(String(job.endpointId))),
    events: registry.events.filter(event => apiIds.has(String(event.apiId)) ||
      connectionIds.has(String(event.connectionId)) || endpointIds.has(String(event.endpointId))),
  };
}
