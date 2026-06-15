import React from 'react';

export default function ChatSidebar({ conversations, activeId, onSelect, onlineUserIds }) {
  return (
    <aside className="w-80 shrink-0 border-r border-neutral-200 dark:border-neutral-800">
      <div className="border-b border-neutral-200 p-3 text-sm font-semibold dark:border-neutral-800">Conversations</div>
      <div className="h-[calc(100%-45px)] overflow-auto">
        {conversations.map((conversation) => {
          const id = conversation._id || conversation.id || conversation.conversationId;
          const isActive = activeId === id;
          const peer = (conversation.members || []).find((m) => m?._id !== conversation.currentUserId);
          const online = peer && onlineUserIds.has(String(peer._id));
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-3 text-left ${isActive ? 'bg-neutral-100 dark:bg-neutral-900' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'}`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{conversation.name || 'Conversation'}</div>
                <div className="truncate text-xs text-neutral-500">{conversation.lastMessage || 'No messages'}</div>
              </div>
              <div className="flex items-center gap-2">
                {online ? <span className="h-2 w-2 rounded-full bg-emerald-500" /> : null}
                {conversation.unreadCount > 0 ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">{conversation.unreadCount}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

