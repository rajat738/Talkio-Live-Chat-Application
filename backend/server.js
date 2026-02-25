require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://mongo:27017/talkio")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.get("/", (req, res) => res.send("🚀 Talkio Backend Running"));

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:3000", methods: ["GET", "POST"] },
});

const Message = require("./models/Message");
const onlineUsers = {};

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  socket.on("user:online", (userId) => {
    onlineUsers[userId] = socket.id;
    socket.userId = userId;
    io.emit("online:users", Object.keys(onlineUsers));
    console.log("👥 Online:", Object.keys(onlineUsers));
  });

  socket.on("send:private", async ({ sender, receiver, content, messageType, imageUrl }) => {
    try {
      const msg = await Message.create({
        sender, receiver,
        content: content || "",
        messageType: messageType || "text",
        imageUrl: imageUrl || "",
      });
      const receiverSocket = onlineUsers[receiver];
      if (receiverSocket) io.to(receiverSocket).emit("receive:private", msg);
      socket.emit("receive:private", msg);
      console.log("💬 Msg:", sender, "->", receiver);
    } catch (err) {
      console.error("❌ Message error:", err.message);
    }
  });

  socket.on("typing", ({ sender, receiver }) => {
    const receiverSocket = onlineUsers[receiver];
    if (receiverSocket) io.to(receiverSocket).emit("user:typing", { sender });
  });

  socket.on("delete:message", async ({ messageId, sender, receiver }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { deleted: true, content: "", imageUrl: "" });
      socket.emit("message:deleted", { messageId });
      const receiverSocket = onlineUsers[receiver];
      if (receiverSocket) io.to(receiverSocket).emit("message:deleted", { messageId });
    } catch (err) {
      console.error("❌ Delete error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      delete onlineUsers[socket.userId];
      io.emit("online:users", Object.keys(onlineUsers));
    }
    console.log("🔴 Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🔥 Server running on http://localhost:${PORT}`));
