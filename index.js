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
  });

  // Handle user messages
  socket.on("user-message", (message) => {
    const username = activeUsers[socket.id] || "Anonymous";
    io.emit("message", { username, message });
  });

  // Handle user disconnecting
  socket.on("disconnect", () => {
    const username = activeUsers[socket.id];
    if (username) {
      io.emit("user-left", `${username} has left the chat`);
      delete activeUsers[socket.id];
    }
  });
});

// Serve static files
app.use(express.static(path.resolve("./public")));

app.get("/", (req, res) => {
  res.sendFile(path.resolve("./public/index.html"));
});

server.listen(9000, () => console.log(`Server started at PORT: 9000`));
