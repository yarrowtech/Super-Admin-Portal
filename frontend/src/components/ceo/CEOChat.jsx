import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ceoApi } from '../../api/ceo';
import { useAuth } from '../../context/AuthContext';
import ChatSidebar from '../employee/chat/ChatSidebar';
import ChatWindow from '../employee/chat/ChatWindow';

const quickReplies = ['Approve', 'Review needed', 'Schedule meeting', 'Noted'];
const emojiOptions = ['😀', '😁', '😂', '😅', '😍', '😎', '😢', '😡', '👍', '🙏', '🎉', '🔥', '🚀', '💡', '✅', '❗'];
const TYPING_STOP_DELAY_MS = 2000;
const TYPING_KEEP_ALIVE_MS = 1500;
const TYPING_DISPLAY_TIMEOUT_MS = 5000;
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const CEOChat = () => {
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
  const joinedThreadsRef = useRef(new Set());
  const [creatingThreadId, setCreatingThreadId] = useState(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const messagesEndRef = useRef(null);
  const activeThreadIdRef = useRef(null);
  const seenEmittedRef = useRef({});
  const [seenByOthers, setSeenByOthers] = useState({});
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const [typingStatus, setTypingStatus] = useState({});
  const typingStatusTimeoutsRef = useRef({});
  const typingDebounceRef = useRef(null);
  const isTypingRef = useRef(false);
  const lastActiveThreadRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const typingLastEmitRef = useRef(null);

  const currentUserId = useMemo(() => user?.id || user?._id, [user]);
  const activeThread = useMemo(
    () => threads.find((thread) => (thread._id || thread.id) === activeThreadId),
    [threads, activeThreadId]
  );

  const storageKey = useMemo(() => 'ceo-chat-activeThreadId', []);

  const threadDisplayName = useCallback(
    (thread) => {
      if (!thread) return '';
      
      if (!thread.isDirect && thread.name && !thread.name.includes(' & ')) {
        return thread.name;
      }
      
      const partner = thread.members?.find(
        (member) =>
          member.id?.toString() !== currentUserId?.toString() &&
          member._id?.toString() !== currentUserId?.toString()
      );
      
      if (partner?.name) {
        return partner.name;
      }
      
      if (thread.name && thread.name.includes(' & ')) {
        const names = thread.name.split(' & ');
        const currentUserName = user?.firstName || user?.name || '';
        const otherName = names.find(name => name !== currentUserName);
        if (otherName) return otherName;
      }
      
      return thread.name || 'Unknown';
    },
    [currentUserId, user]
  );

  const getThreadId = useCallback(
    (thread) => thread?._id?.toString?.() || thread?.id?.toString?.() || thread?._id || thread?.id || null,
    []
  );

  const deriveUnreadCount = useCallback((thread) => {
    if (!thread) return 0;
    if (typeof thread.unreadCount === 'number') return thread.unreadCount;
    if (typeof thread.unread === 'number') return thread.unread;
    if (typeof thread.unreadMessages === 'number') return thread.unreadMessages;
    return 0;
  }, []);

  const wrapMessageText = useCallback((text = '', limit = 40) => {
    if (!text || text.length <= limit) return text;

    const wrapSegment = (segment) => {
      if (!segment || segment.length <= limit) return segment;
      const lines = [];
      let start = 0;

      while (start < segment.length) {
        let end = Math.min(start + limit, segment.length);
        if (end >= segment.length) {
          lines.push(segment.slice(start));
          break;
        }

        let breakIndex = segment.lastIndexOf(' ', end);
        if (breakIndex <= start) {
          lines.push(segment.slice(start, end));
          start = end;
        } else {
          lines.push(segment.slice(start, breakIndex));
          start = breakIndex + 1;
        }
      }

      return lines.map((line) => line.trimEnd()).join('\n');
    };

    return text
      .split('\n')
      .map((segment) => wrapSegment(segment))
      .join('\n');
  }, []);

  const normalizeThread = useCallback(
    (thread) => {
      const rawPreview =
        (typeof thread.lastMessage === 'object' && thread.lastMessage !== null
          ? thread.lastMessage.text || thread.lastMessage.body
          : thread.lastMessage) ||
        thread.lastMessagePreview ||
        '';
      const lastSenderId =
        thread.lastSenderId?.toString?.() ||
        thread.lastSender?.toString?.() ||
        thread.lastSender ||
        null;
      return {
        ...thread,
        lastMessage: rawPreview || '',
        lastTime: thread.lastTime || thread.updatedAt || null,
        lastSenderId,
        lastSenderName: thread.lastSenderName || '',
        unreadCount: deriveUnreadCount(thread),
      };
    },
    [deriveUnreadCount]
  );

  const totalUnread = useMemo(
    () => threads.reduce((sum, thread) => sum + deriveUnreadCount(thread), 0),
    [threads, deriveUnreadCount]
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
        const res = await ceoApi.getChatThreads(token);
        const list = res?.data || res || [];
        const normalized = list.map(normalizeThread);
        setThreads(normalized);
        if (normalized.length > 0 && !activeThreadId) {
          const savedThreadId = localStorage.getItem(storageKey);
          const savedThreadExists = savedThreadId && normalized.some(thread => getThreadId(thread) === savedThreadId);
          
          if (savedThreadExists) {
            setActiveThreadId(savedThreadId);
          } else {
            const firstId = getThreadId(normalized[0]);
            if (firstId) {
              setActiveThreadId(firstId);
            }
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load chat threads');
      } finally {
        setLoadingThreads(false);
      }
    })();
  }, [token, normalizeThread, getThreadId, storageKey]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        // CEO should see all employees
        const res = await ceoApi.getAllEmployees ? await ceoApi.getAllEmployees(token) : await ceoApi.getChatThreads(token);
        const base = (res?.data?.members || res?.data || []).filter(
          (member) => member.id !== currentUserId && member._id !== currentUserId
        );
        setTeamMembers(base);
      } catch (err) {
        console.error('Team fetch error:', err.message);
      }
    })();
  }, [token, currentUserId]);

  const loadMessages = useCallback(async () => {
    if (!token || !activeThreadId) return;
    setLoadingMessages(true);
    setError('');
    try {
      const res = await ceoApi.getChatMessages(token, activeThreadId);
      const data = res?.data || res || [];
      setMessages(data);

      if (data.length > 0) {
        const lastMsg = data[data.length - 1];
        setThreads((prev) =>
          prev.map((thread) => {
            const id = getThreadId(thread);
            if (id !== activeThreadId) return thread;
            return {
              ...thread,
              lastMessage: lastMsg?.text || lastMsg?.body || thread.lastMessage || '',
              lastTime: lastMsg?.time || thread.lastTime || new Date().toISOString(),
              lastSenderName: lastMsg?.from || thread.lastSenderName || '',
              lastSenderId:
                lastMsg?.senderId?.toString?.() ||
                lastMsg?.sender?.toString?.() ||
                thread.lastSenderId ||
                null,
            };
          })
        );
      }
    } catch (err) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [token, activeThreadId, getThreadId]);

  useEffect(() => {
    if (!activeThreadId) return;
    loadMessages();
  }, [activeThreadId, loadMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !token || !activeThreadId) return;
    setSending(true);
    setError('');
    
    const messageText = draft.trim();
    setDraft('');
    
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      text: messageText,
      time: new Date().toISOString(),
      senderId: currentUserId,
      from: user?.firstName || user?.name || 'CEO',
      sending: true,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      await ceoApi.postChatMessage(token, activeThreadId, messageText);
    } catch (err) {
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      setDraft(messageText);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleStartChat = async (member) => {
    if (!token || !member?.id) return;
    setCreatingThreadId(member.id);
    setError('');
    try {
      const res = await ceoApi.createChatThread(token, member.id);
      const thread = normalizeThread(res?.data || res);
      const threadId = getThreadId(thread);
      setThreads((prev) => {
        const exists = prev.some((t) => getThreadId(t) === threadId);
        if (exists) return prev;
        return [thread, ...prev];
      });
      if (threadId) {
        setActiveThreadId(threadId);
      }
    } catch (err) {
      setError(err.message || 'Failed to start chat');
    } finally {
      setCreatingThreadId(null);
    }
  };

  const handleCreateGroup = async ({ name, memberIds, meta }) => {
    if (!token || !name || !Array.isArray(memberIds)) return;
    setCreatingGroup(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        memberIds,
      };
      if (meta) {
        payload.meta = meta;
      }
      const res = await ceoApi.createGroupThread(token, payload);
      const thread = normalizeThread(res?.data || res);
      const threadId = getThreadId(thread);
      setThreads((prev) => {
        const exists = threadId && prev.some((t) => getThreadId(t) === threadId);
        if (exists) return prev;
        return [thread, ...prev];
      });
      if (threadId) {
        setActiveThreadId(threadId);
      }
      return thread;
    } catch (err) {
      setError(err.message || 'Failed to create group');
      throw err;
    } finally {
      setCreatingGroup(false);
    }
  };

  if (loadingThreads) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-600 dark:text-neutral-200">Loading CEO chat...</div>;
  }

  if (error && threads.length === 0) {
    return <div className="flex min-h-screen items-center justify-center text-red-600 dark:text-red-400">{error}</div>;
  }

  return (
    <main className="flex h-full overflow-hidden bg-white dark:bg-[#0a1018]">
      <ChatSidebar
        totalUnread={totalUnread}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
        searchTokens={[]}
        filteredThreads={threads}
        filteredContacts={teamMembers}
        activeThreadId={activeThreadId}
        onSelectThread={setActiveThreadId}
        threadDisplayName={threadDisplayName}
        wrapMessageText={wrapMessageText}
        deriveUnreadCount={deriveUnreadCount}
        getThreadId={getThreadId}
        onStartChat={handleStartChat}
        creatingThreadId={creatingThreadId}
        onCreateGroup={handleCreateGroup}
        creatingGroup={creatingGroup}
        teamMembers={teamMembers}
        currentUserId={currentUserId}
      />

      <ChatWindow
        activeThread={activeThread}
        threadDisplayName={threadDisplayName}
        activeThreadTyping={null}
        loadingMessages={loadingMessages}
        messages={messages}
        wrapMessageText={wrapMessageText}
        currentUserId={currentUserId}
        seenByOthers={seenByOthers}
        quickReplies={quickReplies}
        selectQuickReply={() => {}}
        messagesEndRef={messagesEndRef}
        handleSend={handleSend}
        draft={draft}
        handleDraftChange={setDraft}
        handleInputBlur={() => {}}
        sending={sending}
        showEmojiPicker={showEmojiPicker}
        toggleEmojiPicker={() => setShowEmojiPicker(!showEmojiPicker)}
        emojiPickerRef={emojiPickerRef}
        emojiButtonRef={emojiButtonRef}
        emojiOptions={emojiOptions}
        handleEmojiSelect={(emoji) => setDraft(draft + emoji)}
      />
    </main>
  );
};

export default CEOChat;