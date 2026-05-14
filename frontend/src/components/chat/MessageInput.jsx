import React from 'react';

export default function MessageInput({ value, onChange, onSend, onTyping }) {
  return (
    <form
      onSubmit={onSend}
      className="sticky bottom-0 flex gap-2 border-t border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-[#0a1018]"
    >
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onTyping(Boolean(e.target.value.trim()));
        }}
        placeholder="Type a message..."
        className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
        Send
      </button>
    </form>
  );
}

