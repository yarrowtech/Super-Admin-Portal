/**
 * Excel/CSV import for the CRM, project-wise.
 *
 * Four steps, because an import that writes before the operator has seen what it
 * will do is how a CRM gets quietly corrupted:
 *   1. Upload   — pick a file, a project, and a department
 *   2. Map      — confirm the detected column mapping
 *   3. Review   — counts and row-level issues; nothing written yet
 *   4. Result   — what happened, with an undo
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../../../config/backend';
import { useToast } from '../../../context/ToastContext';
import Button from '../../common/Button';
import StatusBadge from '../../common/StatusBadge';
import SectionCard from '../../ui/SectionCard';
import Select from '../../ui/Select';
import Skeleton from '../../ui/Skeleton';
import EmptyState from '../../ui/EmptyState';
import { apiFetch, DEPT_BADGE_TONE, PRIORITY_TONE, SINGLE_DEPT_OPTIONS, fmtDateTime, userLabel } from './crmShared';

// Field labels for the mapping step, in the order they read on screen.
const FIELDS = [
  { key: 'name',           label: 'Client Name', required: true },
  { key: 'contactPerson',  label: 'Contact Person' },
  { key: 'email',          label: 'Email' },
  { key: 'phone',          label: 'Phone' },
  { key: 'website',        label: 'Website' },
  { key: 'address',        label: 'Address' },
  { key: 'department',     label: 'Department' },
  { key: 'status',         label: 'Status / Stage' },
  { key: 'priority',       label: 'Priority' },
  { key: 'projectName',    label: 'Project Name' },
  { key: 'source',         label: 'Source' },
  { key: 'campaignSource', label: 'Campaign Source' },
  { key: 'notes',          label: 'Notes' },
];

const STEPS = ['Upload', 'Map columns', 'Review', 'Done'];

/** multipart POST — apiFetch forces a JSON content-type, which breaks file upload. */
const postFile = async (path, token, formData) => {
  const res = await fetch(`${API_BASE_URL}/api/v1/crm${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
};

function StepRail({ step }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {STEPS.map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'todo';
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                state === 'current' ? 'text-white'
                : state === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
              }`}
              style={state === 'current' ? { background: 'var(--portal-accent)' } : undefined}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="material-symbols-outlined text-[14px]">
                {state === 'done' ? 'check_circle' : `counter_${i + 1}`}
              </span>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="material-symbols-outlined text-[14px] text-neutral-300 dark:text-neutral-600">chevron_right</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function SummaryTiles({ summary }) {
  if (!summary) return null;
  const tiles = [
    { label: 'Rows in file', value: summary.total,          tone: 'neutral', icon: 'table_rows' },
    { label: 'Will import',  value: summary.valid,          tone: 'success', icon: 'check_circle' },
    { label: 'Need attention', value: summary.needsAttention, tone: 'warning', icon: 'warning' },
    { label: 'Duplicates',   value: summary.duplicates,     tone: 'info',    icon: 'content_copy' },
    { label: 'Skipped',      value: summary.skipped,        tone: 'danger',  icon: 'block' },
  ];
  const TONE = {
    neutral: 'text-neutral-600 dark:text-neutral-300',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    info: 'text-sky-600',
    danger: 'text-rose-600',
  };
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {tiles.map(t => (
        <div key={t.label} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="flex items-center gap-1.5">
            <span className={`material-symbols-outlined text-[15px] ${TONE[t.tone]}`}>{t.icon}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t.label}</span>
          </div>
          <p className={`mt-1 text-2xl font-black tabular-nums ${TONE[t.tone]}`}>{t.value ?? 0}</p>
        </div>
      ))}
    </div>
  );
}

