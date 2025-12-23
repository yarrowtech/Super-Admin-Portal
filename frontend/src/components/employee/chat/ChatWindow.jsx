import React from 'react';

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

  return (
    <div className="flex flex-1 flex-col h-full pt-16 md:pt-0">
      <div className="flex items-center justify-between border-b border-[#e9edef] bg-white p-4 dark:border-[#303d45] dark:bg-[#202c33]">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#128c7e] flex items-center justify-center text-white">
            <span className="material-symbols-outlined">forum</span>
          </div>
          <div>
            <h2 className="font-semibold text-[#111b21] dark:text-white">{threadDisplayName(activeThread)}</h2>
            <p className="text-sm text-[#667781] dark:text-[#8696a0]">
              {activeThreadTyping
                ? `${activeThreadTyping.name || 'Someone'} is typing...`
                : activeThread.meta || 'Team chat'}
            </p>
          </div>
        </div>
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
          {messages.map((msg) => {
            const senderId = msg.senderId || msg.sender || msg.senderID || '';
            const isMe = senderId?.toString() === currentUserId?.toString();
            const isSeen = isMe && Boolean(seenByOthers[msg.id]);
            const time = msg.time
              ? new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            let statusIcon = 'done';
            let statusColor = 'text-[#667781]';
            
            if (isMe) {
              if (msg.sending) {
                // Message is being sent (optimistic update)
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
                      (member.status === 'Online' ||
                        member.status === 'online' ||
                        member.online === true)
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

            return (
              <div key={`${msg.id}-${isSeen ? 'seen' : 'unseen'}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-lg px-3 py-2 shadow-sm ${
                    isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none dark:bg-[#2a3942]'
                  }`}
                >
                  {!isMe && <div className="mb-1 text-xs font-semibold text-[#00a884]">{msg.from}</div>}
                  <div className="whitespace-pre-line break-words text-[#111b21] dark:text-white">
                    {wrapMessageText(msg.text || '')}
                  </div>
                  <div className="mt-1 flex justify-end">
                    <span className="text-xs text-[#667781]">{time}</span>
                    {isMe && (
                      <span className={`material-symbols-outlined ml-1 text-xs ${statusColor}`}>{statusIcon}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
    </div>
  );
};

export default ChatWindow;
