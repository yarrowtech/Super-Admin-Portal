import React, { useState } from 'react';

const ChatWindow = ({
  activeThread,
  threadDisplayName,
  activeThreadTyping,
  loadingMessages,
  messages,
  wrapMessageText,
  currentUserId,
  seenByOthers,
  quickReplies,
  selectQuickReply,
  messagesEndRef,
  handleSend,
  draft,
  handleDraftChange,
  handleInputBlur,
  sending,
  showEmojiPicker,
  toggleEmojiPicker,
  emojiPickerRef,
  emojiButtonRef,
  emojiOptions,
  handleEmojiSelect,
}) => {
  const [expandedMessages, setExpandedMessages] = useState({});
  const [showMembersPanel, setShowMembersPanel] = useState(false);

  const toggleMessageExpansion = (key) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getDateKey = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  };

  const formatDayLabel = (value) => {
    if (!value) return 'Today';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Today';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!activeThread) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-[#111b21]">
        <div className="mb-6 size-48 rounded-full bg-gradient-to-br from-[#00a884]/10 to-[#128c7e]/10 p-8">
          <div className="size-full rounded-full bg-gradient-to-br from-[#00a884] to-[#128c7e] flex items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-white">forum</span>
          </div>
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-[#111b21] dark:text-white">Team Chat</h2>
        <p className="text-[#667781] dark:text-[#8696a0]">Select a chat to start messaging</p>
      </div>
    );
  }

  let lastDateKey = null;
  const renderedMessages = messages.map((msg) => {
    const senderId = msg.senderId || msg.sender || msg.senderID || '';
    const isMe = senderId?.toString() === currentUserId?.toString();
    const isSeen = isMe && Boolean(seenByOthers[msg.id]);
    const time = msg.time
      ? new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    const messageKey =
      msg.id ||
      msg._id ||
      `${senderId || 'unknown'}-${msg.time || 'pending'}-${msg.text?.length || 0}`;
    const wrappedMessage = wrapMessageText(msg.text || '');
    const messageLines = wrappedMessage ? wrappedMessage.split('\n') : [''];
    const isExpanded = Boolean(expandedMessages[messageKey]);
    const needsToggle = messageLines.length > 10;
    const displayedText = isExpanded ? messageLines.join('\n') : messageLines.slice(0, 10).join('\n');
    const dateKey = getDateKey(msg.time);
    const showDateSeparator = Boolean(dateKey && dateKey !== lastDateKey);
    if (showDateSeparator) {
      lastDateKey = dateKey;
    }

    let statusIcon = 'done';
    let statusColor = 'text-[#667781]';

    if (isMe) {
      if (msg.sending) {
        statusIcon = 'schedule';
        statusColor = 'text-[#667781] animate-spin';
      } else if (isSeen) {
        statusIcon = 'done_all';
        statusColor = 'text-[#4fc3f7]';
      } else {
        const recipientIsOnline =
          activeThread?.members?.some((member) => {
            const memberId = (member.id || member._id)?.toString();
            const isOtherUser = memberId !== currentUserId?.toString();
            return (
              isOtherUser &&
              (member.status === 'Online' || member.status === 'online' || member.online === true)
            );
          }) || activeThread?.online === true;

        if (recipientIsOnline) {
          statusIcon = 'done_all';
          statusColor = 'text-[#667781]';
        } else {
          statusIcon = 'done';
          statusColor = 'text-[#667781]';
        }
      }
    }

    const bubbleKey = `${messageKey}-${isSeen ? 'seen' : 'unseen'}`;

    return (
      <React.Fragment key={bubbleKey}>
        {showDateSeparator && (
          <div className="my-4 flex items-center gap-3">
            <span className="flex-1 h-px bg-[#d1d7db] dark:bg-[#2a3942]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#54656f] dark:text-[#8696a0]">
              {formatDayLabel(msg.time)}
            </span>
            <span className="flex-1 h-px bg-[#d1d7db] dark:bg-[#2a3942]" />
          </div>
        )}
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-lg px-3 py-2 shadow-sm ${
              isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none dark:bg-[#2a3942]'
            }`}
          >
            {!isMe && <div className="mb-1 text-xs font-semibold text-[#00a884]">{msg.from}</div>}
            <div className="whitespace-pre-line break-words text-[#111b21] dark:text-white">
              {displayedText}
            </div>
            {needsToggle && (
              <button
                type="button"
                onClick={() => toggleMessageExpansion(messageKey)}
                className="mt-1 text-xs font-semibold text-[#00a884] hover:text-[#059e7f]"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
            <div className="mt-1 flex justify-end">
              <span className="text-xs text-[#667781]">{time}</span>
              {isMe && (
                <span className={`material-symbols-outlined ml-1 text-xs ${statusColor}`}>{statusIcon}</span>
              )}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  });

  const isGroupChat = Boolean(activeThread && !activeThread.isDirect);
  const groupMembers = Array.isArray(activeThread?.members) ? activeThread.members : [];

  return (
    <div className="flex flex-1 flex-col h-full pt-16 md:pt-0">
      <div className="flex items-center justify-between border-b border-[#e9edef] bg-white p-4 dark:border-[#303d45] dark:bg-[#202c33]">
        <button
          type="button"
          className="flex items-center gap-3 text-left"
          onClick={() => isGroupChat && setShowMembersPanel(true)}
          disabled={!isGroupChat}
        >
          <div className="size-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#128c7e] flex items-center justify-center text-white">
            <span className="material-symbols-outlined">forum</span>
          </div>
          <div>
            <h2 className="font-semibold text-[#111b21] dark:text-white">
              {threadDisplayName(activeThread)}
            </h2>
            <p className="text-sm text-[#667781] dark:text-[#8696a0]">
              {activeThreadTyping
                ? `${activeThreadTyping.name || 'Someone'} is typing...`
                : isGroupChat
                  ? `${groupMembers.length} members`
                  : activeThread.meta || 'Team chat'}
            </p>
            {/* {isGroupChat && (
              <p className="text-xs text-[#00a884] underline-offset-2 hover:underline">
                View members
              </p>
            )} */}
          </div>
        </button>
        <div className="flex items-center gap-6 text-[#54656f]">
          <button className="hover:text-[#00a884]">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNFNUU2RUEiIGZpbGwtb3BhY2l0eT0iMC4zIj48cGF0aCBkPSJNNDAgNjBIMFYwbDYwIDYweiIvPjwvZz48L2c+PC9zdmc+')] bg-repeat p-4 dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDJDMzMiIGZpbGwtb3BhY2l0eT0iMC4yIj48cGF0aCBkPSJNNDAgNjBIMFYwbDYwIDYweiIvPjwvZz48L2c+PC9zdmc+')]">
        {loadingMessages && (
          <div className="flex h-full items-center justify-center">
            <div className="text-[#667781]">Loading messages...</div>
          </div>
        )}

        {!loadingMessages && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 size-20 rounded-full bg-gradient-to-br from-[#00a884] to-[#128c7e] flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-white">forum</span>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-[#111b21] dark:text-white">No messages yet</h3>
            <p className="text-[#667781]">Start the conversation with your team</p>
          </div>
        )}

        <div className="space-y-2">
          {renderedMessages}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {quickReplies.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-[#e9edef] bg-white px-2 sm:px-4 py-3 dark:border-[#303d45] dark:bg-[#202c33] scrollbar-none">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => selectQuickReply(reply)}
              className="shrink-0 rounded-full border border-[#e9edef] bg-[#f0f2f5] px-3 py-1.5 text-sm text-[#111b21] hover:border-[#00a884] hover:bg-[#e6f4ea] dark:border-[#303d45] dark:bg-[#2a3942] dark:text-white"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-[#e9edef] bg-white p-2 sm:p-4 dark:border-[#303d45] dark:bg-[#202c33]">
        <form onSubmit={handleSend} className="flex items-center gap-1 sm:gap-2">
          <div className="relative">
            <button
              type="button"
              ref={emojiButtonRef}
              onClick={toggleEmojiPicker}
              aria-label="Insert emoji"
              className="flex rounded-full p-2 text-[#54656f] hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942]"
            >
              <span className="material-symbols-outlined">emoji_emotions</span>
            </button>
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-full left-0 z-40 mb-2 w-64 rounded-2xl border border-[#e9edef] bg-white p-3 shadow-xl dark:border-[#303d45] dark:bg-[#111b21]"
              >
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#54656f] dark:text-[#8696a0]">
                  Quick Emojis
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className="rounded-xl bg-[#f0f2f5] p-2 text-xl hover:bg-[#e6f4ea] dark:bg-[#2a3942] dark:hover:bg-[#1f2b32]"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="rounded-full p-1.5 sm:p-2 text-[#54656f] hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942]"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl">attach_file</span>
          </button>
          <div className="flex-1">
            <input
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              onBlur={handleInputBlur}
              placeholder="Type a message"
              className="w-full rounded-lg bg-[#f0f2f5] px-4 py-3 text-[#111b21] placeholder:text-[#667781] focus:outline-none dark:bg-[#2a3942] dark:text-white dark:placeholder:text-[#8696a0]"
            />
          </div>
          {draft.trim() ? (
            <button
              type="submit"
              disabled={sending}
              className="rounded-full bg-[#00a884] p-2 sm:p-3 text-white hover:bg-[#008069] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-lg sm:text-xl">{sending ? 'schedule' : 'send'}</span>
            </button>
          ) : (
            <button type="button" className="rounded-full bg-[#00a884] p-2 sm:p-3 text-white hover:bg-[#008069]">
              <span className="material-symbols-outlined text-lg sm:text-xl">send</span>
            </button>
          )}
        </form>
      </div>

      {isGroupChat && showMembersPanel && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#111b21]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#111b21] dark:text-white">Group Members</h3>
                { isGroupChat && (
                
                <p className="text-sm text-[#667781] dark:text-[#8696a0]">

                  {groupMembers.length} member{groupMembers.length === 1 ? '' : 's'}
                </p>)}
              </div>
              <button
                type="button"
                onClick={() => setShowMembersPanel(false)}
                className="rounded-full p-1.5 text-[#54656f] hover:bg-[#f0f2f5] dark:hover:bg-[#1f1f1f]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {groupMembers.map((member) => {
                const memberId = (member.id || member._id)?.toString() || '';
                return (
                  <div
                    key={memberId || member.email}
                    className="flex items-center gap-3 rounded-xl border border-[#eef1f2] px-3 py-2 dark:border-[#1f2b32]"
                  >
                    <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#00a884] to-[#128c7e] text-white text-sm font-semibold">
                      {member.name?.[0] || member.email?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#111b21] dark:text-white">
                        {member.name || member.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-[#667781] dark:text-[#8696a0]">
                        {member.role || member.department || member.email || ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMembersPanel(false)}
                className="rounded-xl bg-[#00a884] px-4 py-2 text-sm font-semibold text-white hover:bg-[#008069]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
