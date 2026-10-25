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

// Authentication Endpoints
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body || {};
  const result = db.registerUser(username, password);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json(result);
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const result = db.loginUser(username, password);
  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }
  res.json(result);
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token as string);
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const user = db.getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  res.json({ user, token });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = req.body?.token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);
  if (token) {
    db.deleteSession(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Rooms & Storage Endpoints
app.get('/api/rooms', (req, res) => {
  const rooms = db.getActiveRooms();
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

app.get('/api/storage-info', (req, res) => {
  try {
    const stats = db.getStorageStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve storage stats', details: err?.message });
  }
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