export default function ImportModule({ token, department }) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [step, setStep]         = useState(0);
  const [file, setFile]         = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [importDept, setImportDept] = useState(department === 'all' ? 'media' : department);
  const [mode, setMode]         = useState('skip');
  const [sheet, setSheet]       = useState('');

  const [analysis, setAnalysis] = useState(null);
  const [mapping, setMapping]   = useState({});
  const [busy, setBusy]         = useState(false);
  const [result, setResult]     = useState(null);
  const [batches, setBatches]   = useState([]);

  useEffect(() => { setImportDept(department === 'all' ? 'media' : department); }, [department]);

  useEffect(() => {
    apiFetch('/import/projects', token)
      .then(r => setProjects(r.data || []))
      .catch(() => setProjects([]));
  }, [token]);

  const loadBatches = useCallback(() => {
    apiFetch('/import/batches?limit=10', token)
      .then(r => setBatches(r.data || []))
      .catch(() => setBatches([]));
  }, [token]);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  const reset = () => {
    setStep(0); setFile(null); setAnalysis(null); setMapping({});
    setResult(null); setSheet('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runAnalyze = async (chosenFile, overrides = {}) => {
    const target = chosenFile || file;
    if (!target) { toast.error('Choose a file first'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', target);
      fd.append('department', overrides.department ?? importDept);
      if (overrides.sheet ?? sheet) fd.append('sheet', overrides.sheet ?? sheet);
      if (overrides.mapping) fd.append('mapping', JSON.stringify(overrides.mapping));

      const { data } = await postFile('/import/analyze', token, fd);
      setAnalysis(data);
      setMapping(data.mapping || {});
      if (data.file?.sheetName) setSheet(data.file.sheetName);
      // A file whose required columns were all detected can skip straight to
      // review; otherwise the operator has to map them by hand.
      setStep(data.ready ? 2 : 1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    runAnalyze(f);
  };

  const applyMapping = () => runAnalyze(file, { mapping });

  const runCommit = async () => {
    if (!projectId) { toast.error('Choose a project to import into'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('projectId', projectId);
      fd.append('department', importDept);
      fd.append('mode', mode);
      if (sheet) fd.append('sheet', sheet);
      fd.append('mapping', JSON.stringify(mapping));

      const { data } = await postFile('/import/commit', token, fd);
      setResult(data);
      setStep(3);
      toast.success(`Imported ${data.created} client${data.created === 1 ? '' : 's'}`);
      loadBatches();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const revert = async (batchId) => {
    if (!window.confirm('Undo this import? Clients it created will be permanently deleted. Records it only updated stay as they are.')) return;
    try {
      const { data } = await apiFetch(`/import/batches/${batchId}`, token, { method: 'DELETE' });
      toast.success(`Removed ${data.removed} imported client${data.removed === 1 ? '' : 's'}`);
      loadBatches();
      if (result?.batchId === batchId) reset();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/crm/import/template`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Could not download the template');
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: 'crm-import-template.xlsx' });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const projectOptions = [
    { value: '', label: 'Select a project…' },
    ...projects.map(p => ({ value: p._id, label: p.projectCode ? `${p.name} (${p.projectCode})` : p.name })),
  ];

  return (
    <div className="space-y-5">
      <SectionCard
        title="Import CRM Data from Excel"
        icon="upload_file"
        description="Upload an .xlsx, .xls or .csv file. Clients are created project-wise under Media or Marketing."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={downloadTemplate}
              icon={<span className="material-symbols-outlined text-base">download</span>}>
              Template
            </Button>
            {step > 0 && <Button variant="secondary" size="sm" onClick={reset}>Start over</Button>}
          </div>
        }
      >
        <div className="space-y-5">
          <StepRail step={step} />

          {/* ── Step 1: upload ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Import into project *"
                  name="projectId"
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  options={projectOptions}
                  helperText={projects.length ? 'Every imported client is filed under this project' : 'No projects found — create one first'}
                />
                <Select
                  label="Department *"
                  name="department"
                  value={importDept}
                  onChange={e => setImportDept(e.target.value)}
                  options={SINGLE_DEPT_OPTIONS}
                  helperText="Used when a row's Department cell is blank or unrecognised"
                />
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
                className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                  dragOver
                    ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)]'
                    : 'border-neutral-300 dark:border-neutral-700'
                }`}
              >
                <span className="material-symbols-outlined text-4xl" style={{ color: 'var(--portal-accent)' }}>
                  {busy ? 'hourglass_top' : 'cloud_upload'}
                </span>
                <p className="mt-2 text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  {busy ? 'Reading your file…' : 'Drag a spreadsheet here'}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">XLSX, XLS or CSV — nothing is saved until you confirm</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="sr-only"
                  id="crm-import-file"
                  onChange={e => pickFile(e.target.files?.[0])}
                />
                <label htmlFor="crm-import-file"
                  className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'var(--portal-accent)' }}>
                  <span className="material-symbols-outlined text-base">folder_open</span>
                  Choose file
                </label>
              </div>
            </div>
          )}

          {/* ── Step 2: map columns ── */}
          {step === 1 && analysis && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                <strong>Map the required columns.</strong> We could not detect:{' '}
                {analysis.missingRequired.map(f => FIELDS.find(x => x.key === f)?.label || f).join(', ')}.
              </div>
              <MappingGrid analysis={analysis} mapping={mapping} setMapping={setMapping} />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={reset}>Cancel</Button>
                <Button variant="accent" loading={busy} onClick={applyMapping}>Continue</Button>
              </div>
            </div>
          )}

          {/* ── Step 3: review ── */}
          {step === 2 && analysis && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800/50">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">description</span>
                  <span className="truncate text-sm font-bold text-neutral-800 dark:text-neutral-200">{analysis.file?.name}</span>
                  <span className="text-xs text-neutral-500">· {analysis.file?.sheetName}</span>
                </div>
                {analysis.file?.sheetNames?.length > 1 && (
                  <select
                    value={sheet}
                    onChange={e => { setSheet(e.target.value); runAnalyze(file, { sheet: e.target.value }); }}
                    aria-label="Worksheet"
                    className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    {analysis.file.sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>

              <SummaryTiles summary={analysis.summary} />

              {analysis.summary?.byDepartment && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Split:</span>
                  {Object.entries(analysis.summary.byDepartment).map(([dept, n]) => (
                    <StatusBadge key={dept} tone={DEPT_BADGE_TONE[dept] || 'neutral'} label={`${dept}: ${n}`} dot={false} />
                  ))}
                </div>
              )}

              <details className="rounded-xl border border-neutral-200 dark:border-neutral-700">
                <summary className="cursor-pointer px-3 py-2 text-sm font-bold text-neutral-700 dark:text-neutral-300">
                  Column mapping ({Object.values(mapping).filter(Boolean).length} of {FIELDS.length} mapped)
                </summary>
                <div className="border-t border-neutral-200 p-3 dark:border-neutral-700">
                  <MappingGrid analysis={analysis} mapping={mapping} setMapping={setMapping} />
                  <div className="mt-3 flex justify-end">
                    <Button variant="secondary" size="sm" loading={busy} onClick={applyMapping}>Re-check with this mapping</Button>
                  </div>
                </div>
              </details>

              {/* Preview */}
              {analysis.preview?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Preview — first {analysis.preview.length} rows
                  </p>
                  <div className="crm-scroll-thin overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <table className="w-full min-w-[46rem] text-left text-sm">
                      <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500 dark:bg-neutral-800">
                        <tr>
                          {['Row','Client','Contact','Email','Dept','Status','Priority'].map(h => (
                            <th key={h} className="px-3 py-2 font-bold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {analysis.preview.map(r => (
                          <tr key={r.row}>
                            <td className="px-3 py-2 font-mono text-xs text-neutral-400">{r.row}</td>
                            <td className="px-3 py-2 font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</td>
                            <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{r.contactPerson || '—'}</td>
                            <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{r.email || '—'}</td>
                            <td className="px-3 py-2"><StatusBadge tone={DEPT_BADGE_TONE[r.department] || 'neutral'} label={r.department} dot={false} /></td>
                            <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{r.status}</td>
                            <td className="px-3 py-2"><StatusBadge tone={PRIORITY_TONE[r.priority] || 'neutral'} label={r.priority} dot={false} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Issues */}
              {analysis.issues?.length > 0 && (
                <details className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-900/10">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                    {analysis.summary.needsAttention} row{analysis.summary.needsAttention === 1 ? '' : 's'} need attention
                    {analysis.issuesTruncated > 0 && ` (showing first ${analysis.issues.length})`}
                  </summary>
                  <ul className="max-h-64 space-y-1.5 overflow-y-auto border-t border-amber-200 p-3 text-sm dark:border-amber-900/40">
                    {analysis.issues.map(i => (
                      <li key={i.row} className="flex gap-2">
                        <span className="shrink-0 font-mono text-xs text-amber-700 dark:text-amber-400">Row {i.row}</span>
                        <span className="min-w-0 text-neutral-700 dark:text-neutral-300">
                          <strong>{i.name}</strong> — {i.issues.join('; ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Commit controls */}
              <div className="space-y-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select label="Import into project *" name="projectId" value={projectId}
                    onChange={e => setProjectId(e.target.value)} options={projectOptions} />
                  <Select label="If a client already exists" name="mode" value={mode}
                    onChange={e => setMode(e.target.value)}
                    options={[
                      { value: 'skip',   label: 'Skip it (leave existing data alone)' },
                      { value: 'update', label: 'Update it with values from the file' },
                    ]}
                    helperText={mode === 'update' ? 'Only non-empty cells overwrite existing values' : 'Existing clients are left untouched'}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-neutral-500">
                    {analysis.summary?.valid
                      ? <>Ready to import <strong className="text-neutral-900 dark:text-neutral-100">{analysis.summary.valid}</strong> client{analysis.summary.valid === 1 ? '' : 's'}.</>
                      : 'No importable rows in this file.'}
                  </p>
                  <Button variant="accent" loading={busy} disabled={!analysis.summary?.valid || !projectId} onClick={runCommit}
                    icon={<span className="material-symbols-outlined text-base">publish</span>}>
                    Import {analysis.summary?.valid || 0} client{analysis.summary?.valid === 1 ? '' : 's'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: result ── */}
          {step === 3 && result && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">task_alt</span>
                  <p className="font-bold text-emerald-800 dark:text-emerald-300">
                    Imported into {result.projectName}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Created', result.created, 'text-emerald-600'],
                    ['Updated', result.updated, 'text-sky-600'],
                    ['Skipped', result.skipped, 'text-neutral-500'],
                    ['Failed',  result.failed,  'text-rose-600'],
                  ].map(([label, value, tone]) => (
                    <div key={label}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
                      <p className={`text-2xl font-black tabular-nums ${tone}`}>{value ?? 0}</p>
                    </div>
                  ))}
                </div>
              </div>

              {result.failures?.length > 0 && (
                <details className="rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-900/10">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-bold text-rose-800 dark:text-rose-300">
                    {result.failed} row{result.failed === 1 ? '' : 's'} could not be saved
                  </summary>
                  <ul className="max-h-56 space-y-1 overflow-y-auto border-t border-rose-200 p-3 text-sm dark:border-rose-900/40">
                    {result.failures.map(f => (
                      <li key={f.row} className="text-neutral-700 dark:text-neutral-300">
                        <span className="font-mono text-xs text-rose-600">Row {f.row}</span> <strong>{f.name}</strong> — {f.error}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="danger" onClick={() => revert(result.batchId)}>Undo this import</Button>
                <Button variant="accent" onClick={reset}>Import another file</Button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Import history */}
      <SectionCard
        title="Import History"
        icon="history"
        description="Recent spreadsheet imports, newest first"
        empty={batches.length === 0}
        emptyIcon="upload_file"
        emptyTitle="No imports yet"
        emptyDescription="Imported files are listed here so they can be reviewed or undone"
      >
        <div className="space-y-2">
          {batches.map(b => (
            <div key={b.batchId}
              className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${
                b.revertedAt
                  ? 'border-neutral-200 bg-neutral-50 opacity-60 dark:border-neutral-700 dark:bg-neutral-800/30'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}>
              <span className="material-symbols-outlined text-[20px] text-neutral-400">
                {b.revertedAt ? 'undo' : 'description'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{b.fileName || 'Spreadsheet'}</p>
                  <StatusBadge tone={DEPT_BADGE_TONE[b.department] || 'neutral'} label={b.department} dot={false} />
                  {b.revertedAt && <StatusBadge tone="danger" label="Reverted" dot={false} />}
                </div>
                <p className="truncate text-xs text-neutral-500">
                  {b.projectName} · {b.created} created, {b.updated} updated, {b.skipped} skipped
                  {b.importedBy ? ` · ${userLabel(b.importedBy)}` : ''} · {fmtDateTime(b.createdAt)}
                </p>
              </div>
              {!b.revertedAt && (
                <Button variant="secondary" size="sm" onClick={() => revert(b.batchId)}>Undo</Button>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/** The header -> field grid, shared by the map step and the review step's details panel. */
function MappingGrid({ analysis, mapping, setMapping }) {
  const headerOptions = [
    { value: '', label: '— Not mapped —' },
    ...(analysis.headers || []).map(h => ({ value: h, label: h })),
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {FIELDS.map(f => (
        <div key={f.key}>
          <Select
            label={
              <>
                {f.label}{f.required && ' *'}
                {analysis.autoMatched?.[f.key] && mapping[f.key] === analysis.detected?.[f.key] && (
                  <span className="ml-1.5 text-[10px] font-bold text-emerald-600">✓ auto</span>
                )}
              </>
            }
            name={`map-${f.key}`}
            value={mapping[f.key] || ''}
            onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
            options={headerOptions}
            error={f.required && !mapping[f.key] ? 'Required' : undefined}
          />
        </div>
      ))}
    </div>
  );
}
