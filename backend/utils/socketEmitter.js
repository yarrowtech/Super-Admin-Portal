module.exports = {
  emit: (io, event, payload) => io && io.emit(event, payload),
};
