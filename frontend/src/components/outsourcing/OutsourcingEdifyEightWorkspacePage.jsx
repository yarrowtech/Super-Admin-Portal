import { useState } from 'react';
import OutsourcingEdifyEightTeachersPage from './OutsourcingEdifyEightTeachersPage';
import OutsourcingEdifyEightStudyMaterialsPage from './OutsourcingEdifyEightStudyMaterialsPage';

const tabs = [
  { key: 'teachers', label: 'Teachers', icon: 'school' },
  { key: 'materials', label: 'Study Materials', icon: 'article' },
];

export default function OutsourcingEdifyEightWorkspacePage() {
  const [activeTab, setActiveTab] = useState('teachers');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-lg border border-neutral-200 bg-white p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'teachers' ? <OutsourcingEdifyEightTeachersPage /> : <OutsourcingEdifyEightStudyMaterialsPage />}
    </div>
  );
}
