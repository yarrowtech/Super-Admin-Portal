import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { useAuth } from '../../../context/AuthContext';
import { apiClient } from '../../../services/client';

const kinds = { all: 'All record types', client: 'Clients', vendor: 'Vendors', third_party: 'Third parties', influencer: 'Influencers' };
const fmt = new Intl.NumberFormat('en-IN');
const control = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';
const button = control + ' disabled:opacity-50';

export default function CrmMap({ onShowOutreach }) {
  const { token } = useAuth();
  const [filters, setFilters] = useState({ projectId: 'all', kind: 'all', search: '', location: '', page: 1 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
      apiClient.get('/api/ceo/marketing-analytics/map/crm?' + new URLSearchParams(filters), token, {
        cache: false, signal: controller.signal,
      }).then(response => {
        if (!controller.signal.aborted) setResult(response.data);
      }).catch(err => {
        if (!controller.signal.aborted) setError(err.message || 'CRM records could not be loaded.');
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [token, filters, retry]);

  const update = change => setFilters(previous => ({ ...previous, location: '', page: 1, ...change }));
  const selectLocation = location => update({ location });

  return <main className="flex min-h-dvh flex-col bg-slate-100 text-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-4">
      <div>
        <Link to="/ceo/marketing-analytics" className="text-sm text-indigo-700">Marketing Analytics</Link>
        <h1 className="text-xl font-bold">CEO Map</h1>
      </div>
      <button type="button" className={button} onClick={onShowOutreach}>EEC-B2B outreach map</button>
    </header>
    <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white p-3">
      <select className={control} aria-label="Project" value={filters.projectId} onChange={event => update({ projectId: event.target.value })}>
        <option value="all">All projects</option>
        {result?.projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}
        <option value="unassigned">Unassigned</option>
      </select>
      <select className={control} aria-label="Record type" value={filters.kind} onChange={event => update({ kind: event.target.value })}>
        {Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <input type="search" className={control} aria-label="Search CRM records" placeholder="Search name or location" value={filters.search} onChange={event => update({ search: event.target.value })} />
    </div>
    {error && <div role="alert" className="flex items-center gap-3 bg-red-50 p-3 text-sm text-red-900">{error}<button type="button" className={button} onClick={() => setRetry(n => n + 1)}>Retry</button></div>}
    <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_28rem]">
      <div className="relative z-0 min-h-[45vh] lg:min-h-[75vh]">
        <MapContainer center={[22.5937, 78.9629]} zoom={5} minZoom={2} style={{ position: 'absolute', inset: 0 }} aria-label="CRM locations map">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
          {!loading && !error && result?.points.map(point => <CircleMarker key={point.key} center={[point.latitude, point.longitude]} radius={Math.min(22, 5 + Math.log2(point.count))} pathOptions={{ color: '#4338ca', fillOpacity: 0.65 }}>
            <Popup><strong>{point.city || 'Location'}</strong><br />{fmt.format(point.count)} records<br />
              <button type="button" className="text-indigo-700 underline" onClick={() => selectLocation(point.key)}>View location records</button>
            </Popup>
          </CircleMarker>)}
        </MapContainer>
      </div>
      <section className="border-l border-slate-200 bg-white p-4" aria-label="CRM records" aria-busy={loading}>
        <h2 className="font-bold">CRM records</h2>
        {loading ? <p role="status" className="my-3 text-sm">Loading records?</p> : !error && result && <>
          <p className="my-2 text-sm">{fmt.format(result.total)} records ? {fmt.format(result.total - result.unmapped)} mapped to city locations</p>
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" className={button} aria-pressed={!filters.location} onClick={() => selectLocation('')}>All records</button>
            <button type="button" className={button} aria-pressed={filters.location === 'unmapped'} onClick={() => selectLocation('unmapped')}>Without coordinates ({fmt.format(result.unmapped)})</button>
          </div>
          <p className="mb-2 text-sm text-slate-600">{fmt.format(result.matchingRecords)} matching records</p>
          {result.records.length ? <ul className="max-h-[54vh] divide-y overflow-auto rounded-lg border border-slate-200">
            {result.records.map(row => <li key={row.kind + row.id} className="p-3 text-sm">
              <strong>{row.name}</strong>
              <p>{row.projectName} ? {kinds[row.kind]}{row.status ? ' ? ' + row.status : ''}</p>
              <p className="text-slate-600">{row.address || 'No location supplied'}</p>
            </li>)}
          </ul> : <p className="py-3 text-sm">No records match these filters.</p>}
          {result.pages > 1 && <div className="mt-3 flex items-center justify-between gap-2 text-sm">
            <button type="button" className={button} disabled={result.page <= 1} onClick={() => setFilters(f => ({ ...f, page: result.page - 1 }))}>Previous</button>
            <span>{fmt.format(result.page)} / {fmt.format(result.pages)}</span>
            <button type="button" className={button} disabled={result.page >= result.pages} onClick={() => setFilters(f => ({ ...f, page: result.page + 1 }))}>Next</button>
          </div>}
        </>}
      </section>
    </div>
  </main>;
}
