import React, { useState } from 'react';

const SkillTagInput = ({ skills = [], onChange }) => {
  const [name, setName] = useState('');

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" placeholder="Add skill" />
        <button
          onClick={() => {
            if (!name.trim()) return;
            onChange([...skills, { name: name.trim(), level: 'Intermediate', years: 0 }]);
            setName('');
          }}
          className="rounded-lg bg-primary px-3 py-2 text-white"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((s, i) => (
          <span key={`${s.name}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs dark:bg-neutral-800">
            {s.name}
            <button onClick={() => onChange(skills.filter((_, idx) => idx !== i))} className="text-neutral-500">x</button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default React.memo(SkillTagInput);
