import React from 'react';

export default function MessageBubble({ message, own }) {
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${own ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
        <p>{message.body || message.content}</p>
        <p className={`mt-1 text-[10px] ${own ? 'text-white/80' : 'text-neutral-500'}`}>{new Date(message.sentAt || message.createdAt || Date.now()).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

