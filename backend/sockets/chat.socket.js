module.exports = function registerChatSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join_room', (roomId) => {
      if (roomId) socket.join(roomId);
    });

    socket.on('typing', (payload = {}) => {
      const { conversationId, userId, name, isTyping = false } = payload;
      if (!conversationId || !userId) return;
      socket.to(conversationId).emit('user_typing', {
        conversationId,
        userId,
        name: name || null,
        isTyping: Boolean(isTyping),
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('send_message', (payload = {}) => {
      const { conversationId, message } = payload;
      if (!conversationId || !message) return;
      io.to(conversationId).emit('receive_message', { ...message, conversationId });
    });

    socket.on('message_read', (payload = {}) => {
      const { conversationId, messageIds, readerId } = payload;
      if (!conversationId || !Array.isArray(messageIds) || messageIds.length === 0) return;
      socket.to(conversationId).emit('message_read', { conversationId, messageIds, readerId });
    });
  });
  return io;
};
