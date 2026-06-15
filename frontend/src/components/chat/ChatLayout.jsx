import React from 'react';

const ChatLayout = ({ sidebar, window }) => {
  return (
    <main className="flex h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#0a1018]">
      {sidebar}
      {window}
    </main>
  );
};

export default React.memo(ChatLayout);
