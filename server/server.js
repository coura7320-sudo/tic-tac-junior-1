const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for easier deployment
    methods: ["GET", "POST"],
  },
});

// Store room state: { roomID: { players: [{ id: socket.id, role: 'X' | 'O' }] } }
const rooms = {};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (roomID) => {
    if (!rooms[roomID]) {
      rooms[roomID] = { players: [] };
    }

    const room = rooms[roomID];

    // Check if room is full
    if (room.players.length >= 2) {
      socket.emit("room_error", "Room is full. Please join another room.");
      return;
    }

    // Determine role: first is X, second is O
    const role = room.players.length === 0 ? "X" : "O";
    
    room.players.push({ id: socket.id, role });
    socket.join(roomID);

    console.log(`User with ID: ${socket.id} joined room: ${roomID} as ${role}`);

    // Send the user their role
    socket.emit("room_joined", { roomID, role });

    // Tell everyone the game is ready if we have 2 players
    if (room.players.length === 2) {
      io.to(roomID).emit("game_ready", "Starting game...");
    }
  });

  socket.on("make_move", (data) => {
    // data should contain { roomID, squares, nextTurn }
    socket.to(data.roomID).emit("move_made", data);
  });

  socket.on("restart_game", (roomID) => {
    socket.to(roomID).emit("game_restarted");
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
    // Cleanup room info if needed (simplified for the lab)
    for (const roomID in rooms) {
      rooms[roomID].players = rooms[roomID].players.filter((p) => p.id !== socket.id);
      if (rooms[roomID].players.length === 0) {
        delete rooms[roomID];
      } else {
        // Let the remaining player know someone disconnected
        socket.to(roomID).emit("opponent_disconnected", "Opponent left the game.");
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`SERVER IS RUNNING on port ${PORT}`);
});
