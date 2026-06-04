import dotenv from "dotenv";
dotenv.config();

import dns from "dns";
import http from "http";

import app from "./src/app.js";
import connectToDb from "./src/config/db/db.js";
import { startMissedFollowUpScheduler } from "./src/utils/scheduler.js";

import { Server } from "socket.io";
import { setIO } from "./src/config/socketInstance.js";
// ======================================================
// DNS
// ======================================================
dns.setServers(["8.8.8.8", "8.8.4.4"]);
// ======================================================
// PORT
// ======================================================
const PORT = process.env.PORT || 5500;
// ======================================================
// HTTP SERVER
// ======================================================
const server = http.createServer(app);
// ======================================================
// SOCKET IO
// ======================================================

export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// Make io available to controllers via the shared holder (avoids circular imports)
setIO(io);

// ======================================================
// SOCKET CONNECTION
// ======================================================

io.on("connection", (socket) => {
  console.log("Socket Connected :", socket.id);

  // Client emits { userId } after login so we can target them specifically
  socket.on("join", ({ userId }) => {
    if (userId) {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined room: ${userId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket Disconnected :", socket.id);
  });
});

// ======================================================
// START SERVER
// ======================================================

const startServer = async () => {
  try {
    await connectToDb();
    
    // Start Scheduler
    startMissedFollowUpScheduler();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error);

    process.exit(1);
  }
};

startServer();