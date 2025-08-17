import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";
import ChatWindow from "./components/ChatWindow";
import MessageInput from "./components/MessageInput";

const socket = io("http://localhost:5000");

function App() {
  const [messages, setMessages] = useState([]);
  const [user] = useState(() => "User" + Math.floor(Math.random() * 1000));

  useEffect(() => {
    // Load history
    axios.get("http://localhost:5000/messages").then(res => setMessages(res.data));

    // Listen for new messages
    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => socket.off("message");
  }, []);

  const sendMessage = (text) => {
    if (!text) return;
    socket.emit("sendMessage", { user, text });
  };

  return (
    <div className="app">
      <h2>💬 Real-time Chat</h2>
      <ChatWindow messages={messages} currentUser={user} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
}

export default App;
