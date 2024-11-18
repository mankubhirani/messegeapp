const http = require("http");
const express = require("express");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Store active users
let activeUsers = {};

io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle new user joining
  socket.on("new-user", (username) => {
    activeUsers[socket.id] = username;
    io.emit("user-joined", `${username} has joined the chat`);
    io.emit("update-users", Object.values(activeUsers));
  });

  // Handle user typing
  socket.on("typing", () => {
    socket.broadcast.emit("user-typing", activeUsers[socket.id]);
  });

  socket.on("stop-typing", () => {
    socket.broadcast.emit("user-stopped-typing", activeUsers[socket.id]);
  });

  // Handle user messages
  socket.on("user-message", (message) => {
    const username = activeUsers[socket.id] || "Anonymous";
    const timestamp = new Date().toLocaleTimeString();
    io.emit("message", { username, message, timestamp });
  });

  // Private message functionality
  socket.on("private-message", (data) => {
    const targetSocketId = data.targetSocketId;
    io.to(targetSocketId).emit("private-message", { username: activeUsers[socket.id], message: data.message });
  });

  // Handle user disconnecting
  socket.on("disconnect", () => {
    const username = activeUsers[socket.id];
    if (username) {
      io.emit("user-left", `${username} has left the chat`);
      delete activeUsers[socket.id];
      io.emit("update-users", Object.values(activeUsers));
    }
  });
});

// Serve static files
app.use(express.static(path.resolve("./public")));

app.get("/", (req, res) => {
  res.sendFile(path.resolve("./public/index.html"));
});

server.listen(9000, () => console.log(`Server started at PORT: 9000`));
