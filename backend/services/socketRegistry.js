let ioInstance = null;
let onlineUsersMap = null;

const registerSocket = (io, onlineUsers) => {
  ioInstance = io;
  onlineUsersMap = onlineUsers;
};

const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  const socketId = onlineUsersMap?.get(String(userId));
  if (socketId) {
    ioInstance.to(socketId).emit(event, payload);
  }
};

module.exports = { registerSocket, emitToUser };
