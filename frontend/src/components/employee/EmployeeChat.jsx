import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { employeeApi } from '../../api/employee';
import { useAuth } from '../../context/AuthContext';

const quickReplies = ['On it', 'Need help', 'Can we sync?', 'Uploading shortly'];
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const EmployeeChat = () => {
  const { token, user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const [creatingThreadId, setCreatingThreadId] = useState(null);
  const messagesEndRef = useRef(null);

  const currentUserId = useMemo(() => user?.id || user?._id, [user]);
  const activeThread = useMemo(
    () => threads.find((thread) => (thread._id || thread.id) === activeThreadId),
    [threads, activeThreadId]
  );

  const threadDisplayName = useCallback(
    (thread) => {
      if (!thread) return '';
      if (!thread.isDirect) return thread.name;
      const partner = thread.members?.find(
        (member) =>
          member.id?.toString() !== currentUserId?.toString() &&
          member._id?.toString() !== currentUserId?.toString()
      );
      return partner?.name || thread.name;
    },
    [currentUserId]
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!token) return;
    setLoadingThreads(true);
    setError('');

    (async () => {
      try {
        const res = await employeeApi.getChatThreads(token);
        const list = res?.data || res || [];
        setThreads(list);
        if (list.length > 0) {
          setActiveThreadId(list[0]._id || list[0].id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load chat threads');
      } finally {
        setLoadingThreads(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await employeeApi.getTeam(token);
        const base = (res?.data?.members || []).filter(
          (member) => member.id !== currentUserId && member._id !== currentUserId
        );
        setTeamMembers(base);
      } catch (err) {
        console.error('Team fetch error:', err.message);
      }
    })();
  }, [token, currentUserId]);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
    });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const loadMessages = useCallback(async () => {
    if (!token || !activeThreadId) return;
    setLoadingMessages(true);
    setError('');
    try {
      const res = await employeeApi.getChatMessages(token, activeThreadId);
      setMessages(res?.data || res || []);
    } catch (err) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [token, activeThreadId]);

  useEffect(() => {
    if (!activeThreadId) return undefined;
    loadMessages();
    const socket = socketRef.current;
    if (socket) {
      socket.emit('joinThread', activeThreadId);
      const handler = (message) => {
        if ((message.thread || message.threadId) === activeThreadId) {
          setMessages((prev) => [...prev, message]);
        }
      };
      socket.on('chat:message', handler);
      return () => {
        socket.emit('leaveThread', activeThreadId);
        socket.off('chat:message', handler);
      };
    }
    return undefined;
  }, [activeThreadId, loadMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !token || !activeThreadId) return;
    setSending(true);
    setError('');

    try {
      await employeeApi.postChatMessage(token, activeThreadId, draft.trim());
      await loadMessages();
      setDraft('');
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const selectQuickReply = (reply) => {
    setDraft(reply);
  };

  const handleStartChat = async (member) => {
    if (!token || !member?.id) return;
    setCreatingThreadId(member.id);
    setError('');
    try {
      const res = await employeeApi.createChatThread(token, member.id);
      const thread = res?.data || res;
      setThreads((prev) => {
        const exists = prev.some((t) => (t._id || t.id) === (thread._id || thread.id));
        if (exists) return prev;
        return [thread, ...prev];
      });
      setActiveThreadId(thread._id || thread.id);
    } catch (err) {
      setError(err.message || 'Failed to start chat');
    } finally {
      setCreatingThreadId(null);
    }
  };

  const directMemberIds = useMemo(() => {
    const ids = new Set();
    threads.forEach((thread) => {
      if (!thread.isDirect) return;
      (thread.members || []).forEach((member) => {
        const mid = (member.id || member._id)?.toString();
        if (mid && mid !== currentUserId?.toString()) {
          ids.add(mid);
        }
      });
    });
    return ids;
  }, [threads, currentUserId]);

  const availableContacts = useMemo(
    () =>
      teamMembers.filter(
        (member) => !directMemberIds.has((member.id || member._id)?.toString())
      ),
    [teamMembers, directMemberIds]
  );

  if (loadingThreads) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-600 dark:text-neutral-200">Loading chat...</div>;
  }

  if (error && threads.length === 0) {
    return <div className="flex min-h-screen items-center justify-center text-red-600 dark:text-red-400">{error}</div>;
  }

  return (
    <main className="flex h-[calc(100vh-3rem)] min-h-[620px] overflow-hidden bg-[#f0f2f5] dark:bg-[#0a1018]">
      {/* Sidebar */}
      <div className="flex w-[380px] flex-col border-r border-[#e9edef] bg-white dark:border-[#303d45] dark:bg-[#111b21]">
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-[#e9edef] p-4 dark:border-[#303d45]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#128c7e] flex items-center justify-center text-white font-semibold">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div>
              <h1 className="font-semibold text-[#111b21] dark:text-white">Team Chat</h1>
              <p className="text-xs text-[#667781]">Active now</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[#54656f]">
            <button className="hover:text-[#00a884]">
              <span className="material-symbols-outlined">chat</span>
            </button>
            <button className="hover:text-[#00a884]">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search or start new chat"
              className="w-full rounded-lg bg-[#f0f2f5] px-10 py-2.5 text-sm text-[#111b21] placeholder:text-[#667781] focus:outline-none dark:bg-[#202c33] dark:text-white dark:placeholder:text-[#8696a0]"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#667781] dark:text-[#8696a0]">
              search
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {threads.map((thread) => {
            const id = thread._id || thread.id;
            const isActive = id === activeThreadId;
            const lastMessage = thread.lastMessage || 'No messages yet';
            const time = thread.lastTime ? new Date(thread.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            
            return (
              <button
                key={id}
                onClick={() => setActiveThreadId(id)}
                className={`flex w-full items-center gap-3 p-3 text-left hover:bg-[#f5f6f6] dark:hover:bg-[#2a3942] ${
                  isActive ? 'bg-[#f0f2f5] dark:bg-[#2a3942]' : ''
                }`}
              >
                <div className="relative">
                  <div className="size-12 rounded-full bg-gradient-to-br from-[#00a884] to-[#128c7e] flex items-center justify-center text-white">
                    <span className="material-symbols-outlined">forum</span>
                  </div>
                  {thread.online && (
                    <div className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-[#00a884] dark:border-[#111b21]"></div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#111b21] dark:text-white">{threadDisplayName(thread)}</h3>
                    <span className="text-xs text-[#667781]">{time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm text-[#667781]">{lastMessage}</p>
                    {thread.unreadCount > 0 && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-[#00a884] text-xs font-semibold text-white">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          <div className="border-t border-[#e9edef] p-4 dark:border-[#303d45]">
            <h3 className="mb-3 text-sm font-semibold text-[#667781] dark:text-[#8696a0]">Start New Chat</h3>
            <div className="space-y-2">
              {availableContacts.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-[#f5f6f6] dark:hover:bg-[#2a3942]">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="size-10 rounded-full bg-gradient-to-br from-[#008069] to-[#00a884] flex items-center justify-center text-white">
                        {member.name?.[0] || 'T'}
                      </div>
                      <div className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white ${member.status === 'Online' ? 'bg-[#00a884]' : 'bg-[#667781]'} dark:border-[#111b21]`}></div>
                    </div>
                    <div>
                      <p className="font-medium text-[#111b21] dark:text-white">{member.name}</p>
                      <p className="text-xs text-[#667781]">{member.role || 'Team Member'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartChat(member)}
                    disabled={creatingThreadId === member.id}
                    className="rounded-full bg-[#00a884] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#008069] disabled:opacity-60"
                  >
                    {creatingThreadId === member.id ? 'Opening...' : 'Message'}
                  </button>
                </div>
              ))}
              {availableContacts.length === 0 && (
                <p className="text-xs text-[#667781] dark:text-[#8696a0]">Everyone already has a chat.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {activeThread ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-[#e9edef] bg-white p-4 dark:border-[#303d45] dark:bg-[#202c33]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#128c7e] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined">forum</span>
                </div>
                <div>
                  <h2 className="font-semibold text-[#111b21] dark:text-white">{threadDisplayName(activeThread)}</h2>
                  <p className="text-sm text-[#667781] dark:text-[#8696a0]">{activeThread.meta || 'Team chat'}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-[#54656f]">
                <button className="hover:text-[#00a884]">
                  <span className="material-symbols-outlined">videocam</span>
                </button>
                <button className="hover:text-[#00a884]">
                  <span className="material-symbols-outlined">call</span>
                </button>
                <button className="hover:text-[#00a884]">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>
            </div>

            {/* Messages container */}
            <div className="flex-1 overflow-y-auto bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNFNUU2RUEiIGZpbGwtb3BhY2l0eT0iMC4zIj48cGF0aCBkPSJNNDAgNjBIMFYwbDYwIDYweiIvPjwvZz48L2c+PC9zdmc+')] bg-repeat p-4 dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDJDMzMiIGZpbGwtb3BhY2l0eT0iMC4yIj48cGF0aCBkPSJNNDAgNjBIMFYwbDYwIDYweiIvPjwvZz48L2c+PC9zdmc+')]">
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
                  const isMe = msg.me || msg.from === `${user?.firstName} ${user?.lastName}`;
                  const time = msg.time ? new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[65%] rounded-lg px-3 py-2 shadow-sm ${isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none dark:bg-[#2a3942]'}`}>
                        {!isMe && (
                          <div className="mb-1 text-xs font-semibold text-[#00a884]">{msg.from}</div>
                        )}
                        <div className="text-[#111b21] dark:text-white">{msg.text}</div>
                        <div className="mt-1 flex justify-end">
                          <span className="text-xs text-[#667781]">{time}</span>
                          {isMe && (
                            <span className="material-symbols-outlined ml-1 text-xs text-[#667781]">done_all</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Quick replies */}
            {quickReplies.length > 0 && (
              <div className="flex gap-2 overflow-x-auto border-t border-[#e9edef] bg-white px-4 py-3 dark:border-[#303d45] dark:bg-[#202c33]">
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

            {/* Message input */}
            <div className="border-t border-[#e9edef] bg-white p-4 dark:border-[#303d45] dark:bg-[#202c33]">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full p-2 text-[#54656f] hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942]"
                >
                  <span className="material-symbols-outlined">emoji_emotions</span>
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-[#54656f] hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942]"
                >
                  <span className="material-symbols-outlined">attach_file</span>
                </button>
                <div className="flex-1">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message"
                    className="w-full rounded-lg bg-[#f0f2f5] px-4 py-3 text-[#111b21] placeholder:text-[#667781] focus:outline-none dark:bg-[#2a3942] dark:text-white dark:placeholder:text-[#8696a0]"
                  />
                </div>
                {draft.trim() ? (
                  <button
                    type="submit"
                    disabled={sending}
                    className="rounded-full bg-[#00a884] p-3 text-white hover:bg-[#008069] disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined">{sending ? 'schedule' : 'send'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-full bg-[#00a884] p-3 text-white hover:bg-[#008069]"
                  >
                    <span className="material-symbols-outlined">mic</span>
                  </button>
                )}
              </form>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-[#111b21]">
            <div className="mb-6 size-48 rounded-full bg-gradient-to-br from-[#00a884]/10 to-[#128c7e]/10 p-8">
              <div className="size-full rounded-full bg-gradient-to-br from-[#00a884] to-[#128c7e] flex items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-white">forum</span>
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-[#111b21] dark:text-white">Team Chat</h2>
            <p className="text-[#667781] dark:text-[#8696a0]">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default EmployeeChat;
