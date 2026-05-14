import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { io } from 'socket.io-client';
import { chatApi } from '../../services/chat';
import ChatLayout from '../../components/chat/ChatLayout';
import ChatSidebar from '../../components/chat/ChatSidebar';
import ChatWindow from '../../components/chat/ChatWindow';

const roleOptions = [
  { value: 'all', label: 'All (Allowed roles)' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
];

export default function CEOChatPage() {
  const { token, user } = useAuth();
  const toast = useToast();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [typingText, setTypingText] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [announcement, setAnnouncement] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => (c._id || c.id || c.conversationId) === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  useEffect(() => {
    if (!token || !user?._id) return;
    (async () => {
      const res = await chatApi.getConversations(token);
      const list = res?.data?.conversations || [];
      const mapped = list.map((item) => ({ ...item, currentUserId: String(user._id) }));
      setConversations(mapped);
      if (mapped[0]) setActiveConversationId(mapped[0]._id || mapped[0].id || mapped[0].conversationId);
    })().catch((err) => toast.error(err.message || 'Failed to load conversations'));
  }, [token, user, toast]);

  useEffect(() => {
    if (!token || !activeConversationId) return;
    (async () => {
      const res = await chatApi.getMessages(token, activeConversationId);
      setMessages(res?.data || []);
      const unreadIds = (res?.data || [])
        .filter((m) => String(m.sender) !== String(user?._id) && !(m.readBy || []).some((r) => String(r.user) === String(user?._id)))
        .map((m) => m._id);
      if (unreadIds.length) {
        await chatApi.markRead(token, activeConversationId, unreadIds);
      }
    })().catch((err) => toast.error(err.message || 'Failed to load messages'));
  }, [token, activeConversationId, user, toast]);

  useEffect(() => {
    if (!token) return;
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
    const socket = io(baseUrl, { auth: { token } });
    socketRef.current = socket;
    socket.emit('user_online', { userId: user?._id });
    socket.on('receive_message', (payload) => {
      if (String(payload.thread) === String(activeConversationId)) {
        setMessages((prev) => [...prev, payload]);
      }
    });
    socket.on('user_typing', ({ conversationId, name, isTyping }) => {
      if (String(conversationId) !== String(activeConversationId)) return;
      setTypingText(isTyping ? `${name || 'Someone'} is typing...` : '');
    });
    socket.on('user_presence', ({ userId, online }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(String(userId));
        else next.delete(String(userId));
        return next;
      });
    });
    return () => socket.disconnect();
  }, [token, activeConversationId, user]);

  useEffect(() => {
    if (!socketRef.current || !activeConversationId) return;
    socketRef.current.emit('join_room', activeConversationId);
  }, [activeConversationId]);

  const sendAnnouncement = async () => {
    if (!announcement.trim() || !token) return;
    setSending(true);
    try {
      await chatApi.sendAnnouncement(token, { content: announcement.trim(), targetRole });
      setAnnouncement('');
      toast.success('Announcement sent');
    } catch (err) {
      toast.error(err.message || 'Failed to send announcement');
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !activeConversationId || !token) return;
    const body = draft.trim();
    setDraft('');
    try {
      const res = await chatApi.sendMessage(token, { conversationId: activeConversationId, content: body });
      const message = res?.data;
      setMessages((prev) => [...prev, message]);
      socketRef.current?.emit('send_message', { conversationId: activeConversationId, message });
    } catch (err) {
      toast.error(err.message || 'Failed to send');
    }
  };

  return (
    <div className="h-full space-y-3">
      <div className="border-b border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid gap-2 md:grid-cols-[1fr_220px_120px]">
          <input
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="CEO announcement..."
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button onClick={sendAnnouncement} disabled={sending || !announcement.trim()} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {sending ? 'Sending...' : 'Broadcast'}
          </button>
        </div>
      </div>
      <ChatLayout
        sidebar={
          <ChatSidebar
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={setActiveConversationId}
            onlineUserIds={onlineUserIds}
          />
        }
        window={
          <ChatWindow
            activeConversation={activeConversation}
            messages={messages}
            currentUserId={user?._id}
            draft={draft}
            onDraftChange={setDraft}
            onSend={sendMessage}
            typingText={typingText}
            onTyping={(isTyping) =>
              socketRef.current?.emit('typing', {
                conversationId: activeConversationId,
                userId: user?._id,
                name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
                isTyping,
              })
            }
          />
        }
      />
    </div>
  );
}
