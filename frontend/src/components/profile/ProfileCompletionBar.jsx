import React from 'react';

const ProfileCompletionBar = ({ value = 0, suggestions = [] }) => {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs font-semibold">
        <span>Profile Completion</span>
        <span>{safeValue}%</span>
      </div>
      <div className="h-2 rounded bg-neutral-200 dark:bg-neutral-800">
        <div className="h-2 rounded bg-primary transition-all duration-300" style={{ width: `${safeValue}%` }} />
      </div>
      <div className="mt-2 rounded-lg bg-neutral-50 p-2 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
        <p className="mb-1 font-semibold">Suggestions</p>
        <ul className="space-y-1">
          {suggestions.length > 0 ? suggestions.map((item) => <li key={item}>• {item}</li>) : <li>• Keep profile updated</li>}
        </ul>
      </div>
    </div>
  );
};

export default React.memo(ProfileCompletionBar);
