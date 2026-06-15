const emitToRoom = (io, room, event, payload) => {
  if (!io || !room || !event) return;
  io.to(room).emit(event, payload);
};

const emitGlobal = (io, event, payload) => {
  if (!io || !event) return;
  io.emit(event, payload);
};

module.exports = {
  emitToRoom,
  emitGlobal,
};
