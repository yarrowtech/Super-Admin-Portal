import React from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';

const RiskAssessmentLegalAdvisoryPage = ({ searchTerm, onSearchChange, error, records = [], saving, onSaveRecord, onDeleteRecord }) => {
  const section = getLawSection('risk-advisory');
  const filteredRecords = records.filter((record) =>
    `${record.title || ''} ${record.description || ''} ${record.referenceNumber || ''}`.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <aside className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <span className="material-symbols-outlined text-4xl text-primary">health_and_safety</span>
            <h1 className="mt-4 text-2xl font-black text-neutral-900 dark:text-white">{section.title}</h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{section.summary}</p>
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              className="mt-5 h-11 w-full rounded-lg border border-neutral-200 px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="Search risks..."
            />
            {error && <p className="mt-4 text-sm text-yellow-600">{error}</p>}
          </aside>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredRecords.map((record) => (
              <article key={record._id} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex justify-between gap-3">
                  <h2 className="font-bold text-neutral-900 dark:text-white">{record.title}</h2>
                  <span className="text-xs font-black uppercase text-red-500">{record.priority}</span>
                </div>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{record.description || 'No description'}</p>
                {record.metadata?.recommendedAction && (
                  <p className="mt-3 rounded-lg bg-primary/10 p-3 text-sm font-semibold text-primary">
                    {record.metadata.recommendedAction}
                  </p>
                )}
                <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-lg border border-neutral-200 text-center text-xs font-bold dark:border-neutral-800">
                  <span className="bg-green-50 py-3 text-green-700 dark:bg-green-500/10">Low</span>
                  <span className="bg-yellow-50 py-3 text-yellow-700 dark:bg-yellow-500/10">Med</span>
                  <span className="bg-red-50 py-3 text-red-700 dark:bg-red-500/10">{record.status}</span>
                </div>
              </article>
            ))}
            {!filteredRecords.length && <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">No saved risk records yet.</p>}
          </section>
        </div>
        <div className="mt-6">
          <LawRecordManager section="risk-advisory" records={filteredRecords} saving={saving} onSaveRecord={onSaveRecord} onDeleteRecord={onDeleteRecord} title="Legal Advisory Queue" {...LAW_FORM_CONFIG['risk-advisory']} />
        </div>
      </div>
    </main>
  );
};

export default RiskAssessmentLegalAdvisoryPage;
