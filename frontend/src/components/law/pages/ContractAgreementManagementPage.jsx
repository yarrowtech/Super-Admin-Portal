import React from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';

const columns = ['Draft', 'In Review', 'Active', 'Pending'];

const ContractAgreementManagementPage = ({ searchTerm, onSearchChange, error, records = [], saving, onSaveRecord, onDeleteRecord }) => {
  const section = getLawSection('contracts');
  const filteredRecords = records.filter((record) =>
    `${record.title || ''} ${record.description || ''} ${record.referenceNumber || ''}`.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 dark:text-white">{section.title}</h1>
              <p className="mt-1 text-neutral-500 dark:text-neutral-400">{section.summary}</p>
            </div>
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-11 w-full rounded-lg border border-neutral-200 px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800 md:max-w-sm"
              placeholder="Search agreements..."
            />
          </div>
          {error && <p className="mt-4 text-sm text-yellow-600 dark:text-yellow-300">{error}</p>}
        </div>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {columns.map((column) => (
            <div key={column} className="min-h-96 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-neutral-900 dark:text-white">{column}</h2>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-neutral-500 dark:bg-neutral-900">
                  {filteredRecords.filter((record) => record.status === column).length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredRecords
                  .filter((record) => record.status === column || (column === 'Active' && record.status === 'Attention'))
                  .map((record) => (
                    <article key={record._id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                      <p className="font-semibold text-neutral-900 dark:text-white">{record.title}</p>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{record.description || 'No description'}</p>
                      <div className="mt-2 space-y-1 text-xs text-neutral-500">
                        {record.metadata?.counterparty && <p>Counterparty: {record.metadata.counterparty}</p>}
                        {record.metadata?.contractValue && <p>Value: {record.metadata.contractValue}</p>}
                        {record.metadata?.renewalDate && <p>Renewal: {new Date(record.metadata.renewalDate).toLocaleDateString()}</p>}
                      </div>
                      <div className="mt-3 flex justify-between text-xs font-bold">
                        <span className="text-primary">{record.status}</span>
                        <span>{record.priority}</span>
                      </div>
                    </article>
                  ))}
              </div>
            </div>
          ))}
        </section>
        <div className="mt-6">
          <LawRecordManager section="contracts" records={filteredRecords} saving={saving} onSaveRecord={onSaveRecord} onDeleteRecord={onDeleteRecord} title="Contract Lifecycle Register" {...LAW_FORM_CONFIG.contracts} />
        </div>
      </div>
    </main>
  );
};

export default ContractAgreementManagementPage;
