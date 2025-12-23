import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { employeeApi } from '../../api/employee';
import { useAuth } from '../../context/AuthContext';

const quickReplies = ['On it', 'Need help', 'Can we sync?', 'Uploading shortly'];
const emojiOptions = ['😀', '😁', '😂', '😅', '😍', '😎', '😢', '😡', '👍', '🙏', '🎉', '🔥', '🚀', '💡', '✅', '❗'];
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const EmployeeChat = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
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

  const currentUserId = useMemo(() => user?.id || user?._id, [user]);
  const activeThread = useMemo(
    () => threads.find((thread) => (thread._id || thread.id) === activeThreadId),
    [threads, activeThreadId]
  );

  const threadDisplayName = useCallback(
    (thread) => {
      if (!thread) return '';
      
      // For group chats (not direct), show the thread name
      if (!thread.isDirect && thread.name && !thread.name.includes(' & ')) {
        return thread.name;
      }
      
      // For direct chats or threads with names like "User1 & User2", find the other person
      const partner = thread.members?.find(
        (member) =>
          member.id?.toString() !== currentUserId?.toString() &&
          member._id?.toString() !== currentUserId?.toString()
      );
      
      if (partner?.name) {
        return partner.name;
      }
      
      // Fallback: if thread name contains "&", extract the other person's name
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
          // No space found in the window; hard break the long word
          lines.push(segment.slice(start, end));
          start = end;
        } else {
          lines.push(segment.slice(start, breakIndex));
          start = breakIndex + 1; // skip the space
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
      return {
        ...thread,
        lastMessage: rawPreview || '',
        lastTime: thread.lastTime || thread.updatedAt || null,
        unreadCount: deriveUnreadCount(thread),
      };
    },
    [deriveUnreadCount]
  );

  const totalUnread = useMemo(
    () => threads.reduce((sum, thread) => sum + deriveUnreadCount(thread), 0),
    [threads, deriveUnreadCount]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const threadCounts = threads.map((thread) => ({
      id: getThreadId(thread),
      count: deriveUnreadCount(thread),
    }));
    window.dispatchEvent(
      new CustomEvent('employee-chat-unread-changed', {
        detail: { count: totalUnread, threadCounts },
      })
    );
  }, [totalUnread, threads, deriveUnreadCount, getThreadId]);

  useEffect(() => {
    if (
      lastActiveThreadRef.current &&
      lastActiveThreadRef.current !== activeThreadId &&
      isTypingRef.current
    ) {
      const previousThreadId = lastActiveThreadRef.current;
      const socket = socketRef.current;
      if (socket && previousThreadId && currentUserId) {
        socket.emit('chat:typing', {
          threadId: previousThreadId,
          userId: currentUserId,
          name: user?.firstName || user?.name || null,
          isTyping: false,
        });
      }
    }

    lastActiveThreadRef.current = activeThreadId;
    isTypingRef.current = false;
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }

    activeThreadIdRef.current = activeThreadId;
    // Save active thread to localStorage
    if (activeThreadId) {
      localStorage.setItem('activeThreadId', activeThreadId);
    }
  }, [activeThreadId, currentUserId, user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current?.contains(event.target) ||
        emojiButtonRef.current?.contains(event.target)
      ) {
        return;
      }
      setShowEmojiPicker(false);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = null;
      }
      if (isTypingRef.current && lastActiveThreadRef.current && socketRef.current && currentUserId) {
        socketRef.current.emit('chat:typing', {
          threadId: lastActiveThreadRef.current,
          userId: currentUserId,
          name: user?.firstName || user?.name || null,
          isTyping: false,
        });
      }
      Object.values(typingStatusTimeoutsRef.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      typingStatusTimeoutsRef.current = {};
    };
  }, [currentUserId, user]);

  useEffect(() => {
    if (!token) return;
    setLoadingThreads(true);
    setError('');

    (async () => {
      try {
        const res = await employeeApi.getChatThreads(token);
        const list = res?.data || res || [];
        const normalized = list.map(normalizeThread);
        setThreads(normalized);
        if (normalized.length > 0 && !activeThreadId) {
          // Try to restore previously active thread from localStorage
          const savedThreadId = localStorage.getItem('activeThreadId');
          const savedThreadExists = savedThreadId && normalized.some(thread => getThreadId(thread) === savedThreadId);
          
          if (savedThreadExists) {
            // Restore previously active thread
            setActiveThreadId(savedThreadId);
          } else {
            // Fall back to first thread if saved thread doesn't exist
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
  }, [token, normalizeThread, getThreadId]);

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
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    joinedThreadsRef.current = new Set();
    return () => {
      socket.disconnect();
      socketRef.current = null;
      joinedThreadsRef.current = new Set();
    };
  }, [token]);

  const loadMessages = useCallback(async () => {
    if (!token || !activeThreadId) return;
    setLoadingMessages(true);
    setError('');
    try {
      const res = await employeeApi.getChatMessages(token, activeThreadId);
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

  useEffect(() => {
    if (!threads.length) return;
    const socket = socketRef.current;
    if (!socket) return;
    threads.forEach((thread) => {
      const id = getThreadId(thread);
      if (!id || joinedThreadsRef.current.has(id)) return;
      socket.emit('joinThread', id);
      joinedThreadsRef.current.add(id);
    });
  }, [threads, getThreadId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const messageHandler = (message) => {
      const threadId = message?.thread?.toString?.() || message?.threadId?.toString?.();
      if (!threadId) return;
      const activeId = activeThreadIdRef.current?.toString?.() || activeThreadIdRef.current || null;

      setThreads((prev) => {
        let found = false;
        const next = prev.map((thread) => {
          const id = getThreadId(thread);
          if (id !== threadId) return thread;
          found = true;
          const unreadCount = deriveUnreadCount(thread);
          const shouldIncrement = !activeId || activeId !== threadId;
          return {
            ...thread,
            lastMessage: message.text || message.body || thread.lastMessage,
            lastTime: message.time || message.sentAt || new Date().toISOString(),
            unreadCount: shouldIncrement ? unreadCount + 1 : 0,
          };
        });
        if (!found) return prev;
        return next;
      });

      if (threadId === activeId) {
        setMessages((prev) => [...prev, message]);
      }

      if (typingStatusTimeoutsRef.current[threadId]) {
        clearTimeout(typingStatusTimeoutsRef.current[threadId]);
        delete typingStatusTimeoutsRef.current[threadId];
      }
      setTypingStatus((prev) => {
        if (!prev[threadId]) return prev;
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
    };

    const seenHandler = (payload = {}) => {
      console.log('Received seen event:', payload);
      const { threadId, seenMessageIds } = payload;
      if (!threadId || !Array.isArray(seenMessageIds) || seenMessageIds.length === 0) return;
      
      console.log('Processing seen messages:', seenMessageIds);
      setSeenByOthers((prev) => {
        const next = { ...prev };
        seenMessageIds.forEach((id) => {
          if (id) {
            console.log('Marking message as seen:', id);
            next[id] = true;
          }
        });
        console.log('Updated seenByOthers:', next);
        return next;
      });
    };

    socket.on('chat:message', messageHandler);
    socket.on('chat:seen', seenHandler);
    const typingHandler = (payload = {}) => {
      const { threadId, userId, name, isTyping } = payload;
      if (!threadId || !userId) return;
      if (currentUserId && userId.toString() === currentUserId.toString()) return;

      setTypingStatus((prev) => {
        const next = { ...prev };
        if (isTyping) {
          next[threadId] = {
            userId,
            name: name || 'Someone',
          };
        } else {
          delete next[threadId];
        }
        return next;
      });

      if (typingStatusTimeoutsRef.current[threadId]) {
        clearTimeout(typingStatusTimeoutsRef.current[threadId]);
        delete typingStatusTimeoutsRef.current[threadId];
      }

      if (isTyping) {
        typingStatusTimeoutsRef.current[threadId] = setTimeout(() => {
          setTypingStatus((prev) => {
            if (!prev[threadId]) return prev;
            const next = { ...prev };
            delete next[threadId];
            return next;
          });
          delete typingStatusTimeoutsRef.current[threadId];
        }, 3000);
      }
    };

    socket.on('chat:typing', typingHandler);
    return () => {
      socket.off('chat:message', messageHandler);
      socket.off('chat:seen', seenHandler);
      socket.off('chat:typing', typingHandler);
    };
  }, [deriveUnreadCount, getThreadId, currentUserId]);

  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker((prev) => !prev);
  }, []);

  const handleEmojiSelect = useCallback((emoji) => {
    setDraft((prev) => `${prev || ''}${emoji}`);
    setShowEmojiPicker(false);
    setHasUserInteracted(true);
  }, []);

  const sendTypingStatus = useCallback(
    (threadId, typing) => {
      if (!socketRef.current || !threadId || !currentUserId) return;
      const displayName =
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
        user?.name ||
        user?.email ||
        'Someone';
      socketRef.current.emit('chat:typing', {
        threadId,
        userId: currentUserId,
        name: displayName,
        isTyping: Boolean(typing),
      });
    },
    [currentUserId, user]
  );

  const emitTypingStatus = useCallback(
    (typing) => {
      if (typing) {
        if (isTypingRef.current) return;
        if (!activeThreadId) return;
        sendTypingStatus(activeThreadId, true);
        isTypingRef.current = true;
        return;
      }

      if (!isTypingRef.current) return;
      const targetThreadId = activeThreadId || lastActiveThreadRef.current;
      if (targetThreadId) {
        sendTypingStatus(targetThreadId, false);
      }
      isTypingRef.current = false;
    },
    [activeThreadId, sendTypingStatus]
  );

  const scheduleTypingStop = useCallback(() => {
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }
    typingDebounceRef.current = setTimeout(() => {
      emitTypingStatus(false);
      typingDebounceRef.current = null;
    }, 2000);
  }, [emitTypingStatus]);

  const handleDraftChange = useCallback(
    (value) => {
      setDraft(value);
      setHasUserInteracted(true);
      if (!activeThreadId || !currentUserId) return;

      if (value && value.trim().length > 0) {
        emitTypingStatus(true);
        scheduleTypingStop();
      } else {
        emitTypingStatus(false);
        if (typingDebounceRef.current) {
          clearTimeout(typingDebounceRef.current);
          typingDebounceRef.current = null;
        }
      }
    },
    [activeThreadId, currentUserId, emitTypingStatus, scheduleTypingStop]
  );

  const handleInputBlur = useCallback(() => {
    emitTypingStatus(false);
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }
  }, [emitTypingStatus]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !token || !activeThreadId) return;
    setSending(true);
    setError('');

    try {
      await employeeApi.postChatMessage(token, activeThreadId, draft.trim());
      await loadMessages();
      setDraft('');
      emitTypingStatus(false);
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = null;
      }
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const selectQuickReply = async (reply) => {
    if (!token || !activeThreadId) return;
    setSending(true);
    setError('');

    try {
      await employeeApi.postChatMessage(token, activeThreadId, reply);
      await loadMessages();
    } catch (err) {
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
      const res = await employeeApi.createChatThread(token, member.id);
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

  const normalizedSearchTokens = useMemo(() => {
    const base = searchQuery.trim().toLowerCase();
    if (!base) return [];
    return base.split(/\s+/).filter(Boolean);
  }, [searchQuery]);

  const matchTokens = useCallback((text, tokens) => {
    if (!tokens.length) return true;
    const source = (text || '').toLowerCase();
    return tokens.every((token) => source.includes(token));
  }, []);

  const filteredThreads = useMemo(() => {
    if (!normalizedSearchTokens.length) return threads;
    return threads.filter((thread) => {
      const name = threadDisplayName(thread) || '';
      const preview = thread.lastMessage || '';
      const memberNames = (thread.members || [])
        .map((member) => member.name || member.email || '')
        .join(' ');
      const haystack = `${name} ${preview} ${memberNames}`;
      return matchTokens(haystack, normalizedSearchTokens);
    });
  }, [threads, normalizedSearchTokens, threadDisplayName, matchTokens]);

  const filteredContacts = useMemo(() => {
    if (!normalizedSearchTokens.length) return availableContacts;
    return availableContacts.filter((member) => {
      const name = member.name || '';
      const role = member.role || '';
      const department = member.department || '';
      const haystack = `${name} ${role} ${department}`;
      return matchTokens(haystack, normalizedSearchTokens);
    });
  }, [availableContacts, normalizedSearchTokens, matchTokens]);

  useEffect(() => {
    if (!activeThreadId) return;
    setThreads((prev) =>
      prev.map((thread) => {
        const id = getThreadId(thread);
        if (id !== activeThreadId) return thread;
        const unreadCount = deriveUnreadCount(thread);
        if (unreadCount === 0) return thread;
        return {
          ...thread,
          unreadCount: 0,
        };
      })
    );
  }, [activeThreadId, deriveUnreadCount, getThreadId]);

  // Track user interaction to prevent auto-marking on page load
  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteracted(true);
    };

    // Add listeners for user interactions
    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('scroll', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('scroll', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    if (!activeThreadId || !currentUserId || !hasUserInteracted) return;
    const socket = socketRef.current;
    if (!socket) return;
    
    // Add delay to prevent immediate marking on thread switch
    const timer = setTimeout(() => {
      const threadKey = activeThreadId.toString();
      if (!seenEmittedRef.current[threadKey]) {
        seenEmittedRef.current[threadKey] = new Set();
      }
      const emitted = seenEmittedRef.current[threadKey];
      const newlySeen = [];
      messages.forEach((msg) => {
        const senderId = msg.senderId || msg.sender || msg.senderID || '';
        if (!msg.id || !senderId) return;
        if (senderId.toString() === currentUserId.toString()) return;
        if (emitted.has(msg.id)) return;
        newlySeen.push(msg.id);
      });
      if (newlySeen.length > 0) {
        console.log('Emitting seen event for messages:', newlySeen);
        socket.emit('chat:seen', {
          threadId: threadKey,
          readerId: currentUserId,
          seenMessageIds: newlySeen,
        });
        newlySeen.forEach((id) => emitted.add(id));
        console.log('Added to emitted set:', newlySeen);
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [messages, activeThreadId, currentUserId, hasUserInteracted]);

  if (loadingThreads) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-600 dark:text-neutral-200">Loading chat...</div>;
  }

  if (error && threads.length === 0) {
    return <div className="flex min-h-screen items-center justify-center text-red-600 dark:text-red-400">{error}</div>;
  }

  const activeThreadTyping = activeThreadId ? typingStatus[activeThreadId] : null;

  return (
    <main className="flex h-full overflow-hidden bg-white dark:bg-[#0a1018]">
      {/* Mobile Header */}
      <div className="absolute top-0 left-0 right-0 z-10 md:hidden flex items-center justify-between bg-white/95 backdrop-blur-sm p-4 dark:bg-[#111b21]/95">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/employee/dashboard')}
            className="text-[#54656f] hover:text-[#00a884] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h1 className="text-lg font-medium text-[#111b21] dark:text-white">Chat</h1>
          {totalUnread > 0 && (
            <span className="min-w-[1.25rem] h-5 rounded-full bg-[#00a884] px-1.5 flex items-center justify-center text-xs font-medium text-white">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="hidden md:flex md:w-80 flex-col h-full bg-white dark:bg-[#111b21]">
        {/* Sidebar header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-medium text-[#111b21] dark:text-white">Messages</h1>
            {totalUnread > 0 && (
              <span className="min-w-[1.25rem] h-5 rounded-full bg-[#00a884] px-1.5 flex items-center justify-center text-xs font-medium text-white">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-6 pb-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-full bg-[#f0f2f5] px-12 py-3 text-sm text-[#111b21] placeholder:text-[#667781] focus:outline-none focus:bg-white dark:bg-[#202c33] dark:text-white dark:placeholder:text-[#8696a0] dark:focus:bg-[#2a3942] transition-colors"
            />
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#667781] dark:text-[#8696a0] text-lg">
              search
            </span>
            {normalizedSearchTokens.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
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
                {normalizedSearchTokens.length > 0
                  ? 'No conversations match your search.'
                  : 'No conversations yet.'}
              </p>
            </div>
          )}
          {filteredThreads.map((thread) => {
            const id = getThreadId(thread);
            const isActive = id === activeThreadId;
            const lastMessage = wrapMessageText(thread.lastMessage || 'No messages yet');
            const time = thread.lastTime ? new Date(thread.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const unreadCount = deriveUnreadCount(thread);
            const displayUnread = unreadCount > 99 ? '99+' : unreadCount;
            
            return (
              <button
                key={id || thread.name}
                onClick={() => id && setActiveThreadId(id)}
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
                  <p className="truncate text-sm text-[#667781] dark:text-[#8696a0]">{lastMessage}</p>
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
                    onClick={() => handleStartChat(member)}
                    disabled={creatingThreadId === member.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#f5f6f6] dark:hover:bg-[#1a1a1a] transition-colors disabled:opacity-60"
                  >
                    <div className="relative">
                      <div className="size-8 rounded-full bg-gradient-to-br from-[#008069] to-[#00a884] flex items-center justify-center text-white text-sm font-medium">
                        {member.name?.[0] || 'T'}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-white ${member.status === 'Online' ? 'bg-[#00a884]' : 'bg-[#667781]'} dark:border-[#111b21]`}></div>
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
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col h-full pt-16 md:pt-0">
        {activeThread ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between bg-white/95 backdrop-blur-sm p-6 dark:bg-[#111b21]/95">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#128c7e] flex items-center justify-center text-white font-medium text-sm">
                  {threadDisplayName(activeThread)?.[0] || 'T'}
                </div>
                <div>
                  <h2 className="font-medium text-[#111b21] dark:text-white">{threadDisplayName(activeThread)}</h2>
                  <p className="text-sm text-[#667781] dark:text-[#8696a0]">
                    {activeThreadTyping
                      ? `${activeThreadTyping.name || 'Someone'} is typing...`
                      : 'Click to view info'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages container */}
            <div className="flex-1 overflow-y-auto bg-[#f8f9fa] dark:bg-[#0a1018] px-4 py-6">
              {loadingMessages && (
                <div className="flex h-full items-center justify-center">
                  <div className="flex items-center gap-3">
                    <div className="size-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[#667781] dark:text-[#8696a0]">Loading messages...</span>
                  </div>
                </div>
              )}
              
              {!loadingMessages && messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-6 size-16 rounded-full bg-[#00a884]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-[#00a884]">chat_bubble_outline</span>
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-[#111b21] dark:text-white">No messages yet</h3>
                  <p className="text-[#667781] dark:text-[#8696a0]">Send a message to start the conversation</p>
                </div>
              )}

              <div className="space-y-6 max-w-4xl mx-auto">
                {messages.map((msg) => {
                  const senderId = msg.senderId || msg.sender || msg.senderID || '';
                  const isMe = senderId?.toString() === currentUserId?.toString();
                  const isSeen = isMe && Boolean(seenByOthers[msg.id]);
                  
                  // Debug log for seen status
                  if (isMe) {
                    console.log(`Message ${msg.id} seen status:`, {
                      msgText: msg.text?.substring(0, 20),
                      isSeen,
                      seenByOthers: seenByOthers[msg.id]
                    });
                  }
                  const time = msg.time ? new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  
                  // Determine message status for my messages
                  let statusIcon = 'done'; // Single tick (sent)
                  let statusColor = 'text-[#667781]'; // Gray
                  
                  if (isMe) {
                    if (isSeen) {
                      // Message has been seen - blue double tick
                      statusIcon = 'done_all';
                      statusColor = 'text-[#4fc3f7]';
                    } else {
                      // Check if recipient is actually online
                      const recipientIsOnline = activeThread?.members?.some(member => {
                        const memberId = (member.id || member._id)?.toString();
                        const isOtherUser = memberId !== currentUserId?.toString();
                        return isOtherUser && (
                          member.status === 'Online' || 
                          member.status === 'online' ||
                          member.online === true
                        );
                      }) || activeThread?.online === true;
                      
                      console.log('Delivery check:', {
                        recipientIsOnline,
                        threadOnline: activeThread?.online,
                        threadMembers: activeThread?.members?.map(m => ({
                          name: m.name,
                          status: m.status,
                          online: m.online
                        })),
                        msgText: msg.text?.substring(0, 20)
                      });
                      
                      if (recipientIsOnline) {
                        // Message delivered to online recipient - gray double tick
                        statusIcon = 'done_all';
                        statusColor = 'text-[#667781]';
                      } else {
                        // Recipient offline - single gray tick (sent only)
                        statusIcon = 'done';
                        statusColor = 'text-[#667781]';
                      }
                    }
                  }
                  
                  return (
                    <div key={`${msg.id}-${isSeen ? 'seen' : 'unseen'}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-3 ${
                        isMe 
                          ? 'bg-[#d9fdd3] rounded-2xl rounded-br-md ml-12' 
                          : 'bg-white rounded-2xl rounded-bl-md shadow-sm border border-gray-100 mr-12 dark:bg-[#2a3942] dark:border-[#404040]'
                      }`}>
                        {!isMe && (
                          <div className="mb-1 text-xs font-medium text-[#00a884]">{msg.from}</div>
                        )}
                        <div className="whitespace-pre-line break-words text-[#111b21] dark:text-white leading-relaxed">
                          {wrapMessageText(msg.text || '')}
                        </div>
                        <div className="mt-2 flex items-center justify-end gap-1">
                          <span className="text-xs text-[#667781] dark:text-[#8696a0]">{time}</span>
                          {isMe && (
                            <span className={`material-symbols-outlined text-xs ${statusColor}`}>
                              {statusIcon}
                            </span>
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
              <div className="flex gap-3 overflow-x-auto bg-white px-6 py-3 dark:bg-[#111b21] scrollbar-none">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => selectQuickReply(reply)}
                    className="shrink-0 rounded-full bg-[#f0f2f5] px-4 py-2 text-sm text-[#111b21] hover:bg-[#00a884] hover:text-white transition-all dark:bg-[#2a3942] dark:text-white dark:hover:bg-[#00a884]"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {/* Message input */}
            <div className="bg-white p-6 dark:bg-[#111b21]">
              <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-3">
                <div className="relative">
                  <button
                    type="button"
                    ref={emojiButtonRef}
                    onClick={toggleEmojiPicker}
                    aria-label="Insert emoji"
                    className="flex rounded-full p-2 text-[#54656f] hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942] transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">emoji_emotions</span>
                  </button>
                  {showEmojiPicker && (
                    <div
                      ref={emojiPickerRef}
                      className="absolute bottom-full left-0 z-40 mb-2 w-64 rounded-xl border border-[#e9edef] bg-white p-4 shadow-xl dark:border-[#303d45] dark:bg-[#111b21]"
                    >
                      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[#54656f] dark:text-[#8696a0]">
                        Quick Emojis
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {emojiOptions.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleEmojiSelect(emoji)}
                            className="rounded-lg bg-[#f0f2f5] p-2 text-xl hover:bg-[#e6f4ea] transition-colors dark:bg-[#2a3942] dark:hover:bg-[#1f2b32]"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 relative">
                  <input
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    onBlur={handleInputBlur}
                    placeholder="Type your message..."
                    className="w-full rounded-full bg-[#f0f2f5] px-6 py-3 pr-12 text-[#111b21] placeholder:text-[#667781] focus:outline-none focus:bg-white focus:shadow-sm transition-all dark:bg-[#2a3942] dark:text-white dark:placeholder:text-[#8696a0] dark:focus:bg-[#1f2b32]"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#54656f] hover:bg-[#e6f4ea] dark:hover:bg-[#1f2b32] transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">attach_file</span>
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="rounded-full bg-[#00a884] p-3 text-white hover:bg-[#008069] disabled:opacity-50 disabled:hover:bg-[#00a884] transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">{sending ? 'schedule' : 'send'}</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center bg-[#f8f9fa] dark:bg-[#0a1018] text-center">
            <div className="mb-8 size-24 rounded-full bg-[#00a884]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-[#00a884]">chat_bubble_outline</span>
            </div>
            <h2 className="mb-3 text-xl font-medium text-[#111b21] dark:text-white">Select a conversation</h2>
            <p className="text-[#667781] dark:text-[#8696a0] max-w-md">Choose a conversation from the sidebar to start messaging with your team members</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default EmployeeChat;
