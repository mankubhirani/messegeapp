const http = require("http");
const express = require("express");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Store active users: socketId -> username
let activeUsers = {};

function broadcastUserList() {
  const users = Object.entries(activeUsers).map(([id, name]) => ({ id, name }));
  io.emit("update-users", users);
}

function getTimestamp() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

io.on("connection", (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // ── New user joining ──
  socket.on("new-user", (username) => {
    activeUsers[socket.id] = username;
    io.emit("user-joined", `${username} has joined the chat`);
    broadcastUserList();
  });

  // ── Typing indicators ──
  socket.on("typing", () => {
    const username = activeUsers[socket.id];
    if (username) socket.broadcast.emit("user-typing", username);
  });

  socket.on("stop-typing", () => {
    socket.broadcast.emit("user-stopped-typing");
  });

  // ── Broadcast message (with optional reply) ──
  socket.on("user-message", (payload) => {
    const username = activeUsers[socket.id] || "Anonymous";
    const timestamp = getTimestamp();

    // payload can be { message, replyTo } or just a string (backwards compat)
    const message = typeof payload === "string" ? payload : payload.message;
    const replyTo = typeof payload === "object" ? payload.replyTo : null;

    io.emit("message", { username, message, timestamp, replyTo });
  });

  // ── Private message ──
  socket.on("private-message", ({ targetSocketId, message }) => {
    const username = activeUsers[socket.id] || "Anonymous";
    if (targetSocketId && io.sockets.sockets.get(targetSocketId)) {
      io.to(targetSocketId).emit("private-message", { username, message });
    }
  });

  // ── Disconnect ──
  socket.on("disconnect", () => {
    const username = activeUsers[socket.id];
    if (username) {
      console.log(`[-] Disconnected: ${username}`);
      io.emit("user-left", `${username} has left the chat`);
      delete activeUsers[socket.id];
      broadcastUserList();
    }
  });
});

// Serve static files from /public
app.use(express.static(path.resolve("./public")));
app.get("/", (req, res) => {
  res.sendFile(path.resolve("./public/index.html"));
});

server.listen(9000, () => console.log("🚀 VibeChat running at http://localhost:9000"));
