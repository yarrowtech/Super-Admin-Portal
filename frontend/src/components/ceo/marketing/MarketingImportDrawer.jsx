import React, { useCallback, useMemo, useRef, useState } from 'react';
import Button from '../../common/Button';
import DataTable from '../../ui/DataTable';
import Drawer from '../../ui/Drawer';
import Select from '../../ui/Select';
import Skeleton from '../../ui/Skeleton';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { marketingAnalyticsApi } from '../../../services/marketingAnalytics';

// The "Import Marketing Data" workflow: Upload → Map Columns → Preview & Validate → Import.
//
// The shape of this component follows one rule from the brief (§32): the user must always
// know what will be imported before anything is written. That is why analysis and commit
// are two separate server calls — analyse parses, validates and resolves locations without
// writing, so the user can re-map columns and re-analyse freely, and only the explicit
// Import button commits.
//
// Parsing is deliberately server-side. The analysis response carries headers, a capped
// preview and per-row issues; the file itself is re-sent on commit rather than cached in
// browser memory, because a 20,000-row workbook held in state for the length of a review is
// a cost with no benefit — the server re-reads it in milliseconds.
//
// Email never reaches the map. It appears in the preview and the unmatched-rows table,
// which are authorised review views inside this drawer, and nowhere else; the map is fed by
// a separate aggregate endpoint that does not select the field at all.

const ACCEPT = '.csv,.xlsx,.xls';
const VALID_EXT = /\.(csv|xlsx|xls)$/i;

const fmt = (n) => new Intl.NumberFormat('en-IN').format(Number(n) || 0);

const fileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const extOf = (name) => (String(name || '').match(VALID_EXT)?.[1] || '').toUpperCase();
const unwrap = (res) => (res && typeof res === 'object' && 'data' in res ? res.data : res);

// The three fields the map and the records depend on. Email is optional: a file of school
// locations with no contact addresses is still perfectly importable, and demanding one
// would reject valid data.
const FIELDS = [
  { key: 'school', label: 'School', required: true, hint: 'School, institution or organisation name' },
  { key: 'email', label: 'Email', required: false, hint: 'Optional — stored, never shown on the map' },
  { key: 'location', label: 'Location', required: true, hint: 'City, address or area — resolved to coordinates' },
];

// Step rail. Three steps rather than four: validation is the output of the preview call,
// not a thing the user does, so showing it as its own step would imply a wait that isn't there.
const STEPS = [
  { id: 1, label: 'Upload file' },
  { id: 2, label: 'Map columns' },
  { id: 3, label: 'Preview & validate' },
];

const StepRail = ({ current }) => (
  <ol className="mb-5 flex items-center gap-2" aria-label="Import progress">
    {STEPS.map((step, i) => {
      const done = current > step.id;
      const active = current === step.id;
      return (
        <li key={step.id} className="flex flex-1 items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              done
                ? 'bg-emerald-600 text-white'
                : active
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
            }`}
            aria-current={active ? 'step' : undefined}
          >
            {done ? <span className="material-symbols-outlined text-[14px]">check</span> : step.id}
          </span>
          <span
            className={`truncate text-[11px] font-semibold ${
              active ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {step.label}
          </span>
          {i < STEPS.length - 1 && <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />}
        </li>
      );
    })}
  </ol>
);

