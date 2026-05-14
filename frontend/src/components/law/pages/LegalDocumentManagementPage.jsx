import React, { useRef } from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';

const LegalDocumentManagementPage = ({ searchTerm, onSearchChange, error, records = [], saving, onSaveRecord, onDeleteRecord }) => {
  const section = getLawSection('documents');
  const uploadFormRef = useRef(null);
  const filteredRecords = records.filter((record) =>
    `${record.title || ''} ${record.description || ''} ${record.referenceNumber || ''}`.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );
  const selectedRecord = filteredRecords[0] || null;
  const folders = [
    { key: 'NDA', label: 'NDAs', icon: 'folder_shared' },
    { key: 'MSA', label: 'MSA / SOW', icon: 'folder_managed' },
    { key: 'DPA', label: 'Privacy / DPA', icon: 'encrypted' },
    { key: 'Policy', label: 'Policies', icon: 'policy' },
    { key: 'Vendor', label: 'Vendor Files', icon: 'source_environment' },
    { key: 'Employment', label: 'Employment', icon: 'badge' },
  ].map((folder) => ({
    ...folder,
    count: records.filter((record) =>
      `${record.metadata?.recordType || ''} ${record.title || ''}`.toLowerCase().includes(folder.key.toLowerCase())
    ).length,
  }));

  const documentStats = [
    ['All Files', records.length, 'description'],
    ['In Review', records.filter((record) => record.status === 'In Review').length, 'rate_review'],
    ['Expiring', records.filter((record) => record.priority === 'Critical' || record.status === 'Attention').length, 'event_busy'],
    ['Approved', records.filter((record) => record.status === 'Ready' || record.status === 'Active').length, 'verified'],
  ];
  const focusUploadForm = () => {
    uploadFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      uploadFormRef.current?.querySelector('input, select, textarea')?.focus();
    }, 250);
  };

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Legal File Manager</p>
            <h1 className="text-3xl font-black text-neutral-900 dark:text-white">{section.title}</h1>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">Store, search, classify, review, and track every legal document.</p>
          </div>
          <div className="flex w-full flex-wrap gap-3 md:w-auto">
            <label className="flex h-11 min-w-72 flex-1 rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <span className="material-symbols-outlined flex items-center px-3 text-neutral-500">search</span>
              <input
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
                className="flex-1 border-0 bg-transparent text-sm focus:ring-0"
                placeholder="Search files, versions, references..."
              />
            </label>
            <button
              type="button"
              onClick={focusUploadForm}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white"
            >
              <span className="material-symbols-outlined text-xl">upload_file</span>
              Upload Document
            </button>
          </div>
        </div>

        {error && <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-200">{error}</div>}

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {documentStats.map(([title, value, icon]) => (
            <div key={title} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <span className="material-symbols-outlined text-primary">{icon}</span>
              <p className="mt-3 text-2xl font-black text-neutral-900 dark:text-white">{value}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-500 dark:text-neutral-400">{title}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[260px,1fr,320px]">
          <aside className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-neutral-900 dark:text-white">Folders</h2>
              <span className="material-symbols-outlined text-neutral-500">create_new_folder</span>
            </div>
            <div className="mt-4 space-y-2">
              {folders.map((folder) => (
                <div key={folder.key} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">{folder.icon}</span>
                    <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{folder.label}</span>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-500 dark:bg-neutral-800">{folder.count}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="grid grid-cols-[1fr,130px,120px,120px] gap-3 border-b border-neutral-200 px-4 py-3 text-xs font-bold uppercase text-neutral-500 dark:border-neutral-800">
              <span>File</span>
              <span>Status</span>
              <span>Owner</span>
              <span>Modified</span>
            </div>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredRecords.map((record) => (
                <button key={record._id} type="button" className="grid w-full grid-cols-[1fr,130px,120px,120px] gap-3 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="material-symbols-outlined text-primary">draft</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-neutral-900 dark:text-white">{record.title}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {[record.metadata?.recordType, record.metadata?.version, record.referenceNumber].filter(Boolean).join(' · ') || 'Unclassified legal file'}
                      </p>
                    </div>
                  </div>
                  <span className="self-center rounded-full bg-blue-100 px-3 py-1 text-center text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{record.status}</span>
                  <span className="self-center truncate text-sm text-neutral-600 dark:text-neutral-300">{record.owner || 'Unassigned'}</span>
                  <span className="self-center text-sm text-neutral-500">{record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : '-'}</span>
                </button>
              ))}
              {!filteredRecords.length && (
                <p className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">No legal files found. Add a document below to populate this file manager.</p>
              )}
            </div>
          </div>

          <aside className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="font-bold text-neutral-900 dark:text-white">File Details</h2>
            {selectedRecord ? (
              <div className="mt-4 space-y-4">
                <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-3xl">description</span>
                </div>
                <div>
                  <p className="font-bold text-neutral-900 dark:text-white">{selectedRecord.title}</p>
                  <p className="text-sm text-neutral-500">{selectedRecord.description || 'No description'}</p>
                </div>
                {[
                  ['Type', selectedRecord.metadata?.recordType],
                  ['Version', selectedRecord.metadata?.version],
                  ['Repository', selectedRecord.metadata?.repository],
                  ['Confidentiality', selectedRecord.metadata?.confidentiality],
                  ['Renewal Cycle', selectedRecord.metadata?.renewalCycle],
                  ['Reference', selectedRecord.referenceNumber],
                  ['Due Date', selectedRecord.dueDate ? new Date(selectedRecord.dueDate).toLocaleDateString() : null],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 border-b border-neutral-100 pb-2 text-sm dark:border-neutral-800">
                    <span className="text-neutral-500">{label}</span>
                    <span className="text-right font-semibold text-neutral-800 dark:text-neutral-100">{value || '-'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">Select or create a legal file to see metadata.</p>
            )}
          </aside>
        </section>

        <div ref={uploadFormRef} className="mt-6 scroll-mt-6">
          <LawRecordManager section="documents" records={filteredRecords} saving={saving} onSaveRecord={onSaveRecord} onDeleteRecord={onDeleteRecord} title="Document Control Register" {...LAW_FORM_CONFIG.documents} />
        </div>
      </div>
    </main>
  );
};

export default LegalDocumentManagementPage;
