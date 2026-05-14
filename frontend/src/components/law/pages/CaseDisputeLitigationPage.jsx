import React from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';

const CaseDisputeLitigationPage = ({ searchTerm, onSearchChange, error, records = [], saving, onSaveRecord, onDeleteRecord }) => {
  const section = getLawSection('cases');
  const filteredRecords = records.filter((record) =>
    `${record.title || ''} ${record.description || ''} ${record.referenceNumber || ''}`.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 dark:text-white">{section.title}</h1>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">{section.summary}</p>
          </div>
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-lg border border-neutral-200 px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900 md:max-w-sm"
            placeholder="Search cases, filings, evidence..."
          />
        </div>
        {error && <p className="mt-4 text-sm text-yellow-600">{error}</p>}

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr,340px]">
          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
              <h2 className="font-bold text-neutral-900 dark:text-white">Case Docket</h2>
            </div>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredRecords.map((record) => (
                <article key={record._id} className="p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white">{record.title}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{record.description || 'No description'}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {[record.metadata?.opposingParty, record.metadata?.forum, record.metadata?.claimAmount].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className="h-fit rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-500/10 dark:text-red-300">{record.priority}</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div className="h-2 w-2/3 rounded-full bg-primary"></div>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-neutral-500">{record.status}</p>
                </article>
              ))}
              {!filteredRecords.length && <p className="p-6 text-center text-sm text-neutral-500">No saved case records yet.</p>}
            </div>
          </div>

          <aside className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="font-bold text-neutral-900 dark:text-white">Hearing Calendar</h2>
            <div className="mt-4 space-y-4">
              {filteredRecords.slice(0, 3).map((record) => (
                <div key={record._id} className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-950/40">
                  <p className="text-xs font-bold text-primary">{record.dueDate ? new Date(record.dueDate).toLocaleDateString() : 'No date'}</p>
                  <p className="font-semibold text-neutral-900 dark:text-white">{record.title}</p>
                </div>
              ))}
              {!filteredRecords.length && <p className="text-sm text-neutral-500">Calendar is empty until case records are created.</p>}
            </div>
          </aside>
        </section>
        <div className="mt-6">
          <LawRecordManager section="cases" records={filteredRecords} saving={saving} onSaveRecord={onSaveRecord} onDeleteRecord={onDeleteRecord} title="Matter and Dispute Register" {...LAW_FORM_CONFIG.cases} />
        </div>
      </div>
    </main>
  );
};

export default CaseDisputeLitigationPage;
