// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Serve static client files (put index.html in /public)
app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map(); // roomName -> Map<socketId, username>

function getUsers(room) {
  const map = rooms.get(room) || new Map();
  return [...map.values()];
}

io.on("connection", (socket) => {
  socket.data.username = null;
  socket.data.room = null;

  socket.on("join", ({ username, room }) => {
    username = (username || "Guest").trim().slice(0, 20) || "Guest";
    room = (room || "general").trim().slice(0, 24) || "general";

    socket.join(room);
    socket.data.username = username;
    socket.data.room = room;

    if (!rooms.has(room)) rooms.set(room, new Map());
    rooms.get(room).set(socket.id, username);

    // Notify others
    socket.to(room).emit("system", `${username} joined`);
    io.to(room).emit("users", getUsers(room));
  });

  socket.on("typing", (isTyping) => {
    const { room, username } = socket.data;
    if (!room) return;
    socket.to(room).emit("typing", { username, isTyping: !!isTyping });
  });

  socket.on("message", (text) => {
    const { room, username } = socket.data;
    if (!room || !text) return;
    const msg = {
      username,
      text: String(text).slice(0, 2000),
      ts: Date.now()
    };
    io.to(room).emit("message", msg);
  });

  socket.on("switchRoom", (newRoom) => {
    const { room, username } = socket.data;
    if (room) {
      socket.leave(room);
      rooms.get(room)?.delete(socket.id);
      socket.to(room).emit("system", `${username} left`);
      io.to(room).emit("users", getUsers(room));
    }
    socket.emit("system", `Switched to ${newRoom}`);
    socket.data.room = null;
    socket.emit("joinedPrompt"); // ask client to emit join() again
  });

  socket.on("disconnect", () => {
    const { room, username } = socket.data;
    if (!room) return;
    rooms.get(room)?.delete(socket.id);
    socket.to(room).emit("system", `${username} left`);
    io.to(room).emit("users", getUsers(room));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
