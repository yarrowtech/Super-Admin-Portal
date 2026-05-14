import React from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';

const LegalReportingAuditSupportPage = ({ searchTerm, onSearchChange, error, apiSummary, records = [], saving, onSaveRecord, onDeleteRecord }) => {
  const section = getLawSection('reporting');
  const filteredRecords = records.filter((record) =>
    `${record.title || ''} ${record.description || ''} ${record.referenceNumber || ''}`.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[1fr,420px]">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 dark:text-white">{section.title}</h1>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">{section.summary}</p>
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              className="mt-5 h-11 w-full rounded-lg border border-neutral-200 px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              placeholder="Search reports and audit logs..."
            />
            {error && <p className="mt-4 text-sm text-yellow-600">{error}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-neutral-900 p-5 text-white dark:bg-white dark:text-neutral-900">
              <p className="text-sm font-semibold opacity-70">Contracts</p>
              <p className="mt-2 text-3xl font-black">{apiSummary?.contracts || 0}</p>
            </div>
            <div className="rounded-xl bg-primary p-5 text-white">
              <p className="text-sm font-semibold opacity-80">Compliance</p>
              <p className="mt-2 text-3xl font-black">{apiSummary?.compliance || 0}</p>
            </div>
          </div>
        </div>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr,1fr]">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="font-bold text-neutral-900 dark:text-white">Report Generator</h2>
            <div className="mt-4 grid gap-3">
              {filteredRecords.map((record) => (
                <button key={record._id} className="rounded-lg border border-neutral-200 p-4 text-left hover:border-primary dark:border-neutral-800">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-neutral-900 dark:text-white">{record.title}</span>
                    <span className="text-xs font-bold text-primary">{record.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{record.description || 'No description'}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {[record.metadata?.period, record.metadata?.audience, record.metadata?.exportFormat].filter(Boolean).join(' · ')}
                  </p>
                </button>
              ))}
              {!filteredRecords.length && <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">No saved report records yet.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="font-bold text-neutral-900 dark:text-white">Real-time Audit Timeline</h2>
            <div className="mt-5 space-y-5">
              {filteredRecords.slice(0, 4).map((record, index) => (
                <div key={record._id} className="flex gap-4">
                  <span className="mt-1 size-3 rounded-full bg-primary"></span>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">{record.title}</p>
                    <p className="text-sm text-neutral-500">Log #{index + 1} · {record.status}</p>
                  </div>
                </div>
              ))}
              {!filteredRecords.length && <p className="text-sm text-neutral-500">Audit timeline will appear after report records are created.</p>}
            </div>
          </div>
        </section>
        <div className="mt-6">
          <LawRecordManager section="reporting" records={filteredRecords} saving={saving} onSaveRecord={onSaveRecord} onDeleteRecord={onDeleteRecord} title="Legal Reporting Register" {...LAW_FORM_CONFIG.reporting} />
        </div>
      </div>
    </main>
  );
};

export default LegalReportingAuditSupportPage;
