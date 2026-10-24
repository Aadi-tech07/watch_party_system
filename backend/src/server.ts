import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './sockets/socketHandler';
import { DatabaseService } from './db/database';
import { RoomManager } from './services/RoomManager';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || '*';

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Initialize SQLite Database Service
const db = DatabaseService.getInstance();
const roomManager = RoomManager.getInstance();

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/rooms', (req, res) => {
  const rooms = db.getAllRooms();
  res.json({ rooms });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    id: room.id,
    name: room.name,
    currentVideoId: room.currentVideoId,
    playState: room.playState,
    currentTime: room.calculateCurrentTime(),
    participantsCount: room.participants.size
  });
});

// Setup WebSocket event handlers
setupSocketHandlers(io);

// Production frontend static serve (if built)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexHtml = path.join(frontendDist, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send('Watch Party Backend API & WebSocket Server Running.');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Watch Party Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
});

export { app, server, io };
