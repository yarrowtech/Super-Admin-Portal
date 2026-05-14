import React from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';

const LawOpsPage = ({ sectionId, searchTerm, onSearchChange, error, records = [], saving, onSaveRecord, onDeleteRecord }) => {
  const section = getLawSection(sectionId);
  const config = LAW_FORM_CONFIG[sectionId] || {};
  const filteredRecords = records.filter((record) =>
    `${record.title || ''} ${record.description || ''} ${record.referenceNumber || ''}`.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-3xl font-black text-neutral-900 dark:text-white">{section.title}</h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">{section.summary}</p>
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="mt-4 h-11 w-full rounded-lg border border-neutral-200 px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            placeholder={`Search ${section.navLabel.toLowerCase()} records...`}
          />
          {error && <p className="mt-3 text-sm text-yellow-600 dark:text-yellow-300">{error}</p>}
        </header>
        <div className="mt-6">
          <LawRecordManager
            section={sectionId}
            records={filteredRecords}
            saving={saving}
            onSaveRecord={onSaveRecord}
            onDeleteRecord={onDeleteRecord}
            title={`${section.navLabel} Register`}
            {...config}
          />
        </div>
      </div>
    </main>
  );
};

export default LawOpsPage;
