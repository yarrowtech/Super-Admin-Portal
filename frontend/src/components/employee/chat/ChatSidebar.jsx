import React from 'react';

const ChatSidebar = ({
  totalUnread,
  searchQuery,
  onSearchChange,
  onClearSearch,
  searchTokens,
  filteredThreads,
  filteredContacts,
  activeThreadId,
  onSelectThread,
  threadDisplayName,
  wrapMessageText,
  deriveUnreadCount,
  getThreadId,
  onStartChat,
  creatingThreadId,
  currentUserId,
}) => {
  const searchActive = searchTokens.length > 0;
  const normalizedCurrentUserId = currentUserId?.toString?.() || currentUserId || null;

  return (
    <div className="hidden md:flex md:w-80 flex-col h-full bg-white dark:bg-[#111b21]">
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-medium text-[#111b21] dark:text-white">Messages</h1>
          {totalUnread > 0 && (
            <span className="min-w-[1.25rem] h-5 rounded-full bg-[#00a884] px-1.5 flex items-center justify-center text-xs font-medium text-white">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-full bg-[#f0f2f5] px-12 py-3 text-sm text-[#111b21] placeholder:text-[#667781] focus:outline-none focus:bg-white dark:bg-[#202c33] dark:text-white dark:placeholder:text-[#8696a0] dark:focus:bg-[#2a3942] transition-colors"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#667781] dark:text-[#8696a0] text-lg">
            search
          </span>
          {searchActive && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#667781] hover:text-[#00a884] transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredThreads.length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="size-12 rounded-full bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[#667781] dark:text-[#8696a0]">chat_bubble_outline</span>
            </div>
            <p className="text-sm text-[#667781] dark:text-[#8696a0]">
              {searchActive ? 'No conversations match your search.' : 'No conversations yet.'}
            </p>
          </div>
        )}

        {filteredThreads.map((thread) => {
          const id = getThreadId(thread);
          const isActive = id === activeThreadId;
          const lastMessage = wrapMessageText(thread.lastMessage || 'No messages yet');
          const previewSenderId = thread.lastSenderId?.toString?.() || thread.lastSenderId || null;
          const previewSenderName =
            previewSenderId && normalizedCurrentUserId && previewSenderId === normalizedCurrentUserId
              ? 'You'
              : thread.lastSenderName || '';
          const previewMessage = previewSenderName ? `${previewSenderName}: ${lastMessage}` : lastMessage;
          const time = thread.lastTime
            ? new Date(thread.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
          const unreadCount = deriveUnreadCount(thread);
          const displayUnread = unreadCount > 99 ? '99+' : unreadCount;

          return (
            <button
              key={id || thread.name}
              onClick={() => id && onSelectThread(id)}
              className={`flex w-full items-center gap-4 px-6 py-4 text-left transition-all ${
                isActive ? 'bg-[#00a884]/5' : 'hover:bg-[#f5f6f6] dark:hover:bg-[#1a1a1a]'
              }`}
            >
              <div className="relative">
                <div className="size-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#128c7e] flex items-center justify-center text-white font-medium text-sm">
                  {threadDisplayName(thread)?.[0] || 'T'}
                </div>
                {thread.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-[#00a884] dark:border-[#111b21]"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-[#111b21] dark:text-white truncate">{threadDisplayName(thread)}</h3>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-[#667781] shrink-0">{time}</span>
                    {unreadCount > 0 && (
                      <span className="min-w-[1rem] h-4 rounded-full bg-[#00a884] px-1.5 flex items-center justify-center text-xs font-medium text-white">
                        {displayUnread}
                      </span>
                    )}
                  </div>
                </div>
                <p className="truncate text-sm text-[#667781] dark:text-[#8696a0]">{previewMessage}</p>
              </div>
            </button>
          );
        })}

        {filteredContacts.length > 0 && (
          <div className="mt-6 px-6 pb-6">
            <h3 className="text-sm font-medium text-[#667781] dark:text-[#8696a0] mb-4">Team Members</h3>
            <div className="space-y-1">
              {filteredContacts.map((member) => (
                <button
                  key={member.id}
                  onClick={() => onStartChat(member)}
                  disabled={creatingThreadId === member.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#f5f6f6] dark:hover:bg-[#1a1a1a] transition-colors disabled:opacity-60"
                >
                  <div className="relative">
                    <div className="size-8 rounded-full bg-gradient-to-br from-[#008069] to-[#00a884] flex items-center justify-center text-white text-sm font-medium">
                      {member.name?.[0] || 'T'}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-white ${
                        member.status === 'Online' ? 'bg-[#00a884]' : 'bg-[#667781]'
                      } dark:border-[#111b21]`}
                    ></div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-[#111b21] dark:text-white text-sm truncate">{member.name}</p>
                    <p className="text-xs text-[#667781] dark:text-[#8696a0]">{member.role || 'Team Member'}</p>
                  </div>
                  <span className="material-symbols-outlined text-[#667781] text-lg">
                    {creatingThreadId === member.id ? 'schedule' : 'add_circle'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredContacts.length === 0 && searchActive && (
          <div className="px-6 pb-6 text-xs text-[#667781] dark:text-[#8696a0]">No team members match your search.</div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
