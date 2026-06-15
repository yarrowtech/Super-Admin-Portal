import React, { useState } from 'react';

const ResumeUploader = ({ resumeUrl, onUpload }) => {
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    onUpload(file);
  };

  return (
    <div className="space-y-3">
      <label
        className={`flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed p-6 text-sm transition ${
          dragging ? 'border-primary bg-primary/5' : 'border-neutral-300 dark:border-neutral-700'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        Drag & drop PDF or click to upload
      </label>
      {resumeUrl ? <a href={resumeUrl} target="_blank" rel="noreferrer" className="text-primary underline">Preview / Download Resume</a> : <p className="text-sm text-neutral-500">No resume uploaded.</p>}
    </div>
  );
};

export default React.memo(ResumeUploader);
