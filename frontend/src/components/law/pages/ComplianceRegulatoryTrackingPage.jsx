import React from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';

const ComplianceRegulatoryTrackingPage = ({ searchTerm, onSearchChange, error, apiSummary, records = [], saving, onSaveRecord, onDeleteRecord }) => {
  const section = getLawSection('compliance');
  const filteredRecords = records.filter((record) =>
    `${record.title || ''} ${record.description || ''} ${record.referenceNumber || ''}`.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <header className="grid gap-6 lg:grid-cols-[1fr,360px]">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 dark:text-white">{section.title}</h1>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">{section.summary}</p>
          </div>
          <div className="rounded-xl bg-primary p-5 text-white">
            <p className="text-sm font-semibold opacity-80">Compliance Records</p>
            <p className="mt-2 text-4xl font-black">{apiSummary?.compliance || 0}</p>
            <p className="mt-1 text-sm opacity-80">Live backend placeholder count</p>
          </div>
        </header>

        {error && <p className="mt-4 text-sm text-yellow-600">{error}</p>}

        <input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="mt-6 h-11 w-full rounded-lg border border-neutral-200 px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          placeholder="Search compliance tasks..."
        />

        <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="font-bold text-neutral-900 dark:text-white">Regulatory Checklist</h2>
          <div className="mt-4 space-y-3">
            {filteredRecords.map((record) => (
              <label key={record._id} className="flex items-start gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                <input
                  type="checkbox"
                  className="mt-1 rounded text-primary focus:ring-primary"
                  checked={record.status === 'Active' || record.status === 'Ready'}
                  onChange={(event) =>
                    onSaveRecord?.(
                      { ...record, status: event.target.checked ? 'Ready' : 'Pending' },
                      record._id
                    )
                  }
                  disabled={saving}
                />
                <span className="flex-1">
                  <span className="block font-semibold text-neutral-900 dark:text-white">{record.title}</span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">{record.description || 'No description'}</span>
                  <span className="mt-1 block text-xs text-neutral-500">
                    {[record.metadata?.authority, record.metadata?.frequency, record.metadata?.evidenceLink].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold dark:bg-neutral-800">{record.priority}</span>
              </label>
            ))}
            {!filteredRecords.length && <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">No saved compliance records yet.</p>}
          </div>
        </section>
        <div className="mt-6">
          <LawRecordManager section="compliance" records={filteredRecords} saving={saving} onSaveRecord={onSaveRecord} onDeleteRecord={onDeleteRecord} title="Compliance Obligation Register" {...LAW_FORM_CONFIG.compliance} />
        </div>
      </div>
    </main>
  );
};

export default ComplianceRegulatoryTrackingPage;
