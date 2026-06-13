// ─────────────────────────────────────────────
// Shared Socket.IO instance holder
// Breaks the circular dependency between server.js and controllers.
//
// server.js creates the `io` instance and calls setIO(io).
// Controllers call getIO() to emit events.
// ─────────────────────────────────────────────

let _io = null;

export const setIO = (io) => {
  _io = io;
};

export const getIO = () => {
  if (!_io) {
    console.warn("[socketInstance] getIO() called before setIO() — io is null");
  }
  return _io;
};
