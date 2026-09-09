const mongoose = require('mongoose');
const Chat = require('../models/common/Chat');
const Message = require('../models/common/Message');
const PortalAccess = require('../models/superAdmin/PortalAccess');
const HR_ROLES = ['hr', 'it_hr', 'admin', 'super_admin'];
const SUPPORT_ROLES = ['admin', 'super_admin', 'it_manager', 'it_admin'];
const canAccessRoom = async (user, room) => {
  if (typeof room !== 'string' || room.length > 100) return false;
  if (room === 'support:user:' + user.userId || room === 'outsourcing:user:' + user.userId) return true;
  if (room === 'support:admins') return SUPPORT_ROLES.includes(user.role);
  if (room === 'hr') {
    if (!HR_ROLES.includes(user.role)) return false;
    if (['admin', 'super_admin'].includes(user.role)) return true;
    const rule = await PortalAccess.findOne({ role: user.role, portal: 'hr' }).lean();
    return !rule || rule.canAccess === true;
  }
  if (room === 'outsourcing:admins') return ['admin', 'super_admin', 'hr', 'finance_manager', 'finance_employee', 'law_head', 'law_employee'].includes(user.role);
  if (!mongoose.isObjectIdOrHexString(room)) return false;
  // Match the existing API's open-thread convention as well as explicit membership.
  return Boolean(await Chat.exists({ _id: room, $or: [
    { members: user.userId }, { members: { $size: 0 } }, { members: { $exists: false } },
  ] }));
};
const registerSecureSocketEvents = (io, socket, onlineUsers, logger) => {
  const on = (event, fn) => socket.on(event, (...args) => Promise.resolve()
    .then(() => fn(...args))
    .catch(() => logger.warn({ event, userId: socket.data.userId }, 'Socket event rejected')));
  const join = async (room) => { if (await canAccessRoom(socket.data, room)) await socket.join(room); };
  on('joinThread', join);
  on('join_room', join);
  on('leaveThread', (room) => { if (typeof room === 'string') socket.leave(room); });
  on('hr:subscribe', () => join('hr'));
  on('hr:unsubscribe', () => socket.leave('hr'));
  on('outsourcing:subscribe', async () => {
    await join('outsourcing:user:' + socket.data.userId);
    await join('outsourcing:admins');
  });
  on('outsourcing:unsubscribe', () => {
    socket.leave('outsourcing:user:' + socket.data.userId);
    socket.leave('outsourcing:admins');
  });
  for (const [event, idField, idsField, output] of [
    ['chat:seen', 'threadId', 'seenMessageIds', 'chat:seen'],
    ['message_read', 'conversationId', 'messageIds', 'message_read'],
  ]) on(event, async (payload = {}) => {
    const room = payload[idField], ids = payload[idsField];
    if (!Array.isArray(ids) || ids.length > 100 || !ids.every(mongoose.isObjectIdOrHexString) ||
        !mongoose.isObjectIdOrHexString(room) || !await canAccessRoom(socket.data, room)) return;
    socket.to(room).emit(output, { [idField]: room, [idsField]: ids, readerId: socket.data.userId, seenAt: new Date().toISOString() });
  });
  for (const [event, idField, output] of [
    ['chat:typing', 'threadId', 'chat:typing'], ['typing', 'conversationId', 'user_typing'],
  ]) on(event, async (payload = {}) => {
    const room = payload[idField];
    if (!mongoose.isObjectIdOrHexString(room) || !await canAccessRoom(socket.data, room)) return;
    socket.to(room).emit(output, {
      [idField]: room, userId: socket.data.userId, name: socket.data.name || null,
      isTyping: payload.isTyping === true, timestamp: new Date().toISOString(),
    });
  });
  on('send_message', async (payload = {}) => {
    const room = payload.conversationId, id = payload.message?._id || payload.message?.id;
    if (!mongoose.isObjectIdOrHexString(room) || !mongoose.isObjectIdOrHexString(id) ||
        !await canAccessRoom(socket.data, room)) return;
    const message = await Message.findOne({ _id: id, thread: room, sender: socket.data.userId }).lean();
    if (message) io.to(room).emit('receive_message', { ...message, conversationId: room });
  });
  on('user_online', () => {
    onlineUsers.set(socket.data.userId, socket.id);
    io.emit('user_presence', { userId: socket.data.userId, online: true });
  });
};
module.exports = { canAccessRoom, registerSecureSocketEvents };
