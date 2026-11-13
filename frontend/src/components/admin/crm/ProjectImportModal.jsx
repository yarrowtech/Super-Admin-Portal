/**
 * Excel upload scoped to one project.
 *
 * The full Import module asks which project to import into. Here the operator
 * already stands inside a project, so that question is answered and removed:
 * pick a file, confirm what was detected, commit. The project is passed through
 * to /import/commit from the card, never from a select the user could mis-set.
 *
 * Same two-phase contract as the Import module — /import/analyze writes nothing,
 * so the counts and row issues on screen are seen before anything is persisted.
 */
import { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../../../config/backend';
import { useToast } from '../../../context/ToastContext';
import Button from '../../common/Button';
import StatusBadge from '../../common/StatusBadge';
import Modal from '../../ui/Modal';
import Select from '../../ui/Select';
import { SINGLE_DEPT_OPTIONS } from './crmShared';

// Mapping targets, in the order they read on screen. Mirrors the Import module's
// FIELDS — both describe the same service-side mapping contract.
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
  { key: 'source',         label: 'Source' },
  { key: 'campaignSource', label: 'Campaign Source' },
  { key: 'notes',          label: 'Notes' },
];

const MODE_OPTIONS = [
  { value: 'skip',   label: 'Skip clients that already exist' },
  { value: 'update', label: 'Update clients that already exist' },
];

/** multipart POST — the shared apiFetch forces JSON, which breaks file upload. */
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

