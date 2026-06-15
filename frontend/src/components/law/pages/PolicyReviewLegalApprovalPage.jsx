import React from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';

const PolicyReviewLegalApprovalPage = ({ searchTerm, onSearchChange, error, records = [], saving, onSaveRecord, onDeleteRecord }) => {
  const section = getLawSection('policy-review');
  const filteredRecords = records.filter((record) =>
    `${record.title || ''} ${record.description || ''} ${record.referenceNumber || ''}`.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );
  const updateStatus = (record, status, notes) => {
    onSaveRecord?.(
      {
        ...record,
        status,
        notes: notes || record.notes || '',
      },
      record._id
    );
  };

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 dark:text-white">{section.title}</h1>
              <p className="mt-1 text-neutral-500 dark:text-neutral-400">{section.summary}</p>
            </div>
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-11 w-full rounded-lg border border-neutral-200 px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800 md:max-w-sm"
              placeholder="Search policies..."
            />
          </div>
          {error && <p className="mt-4 text-sm text-yellow-600">{error}</p>}
        </div>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr,420px]">
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <article key={record._id} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">{record.title}</p>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{record.description || 'No description'}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {[record.metadata?.affectedProduct, record.metadata?.jurisdiction, record.metadata?.publicationDate].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="h-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{record.status}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => updateStatus(record, 'Ready', 'Approved by Law Department')}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => updateStatus(record, 'Archived', 'Rejected by Law Department')}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => updateStatus(record, 'Attention', 'Changes requested by Law Department')}
                    className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700 disabled:opacity-60 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    Request Changes
                  </button>
                  <span className="ml-auto text-sm font-bold text-neutral-500">{record.priority}</span>
                </div>
              </article>
            ))}
            {!filteredRecords.length && <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">No saved policy review records yet.</p>}
          </div>

          <aside className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="font-bold text-neutral-900 dark:text-white">Pending Approvals</h2>
            <div className="mt-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
              {filteredRecords.filter((record) => record.status === 'Pending' || record.status === 'In Review').map((record) => (
                <p key={record._id} className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950/40">{record.title}</p>
              ))}
              {!filteredRecords.some((record) => record.status === 'Pending' || record.status === 'In Review') && (
                <p className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950/40">No pending approvals.</p>
              )}
            </div>
          </aside>
        </section>
        <div className="mt-6">
          <LawRecordManager section="policy-review" records={filteredRecords} saving={saving} onSaveRecord={onSaveRecord} onDeleteRecord={onDeleteRecord} title="Policy Approval Register" {...LAW_FORM_CONFIG['policy-review']} />
        </div>
      </div>
    </main>
  );
};

export default PolicyReviewLegalApprovalPage;
