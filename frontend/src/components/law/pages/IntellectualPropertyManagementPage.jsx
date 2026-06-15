import React from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';

const IntellectualPropertyManagementPage = ({ searchTerm, onSearchChange, error, records = [], saving, onSaveRecord, onDeleteRecord }) => {
  const section = getLawSection('ip-management');
  const filteredRecords = records.filter((record) =>
    `${record.title || ''} ${record.description || ''} ${record.referenceNumber || ''}`.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Ownership Registry</p>
            <h1 className="text-3xl font-black text-neutral-900 dark:text-white">{section.title}</h1>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">{section.summary}</p>
          </div>
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-lg border border-neutral-200 px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900 md:max-w-sm"
            placeholder="Search IP records..."
          />
        </div>
        {error && <p className="mt-4 text-sm text-yellow-600">{error}</p>}

        <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {filteredRecords.map((record) => (
            <article key={record._id} className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="absolute right-4 top-4 rounded-full bg-primary/10 p-2 text-primary">
                <span className="material-symbols-outlined">copyright</span>
              </div>
              <h2 className="pr-12 font-bold text-neutral-900 dark:text-white">{record.title}</h2>
              <p className="mt-3 min-h-12 text-sm text-neutral-500 dark:text-neutral-400">{record.description || 'No description'}</p>
              <p className="mt-2 text-xs text-neutral-500">
                {[record.metadata?.jurisdiction, record.metadata?.classOrRepository].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-6 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  <span className="font-bold text-primary">{record.status}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-neutral-500">Renewal Risk</span>
                  <span className="font-bold">{record.priority}</span>
                </div>
              </div>
            </article>
          ))}
          {!filteredRecords.length && <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">No saved IP records yet.</p>}
        </section>
        <div className="mt-6">
          <LawRecordManager section="ip-management" records={filteredRecords} saving={saving} onSaveRecord={onSaveRecord} onDeleteRecord={onDeleteRecord} title="IP Asset Register" {...LAW_FORM_CONFIG['ip-management']} />
        </div>
      </div>
    </main>
  );
};

export default IntellectualPropertyManagementPage;
