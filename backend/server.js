const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

require("./config/db");

const authRoutes = require("./routes/authRoutes");
const boardRoutes = require("./routes/boardRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://192.168.1.29:5173"],
    methods: ["GET", "POST"],
  },
});

const onlineUsers = {};

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("join-board", ({ boardId, username }) => {
    socket.join(`board-${boardId}`);

    // simpan boardId di socket supaya bisa dipakai saat disconnect
    socket.data.boardId = boardId;
    socket.data.username = username;

    if (!onlineUsers[boardId]) {
      onlineUsers[boardId] = [];
    }

    const exists = onlineUsers[boardId].find(
      (u) => u.socketId === socket.id
    );

    if (!exists) {
      onlineUsers[boardId].push({
        socketId: socket.id,
        username,
      });
    }

    io.to(`board-${boardId}`).emit(
      "users-online",
      onlineUsers[boardId]
    );
  });

  // ---------- realtime board data sync ----------
  // dipanggil setiap kali notes/texts/shapes/stamps berubah di salah satu client
  // payload: { boardId, data: { notes, texts, shapes, stamps }, username }
  socket.on("board-update", ({ boardId, data, username }) => {
    // broadcast ke semua client LAIN di board yang sama (kecuali pengirim)
    socket.to(`board-${boardId}`).emit("board-update", { data, username });
  });

  // ---------- realtime cursor position ----------
  // payload: { boardId, x, y, username }
  socket.on("cursor-move", ({ boardId, x, y, username }) => {
    socket.to(`board-${boardId}`).emit("cursor-move", {
      socketId: socket.id,
      x,
      y,
      username,
    });
  });

  // ✨ BARU: Activity log event
  // payload: { boardId, username, action }
  socket.on("activity", ({ boardId, username, action }) => {
    io.to(`board-${boardId}`).emit("activity", {
      username,
      action,
      timestamp: new Date(),
    });
    console.log(`[${boardId}] ${username}: ${action}`);
  });

  // ✨ BARU: Text editing - real-time update
  socket.on("text-edit", ({ boardId, elementId, text, username }) => {
    socket.to(`board-${boardId}`).emit("text-updated", {
      elementId,
      text,
    });
  });

  // ✨ BARU: Note editing - real-time update
  socket.on("note-edit", ({ boardId, elementId, text, username }) => {
    socket.to(`board-${boardId}`).emit("note-updated", {
      elementId,
      text,
    });
  });

  // ✨ BARU: Track siapa yang sedang edit
  socket.on("user-editing", ({ boardId, elementId, username, kind, isEditing }) => {
    io.to(`board-${boardId}`).emit("user-editing", {
      elementId,
      username,
      kind,
      isEditing,
    });
  });

  socket.on("disconnect", () => {
    const boardId = socket.data.boardId;

    if (boardId && onlineUsers[boardId]) {
      onlineUsers[boardId] = onlineUsers[boardId].filter(
        (u) => u.socketId !== socket.id
      );

      io.to(`board-${boardId}`).emit(
        "users-online",
        onlineUsers[boardId]
      );

      // beri tahu client lain supaya hapus kursor user yang disconnect
      io.to(`board-${boardId}`).emit("cursor-leave", {
        socketId: socket.id,
      });

      // ✨ BARU: broadcast user leave activity
      io.to(`board-${boardId}`).emit("activity", {
        username: socket.data.username,
        action: "left the board",
        timestamp: new Date(),
      });
    }

    console.log("User Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `Server berjalan di http://localhost:${PORT}`
  );
});