import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import Message from "./models/Message.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/chatapp", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(()=> console.log("✅ MongoDB connected"))
  .catch(err=> console.error("❌ Mongo error:", err));

// ✅ REST API: Get last 20 messages
app.get("/messages", async (req, res) => {
  const msgs = await Message.find().sort({ createdAt: -1 }).limit(20);
  res.json(msgs.reverse());
});

// ✅ Socket.IO events
io.on("connection", (socket) => {
  console.log("🔵 User connected:", socket.id);

  socket.on("sendMessage", async (msg) => {
    const message = new Message({ user: msg.user, text: msg.text });
    await message.save();

    io.emit("message", message); // broadcast to everyone
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// ✅ Start server
const PORT = 5000;
server.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