function Tiles({ summary }) {
  if (!summary) return null;
  const tiles = [
    { label: 'Rows',       value: summary.total,          cls: 'text-neutral-600 dark:text-neutral-300' },
    { label: 'Will import', value: summary.valid,         cls: 'text-emerald-600' },
    { label: 'Attention',  value: summary.needsAttention, cls: 'text-amber-600' },
    { label: 'Duplicates', value: summary.duplicates,     cls: 'text-sky-600' },
    { label: 'Skipped',    value: summary.skipped,        cls: 'text-rose-600' },
  ];
  return (
    <div className="grid grid-cols-5 gap-2">
      {tiles.map(t => (
        <div key={t.label} className="rounded-xl border border-neutral-200 bg-white p-2.5 text-center dark:border-neutral-700 dark:bg-neutral-800/50">
          <p className={`text-xl font-black tabular-nums ${t.cls}`}>{t.value ?? 0}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function ProjectImportModal({ open, onClose, project, token, department, onImported }) {
  const toast = useToast();
  const fileRef = useRef(null);

  const [file, setFile]         = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [mapping, setMapping]   = useState({});
  const [sheet, setSheet]       = useState('');
  const [mode, setMode]         = useState('skip');
  const [importDept, setImportDept] = useState(department === 'all' ? 'media' : department);
  const [busy, setBusy]         = useState(false);
  const [result, setResult]     = useState(null);
  const [showMapping, setShowMapping] = useState(false);

  // Each open starts clean: a file left over from the previous project would be
  // committed into this one on a single click.
  useEffect(() => {
    if (!open) return;
    setFile(null); setAnalysis(null); setMapping({}); setSheet('');
    setResult(null); setMode('skip'); setShowMapping(false);
    setImportDept(department === 'all' ? 'media' : department);
    if (fileRef.current) fileRef.current.value = '';
  }, [open, project?.projectId, department]);

  const runAnalyze = async (target, overrides = {}) => {
    const f = target || file;
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('department', overrides.department ?? importDept);
      if (overrides.sheet ?? sheet) fd.append('sheet', overrides.sheet ?? sheet);
      if (overrides.mapping) fd.append('mapping', JSON.stringify(overrides.mapping));

      const { data } = await postFile('/import/analyze', token, fd);
      setAnalysis(data);
      setMapping(data.mapping || {});
      if (data.file?.sheetName) setSheet(data.file.sheetName);
      // Open the mapping panel only when the file needs it, so a clean sheet
      // goes straight to the counts.
      setShowMapping(!data.ready);
    } catch (err) {
      toast.error(err.message);
      setAnalysis(null);
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

  const commit = async () => {
    if (!project?.projectId) {
      toast.error('This group has no project to import into. Assign these clients to a project first.');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('projectId', project.projectId);
      fd.append('department', importDept);
      fd.append('mode', mode);
      if (sheet) fd.append('sheet', sheet);
      fd.append('mapping', JSON.stringify(mapping));

      const { data } = await postFile('/import/commit', token, fd);
      setResult(data);
      toast.success(`Imported ${data.created} client${data.created === 1 ? '' : 's'} into ${project.projectName}`);
      onImported?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const headerOptions = [
    { value: '', label: '— Not mapped —' },
    ...(analysis?.headers || []).map(h => ({ value: h, label: h })),
  ];

  const canCommit = Boolean(file && analysis?.ready && !busy && project?.projectId);

  return (
    <Modal
      open={open}
      title={`Upload Excel — ${project?.projectName || 'Project'}`}
      description="Clients from this file are created under this project. Nothing is written until you confirm."
      onClose={onClose}
      className="max-w-3xl"
      footer={
        result ? (
          <div className="flex justify-end gap-2">
            <Button variant="accent" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="accent" onClick={commit} loading={busy} disabled={!canCommit}>
              {analysis ? `Import ${analysis.summary?.valid ?? 0} client${analysis.summary?.valid === 1 ? '' : 's'}` : 'Import'}
            </Button>
          </div>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <span className="material-symbols-outlined text-[28px] text-emerald-600">task_alt</span>
            <div>
              <p className="font-bold text-emerald-900 dark:text-emerald-200">Import complete</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {result.created} created · {result.updated} updated · {result.skipped} skipped
                {result.failed > 0 && ` · ${result.failed} failed`}
              </p>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            Batch <span className="font-mono">{result.batchId}</span> — undo it from the import history on this project.
          </p>
          {result.failures?.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-rose-200 dark:border-rose-900">
              <ul className="divide-y divide-rose-100 text-xs dark:divide-rose-900/50">
                {result.failures.map((f, i) => (
                  <li key={i} className="px-3 py-2">
                    <span className="font-mono text-rose-500">Row {f.row}</span>{' '}
                    <span className="text-neutral-700 dark:text-neutral-300">{f.name || '—'}</span>
                    <span className="block text-rose-600">{f.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {!project?.projectId && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              These clients are not linked to a project, so there is nothing to import into. Assign them to a project first.
            </p>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
            className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/40'
            }`}
          >
            <span className="material-symbols-outlined text-[32px] text-neutral-400">
              {file ? 'description' : 'cloud_upload'}
            </span>
            <p className="mt-1 text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {file ? file.name : 'Drop an .xlsx, .xls or .csv file here'}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {file ? `${(file.size / 1024).toFixed(0)} KB` : 'or choose one from your computer'}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => fileRef.current?.click()}
              icon={<span className="material-symbols-outlined text-base">attach_file</span>}
            >
              {file ? 'Choose a different file' : 'Choose file'}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Import as department"
              name="importDept"
              value={importDept}
              onChange={(e) => { setImportDept(e.target.value); if (file) runAnalyze(file, { department: e.target.value }); }}
              options={SINGLE_DEPT_OPTIONS}
              helperText="Used for rows whose own Department cell is blank or unreadable"
            />
            <Select
              label="If a client already exists"
              name="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              options={MODE_OPTIONS}
              helperText="Matched by email or name within this project"
            />
          </div>

          {busy && !analysis && (
            <p className="text-center text-sm text-neutral-500">Reading the file…</p>
          )}

          {analysis && (
            <>
              <Tiles summary={analysis.summary} />

              {analysis.file?.sheetNames?.length > 1 && (
                <Select
                  label="Sheet"
                  name="sheet"
                  value={sheet}
                  onChange={(e) => { setSheet(e.target.value); runAnalyze(file, { sheet: e.target.value }); }}
                  options={analysis.file.sheetNames.map(s => ({ value: s, label: s }))}
                />
              )}

              {!analysis.ready && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                  Client Name could not be detected. Map it below before importing.
                </p>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => setShowMapping(v => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-200 px-3 py-2 text-left text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800/50"
                  aria-expanded={showMapping}
                >
                  Column mapping
                  <span className={`material-symbols-outlined text-[18px] transition-transform ${showMapping ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
                {showMapping && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {FIELDS.map(f => (
                      <Select
                        key={f.key}
                        label={f.required ? `${f.label} *` : f.label}
                        name={`map-${f.key}`}
                        value={mapping[f.key] || ''}
                        onChange={(e) => {
                          const next = { ...mapping, [f.key]: e.target.value };
                          if (!e.target.value) delete next[f.key];
                          setMapping(next);
                          runAnalyze(file, { mapping: next });
                        }}
                        options={headerOptions}
                      />
                    ))}
                  </div>
                )}
              </div>

              {analysis.issues?.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-xl border border-amber-200 dark:border-amber-900">
                  <ul className="divide-y divide-amber-100 text-xs dark:divide-amber-900/50">
                    {analysis.issues.map((it, i) => (
                      <li key={i} className="flex items-start gap-2 px-3 py-2">
                        <StatusBadge tone={it.level === 'error' ? 'danger' : 'warning'} label={`Row ${it.row}`} dot={false} />
                        <span className="text-neutral-700 dark:text-neutral-300">{it.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.preview?.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 dark:bg-neutral-800">
                      <tr>
                        {['Name', 'Contact', 'Email', 'Dept', 'Status'].map(h => (
                          <th key={h} className="px-3 py-2 font-bold uppercase tracking-wider text-neutral-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {analysis.preview.map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-semibold text-neutral-900 dark:text-neutral-100">{r.name || '—'}</td>
                          <td className="px-3 py-1.5 text-neutral-500">{r.contactPerson || '—'}</td>
                          <td className="px-3 py-1.5 text-neutral-500">{r.email || '—'}</td>
                          <td className="px-3 py-1.5 text-neutral-500">{r.department || '—'}</td>
                          <td className="px-3 py-1.5 text-neutral-500">{r.status || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
