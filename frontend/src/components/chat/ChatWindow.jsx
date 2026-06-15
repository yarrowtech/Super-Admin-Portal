import React from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

export default function ChatWindow({
  activeConversation,
  messages,
  currentUserId,
  draft,
  onDraftChange,
  onSend,
  onTyping,
  typingText,
}) {
  if (!activeConversation) {
    return <section className="flex flex-1 items-center justify-center text-sm text-neutral-500">Select a conversation</section>;
  }
  return (
    <section className="flex flex-1 flex-col">
      <div className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold dark:border-neutral-800">{activeConversation.name}</div>
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {messages.map((message) => (
          <MessageBubble
            key={message._id || message.id}
            message={message}
            own={String(message.sender) === String(currentUserId) || String(message.senderId) === String(currentUserId)}
          />
        ))}
        {typingText ? <p className="text-xs text-neutral-500">{typingText}</p> : null}
      </div>
      <MessageInput value={draft} onChange={onDraftChange} onSend={onSend} onTyping={onTyping} />
    </section>
  );
}