// A metric in the validation summary. `tone` carries the meaning so the number does not
// have to be read against its label to know whether it is good news.
const Stat = ({ label, value, tone = 'neutral', sub }) => {
  const tones = {
    neutral: 'text-neutral-900 dark:text-white',
    good: 'text-emerald-700 dark:text-emerald-300',
    warn: 'text-amber-700 dark:text-amber-300',
  };
  return (
    <div className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-0.5 text-lg font-black tabular-nums ${tones[tone]}`}>{value}</p>
      {sub && <p className="text-[10px] text-neutral-500">{sub}</p>}
    </div>
  );
};

const MarketingImportDrawer = ({ open, onClose, projectId, projects = [], onImported }) => {
  const { token } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [mapping, setMapping] = useState({ school: '', email: '', location: '' });
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [showIssues, setShowIssues] = useState(false);
  const [result, setResult] = useState(null);

  // The project to import into (§23). It seeds from the page's selection, but is editable
  // here: a user who opened this panel without having chosen a project should be able to
  // choose one on the spot rather than being sent away to the selector and back. Still
  // required — and enforced server-side regardless of what this field says.
  const [target, setTarget] = useState(projectId && projectId !== 'all' ? projectId : '');

  // Re-seed when the page's selection changes while the drawer is closed, so reopening it
  // reflects the project now showing on the dashboard.
  const [seeded, setSeeded] = useState(projectId);
  if (projectId !== seeded) {
    setSeeded(projectId);
    if (projectId && projectId !== 'all') setTarget(projectId);
  }

  const hasProject = Boolean(target);
  const targetName = projects.find((p) => p.id === target)?.label || '';

  const projectOptions = useMemo(
    () => [{ value: '', label: '— Select a project —' }, ...projects.map((p) => ({ value: p.id, label: p.label }))],
    [projects]
  );

  const reset = useCallback(() => {
    setFile(null);
    setAnalysis(null);
    setMapping({ school: '', email: '', location: '' });
    setError(null);
    setShowIssues(false);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const close = useCallback(() => { reset(); onClose?.(); }, [reset, onClose]);

  // Monotonic request id. Re-mapping a column fires a fresh analysis, and a user clicking
  // through several columns quickly can have two in flight at once; without this, the
  // slower response can land last and show results for a mapping they already moved off.
  const analyzeSeq = useRef(0);

  // Analyse with an explicit mapping (used by the re-map path) or with none, letting the
  // server's detection stand on the first pass.
  const analyze = useCallback(async (nextFile, nextMapping) => {
    const seq = ++analyzeSeq.current;
    const current = () => seq === analyzeSeq.current;
    setAnalyzing(true);
    setError(null);
    try {
      const res = unwrap(await marketingAnalyticsApi.analyzeImport(token, nextFile, nextMapping));
      if (!current()) return;
      setAnalysis(res);
      // The server's effective mapping is authoritative — it is what the preview and the
      // counts were computed from, and what a commit would use.
      setMapping({
        school: res.mapping?.school || '',
        email: res.mapping?.email || '',
        location: res.mapping?.location || '',
      });
      setShowIssues(false);
    } catch (err) {
      if (!current()) return;
      setError(err?.message || 'That file could not be read.');
      setAnalysis(null);
    } finally {
      if (current()) setAnalyzing(false);
    }
  }, [token]);

  const pickFile = useCallback((chosen) => {
    if (!chosen) return;
    // Extension rather than MIME type: browsers and operating systems disagree about the
    // media type of .xls and .csv, so the extension is the only reliable signal here —
    // and the server checks it again regardless.
    if (!VALID_EXT.test(chosen.name)) {
      setError('Unsupported file type. Choose a CSV, XLSX or XLS file.');
      return;
    }
    if (!chosen.size) {
      setError('That file is empty.');
      return;
    }
    // A second file replaces the first outright (§24), so no mapping or preview from the
    // previous file can survive into this one.
    setAnalysis(null);
    setResult(null);
    setFile(chosen);
    analyze(chosen, null);
  }, [analyze]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer?.files?.[0]);
  };

  // Changing a column re-analyses, because every number below it — valid rows, resolved
  // locations, duplicates — is derived from the mapping and would otherwise be stale.
  const changeMapping = (field, value) => {
    const next = { ...mapping, [field]: value };
    setMapping(next);
    if (file) analyze(file, next);
  };

  const headerOptions = useMemo(() => {
    const headers = analysis?.headers || [];
    return [{ value: '', label: '— Not mapped —' }, ...headers.map((h) => ({ value: h, label: h }))];
  }, [analysis]);

  const summary = analysis?.summary;
  const ready = Boolean(analysis?.ready) && Boolean(summary?.valid);

  const step = !file ? 1 : !analysis?.ready ? 2 : 3;

  const doImport = async () => {
    if (!hasProject || !file || !ready) return;
    setImporting(true);
    setError(null);
    try {
      const res = unwrap(await marketingAnalyticsApi.commitImport(token, file, mapping, target));
      setResult(res);
      toast.success(
        `${fmt(res.inserted)} record${res.inserted === 1 ? '' : 's'} imported into ${res.projectName}.`,
        'Marketing data imported'
      );
      // The parent refreshes the map from the aggregate endpoint — no page reload (§20).
      // `res.projectId` is authoritative: the import may have targeted a project other
      // than the one the dashboard is currently showing, and the map must follow the data.
      onImported?.(res);
    } catch (err) {
      setError(err?.message || 'The import could not be completed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Drawer open={open} title="Import Marketing Data" onClose={close} className="max-w-2xl p-0">
      <div className="p-5">
        <p className="-mt-1 mb-4 text-xs text-neutral-500 dark:text-neutral-400">
          Import CSV or Excel marketing records to visualise their locations on the map.
        </p>

        {/* Where the data is going (§23). Chosen here rather than only on the page behind
            this panel: being told to go back, pick a project and reopen is a chore, and the
            decision belongs with the upload it governs. */}
        <div className="mb-4">
          {hasProject ? (
            <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-900">
              <span className="material-symbols-outlined text-[16px] text-neutral-500">folder_managed</span>
              <span className="min-w-0 flex-1 text-neutral-600 dark:text-neutral-300">
                Importing into <strong className="font-bold text-neutral-900 dark:text-white">{targetName}</strong>
              </span>
              {projects.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setTarget('')} disabled={importing}>
                  Change
                </Button>
              )}
            </div>
          ) : (
            <>
              <Select
                label="Import into project"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                options={projectOptions}
                disabled={!projects.length}
              />
              <p className="mt-1.5 text-[11px] text-neutral-500">
                {projects.length
                  ? 'Imported records belong to a project, so the map can show one project’s data without mixing in another’s.'
                  : 'No projects are available. The project list comes from the project database — if it is empty, there is nothing to import into yet.'}
              </p>
            </>
          )}
        </div>

        <StepRail current={result ? 3 : step} />

        {/* ── Result (§20) ─────────────────────────────────────────────── */}
        {result ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Marketing data imported successfully
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {[
                ['Records imported', fmt(result.inserted)],
                ['Locations mapped', fmt(result.locationsResolved)],
                result.locationsUnresolved > 0 && ['Not mapped', fmt(result.locationsUnresolved)],
                result.skippedAsExisting > 0 && ['Already imported', fmt(result.skippedAsExisting)],
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} className="rounded-lg bg-white/70 px-3 py-2 dark:bg-neutral-900/40">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{label}</dt>
                  <dd className="text-base font-black tabular-nums text-emerald-900 dark:text-emerald-100">{value}</dd>
                </div>
              ))}
            </dl>
            {result.locationsUnresolved > 0 && (
              <p className="mt-3 text-[11px] text-emerald-800 dark:text-emerald-200">
                Records whose location could not be resolved were still imported and are counted in the
                totals — they simply cannot be placed on the map.
              </p>
            )}
            {result.skippedAsExisting > 0 && (
              <p className="mt-2 text-[11px] text-emerald-800 dark:text-emerald-200">
                {fmt(result.skippedAsExisting)} row{result.skippedAsExisting === 1 ? ' was' : 's were'} already
                in this project and {result.skippedAsExisting === 1 ? 'was' : 'were'} not duplicated.
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="primary" size="sm" onClick={close}>View on map</Button>
              <Button type="button" variant="secondary" size="sm" onClick={reset}>Import another file</Button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Step 1: file (§4) ──────────────────────────────────── */}
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragging
                    ? 'border-primary bg-primary/5'
                    : 'border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900'
                }`}
              >
                <span className="material-symbols-outlined text-4xl text-neutral-400">upload_file</span>
                <p className="mt-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">Drop your file here</p>
                <p className="mt-0.5 text-xs text-neutral-500">or</p>
                <Button type="button" variant="secondary" size="sm" className="mt-2"
                  onClick={() => inputRef.current?.click()} disabled={!hasProject}>
                  Choose File
                </Button>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  CSV, XLSX or XLS
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
                <span className="material-symbols-outlined text-2xl text-neutral-400">description</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">{file.name}</p>
                  <p className="text-[11px] text-neutral-500">
                    {extOf(file.name)} · {fileSize(file.size)}
                    {analysis?.file?.rows ? ` · ${fmt(analysis.file.rows)} rows` : ''}
                    {analysis?.file?.sheetCount > 1 ? ` · sheet "${analysis.file.sheetName}"` : ''}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>Change</Button>
                <Button type="button" variant="ghost" size="sm" onClick={reset} aria-label="Remove file">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
              </div>
            )}

            {/* Only a worksheet's first sheet is read; say so rather than silently ignoring the rest. */}
            {analysis?.file?.sheetCount > 1 && (
              <p className="mt-2 text-[11px] text-neutral-500">
                This workbook has {analysis.file.sheetCount} sheets. Only the first, “{analysis.file.sheetName}”, is imported.
              </p>
            )}

            {error && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-900/20 dark:text-rose-200">
                <span className="material-symbols-outlined text-[15px]">error</span>
                <span>{error}</span>
              </p>
            )}

            {/* ── Step 2: column mapping (§6) ────────────────────────── */}
            {analyzing && (
              <div className="mt-4 space-y-2">
                <p className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  <span className="material-symbols-outlined animate-spin text-[15px]">progress_activity</span>
                  Reading file and resolving locations…
                </p>
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11" />)}
              </div>
            )}

            {analysis && !analyzing && (
              <>
                <div className="mt-5">
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white">Map your columns</h3>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Detected columns are preselected. Change any that are wrong.
                  </p>
                  <div className="mt-3 space-y-3">
                    {FIELDS.map((field) => (
                      <div key={field.key}>
                        <Select
                          label={`${field.label}${field.required ? '' : ' (optional)'}`}
                          value={mapping[field.key]}
                          onChange={(e) => changeMapping(field.key, e.target.value)}
                          options={headerOptions}
                          error={field.required && !mapping[field.key] ? `A ${field.label} column is required` : undefined}
                        />
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-500">
                          {analysis.detected?.[field.key] && analysis.detected[field.key] === mapping[field.key] ? (
                            <>
                              <span className="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span>
                              <span className="text-emerald-700 dark:text-emerald-300">
                                Automatically matched: {analysis.detected[field.key]}
                              </span>
                            </>
                          ) : field.hint}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Step 3: validation + preview (§17, §18) ────────── */}
                {summary && (
                  <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                    <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                      Validation · {fmt(summary.total)} record{summary.total === 1 ? '' : 's'} found
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Stat label="Will import" value={fmt(summary.valid)} tone="good" />
                      <Stat
                        label="Need attention"
                        value={fmt(summary.needsAttention)}
                        tone={summary.needsAttention ? 'warn' : 'neutral'}
                      />
                      <Stat label="Locations mapped" value={fmt(summary.locationsResolved)} tone="good" />
                      <Stat
                        label="Not mapped"
                        value={fmt(summary.locationsUnresolved)}
                        tone={summary.locationsUnresolved ? 'warn' : 'neutral'}
                        sub={summary.locationsUnresolved ? 'imported, not plotted' : undefined}
                      />
                    </div>

                    {summary.duplicates > 0 && (
                      <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                        {fmt(summary.duplicates)} duplicate row{summary.duplicates === 1 ? '' : 's'} inside the file
                        {summary.duplicates === 1 ? ' will' : ' will'} be imported once.
                      </p>
                    )}

                    {/* Rows with a problem, named so they can be fixed in the source file. */}
                    {analysis.issues?.length > 0 && (
                      <div className="mt-3">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowIssues((v) => !v)}
                          aria-expanded={showIssues}>
                          <span className="material-symbols-outlined mr-1 text-[15px]">
                            {showIssues ? 'expand_less' : 'expand_more'}
                          </span>
                          {showIssues ? 'Hide' : 'View'} {fmt(analysis.issues.length)} row
                          {analysis.issues.length === 1 ? '' : 's'} needing attention
                        </Button>
                        {showIssues && (
                          <div className="mt-2">
                            <DataTable
                              rows={analysis.issues}
                              rowKey="row"
                              columns={[
                                { key: 'row', header: 'Row', render: (r) => <span className="tabular-nums">{r.row}</span> },
                                { key: 'school', header: 'School' },
                                { key: 'location', header: 'Location' },
                                {
                                  key: 'issues',
                                  header: 'Issue',
                                  render: (r) => (
                                    <span className="text-amber-700 dark:text-amber-300">{r.issues.join('; ')}</span>
                                  ),
                                },
                              ]}
                            />
                            {analysis.issuesTruncated > 0 && (
                              <p className="mt-1.5 text-[11px] text-neutral-500">
                                Showing the first {fmt(analysis.issues.length)} — {fmt(analysis.issuesTruncated)} more
                                row{analysis.issuesTruncated === 1 ? '' : 's'} also need attention.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Preview, capped server-side (§17). */}
                    {analysis.preview?.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-xs font-black uppercase tracking-wide text-neutral-500">Preview</h4>
                        <p className="mt-0.5 mb-2 text-[11px] text-neutral-500">
                          Showing the first {fmt(analysis.preview.length)} of {fmt(summary.valid)} records that will be imported.
                        </p>
                        <DataTable
                          rows={analysis.preview}
                          /* Validation de-duplicates on exactly this triple, so it is
                             unique across the preview rows. */
                          rowKey={(r) => `${r.school}|${r.email}|${r.location}`}
                          columns={[
                            { key: 'school', header: 'School', render: (r) => <span className="font-semibold">{r.school}</span> },
                            { key: 'email', header: 'Email', render: (r) => <span className="font-mono text-xs">{r.email || '—'}</span> },
                            { key: 'location', header: 'Location' },
                            {
                              key: 'mapped',
                              header: 'On map',
                              render: (r) => (r.mapped ? (
                                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                  <span className="material-symbols-outlined text-[14px]">place</span>
                                  {r.city}
                                </span>
                              ) : (
                                <span className="text-xs text-amber-700 dark:text-amber-300">Not resolved</span>
                              )),
                            },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer actions stay reachable without scrolling back up a long preview. */}
      {!result && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-neutral-200 bg-white px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <Button type="button" variant="secondary" size="sm" onClick={close} disabled={importing}>Cancel</Button>
          <Button
            type="button" variant="primary" size="sm"
            onClick={doImport}
            disabled={!hasProject || !ready || importing || analyzing}
          >
            {importing ? (
              <>
                <span className="material-symbols-outlined mr-1 animate-spin text-[16px]">progress_activity</span>
                Importing…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined mr-1 text-[16px]">upload</span>
                {summary?.valid ? `Import ${fmt(summary.valid)} Record${summary.valid === 1 ? '' : 's'}` : 'Import Data'}
              </>
            )}
          </Button>
        </div>
      )}
    </Drawer>
  );
};

export default MarketingImportDrawer;
