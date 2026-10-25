import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'watchparty.sqlite');

export class DatabaseService {
  private static instance: DatabaseService;
  private db: DatabaseSync;

  private constructor() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new DatabaseSync(DB_PATH);
    this.initTables();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        host_id TEXT NOT NULL,
        current_video_id TEXT NOT NULL,
        play_state TEXT NOT NULL DEFAULT 'paused',
        current_time REAL NOT NULL DEFAULT 0.0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        joined_at INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS playlist (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        added_by TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_color TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Reset active participants on server boot since no sockets are connected initially
    this.db.exec(`UPDATE participants SET is_active = 0;`);
  }

  // Room queries
  public saveRoom(room: {
    id: string;
    name: string;
    hostId: string;
    currentVideoId: string;
    playState: string;
    currentTime: number;
    createdAt: number;
    updatedAt: number;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO rooms (id, name, host_id, current_video_id, play_state, current_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        host_id = excluded.host_id,
        current_video_id = excluded.current_video_id,
        play_state = excluded.play_state,
        current_time = excluded.current_time,
        updated_at = excluded.updated_at
    `);
    stmt.run(
      room.id,
      room.name,
      room.hostId,
      room.currentVideoId,
      room.playState,
      room.currentTime,
      room.createdAt,
      room.updatedAt
    );
  }

  public getRoom(id: string): any {
    const stmt = this.db.prepare(`SELECT * FROM rooms WHERE id = ?`);
    return stmt.get(id);
  }

  public getAllRooms(): any[] {
    const stmt = this.db.prepare(`SELECT * FROM rooms ORDER BY updated_at DESC LIMIT 20`);
    return stmt.all() as any[];
  }

  public getActiveRooms(): any[] {
    const stmt = this.db.prepare(`
      SELECT r.*, COUNT(p.id) as participant_count FROM rooms r
      INNER JOIN participants p ON p.room_id = r.id AND p.is_active = 1
      GROUP BY r.id
      ORDER BY r.updated_at DESC LIMIT 20
    `);
    return stmt.all() as any[];
  }

  // Participants queries
  public saveParticipant(participant: {
    id: string;
    roomId: string;
    username: string;
    role: string;
    joinedAt: number;
    isActive: number;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO participants (id, room_id, username, role, joined_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        role = excluded.role,
        is_active = excluded.is_active
    `);
    stmt.run(
      participant.id,
      participant.roomId,
      participant.username,
      participant.role,
      participant.joinedAt,
      participant.isActive
    );
  }

  public updateParticipantRole(id: string, role: string): void {
    const stmt = this.db.prepare(`UPDATE participants SET role = ? WHERE id = ?`);
    stmt.run(role, id);
  }

  public getRoomParticipants(roomId: string): any[] {
    const stmt = this.db.prepare(`SELECT * FROM participants WHERE room_id = ? AND is_active = 1`);
    return stmt.all(roomId) as any[];
  }

  // Chat queries
  public saveChatMessage(msg: {
    id: string;
    roomId: string;
    userId: string;
    username: string;
    role: string;
    text: string;
    createdAt: number;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO chat_messages (id, room_id, user_id, username, role, text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      msg.id,
      msg.roomId,
      msg.userId,
      msg.username,
      msg.role,
      msg.text,
      msg.createdAt
    );
  }

  public getRoomMessages(roomId: string, limit: number = 50): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC LIMIT ?
    `);
    return stmt.all(roomId, limit) as any[];
  }

  // Playlist queries
  public addPlaylistItem(item: {
    id: string;
    roomId: string;
    videoId: string;
    title: string;
    addedBy: string;
    createdAt: number;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO playlist (id, room_id, video_id, title, added_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(item.id, item.roomId, item.videoId, item.title, item.addedBy, item.createdAt);
  }

  public getRoomPlaylist(roomId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM playlist WHERE room_id = ? ORDER BY created_at ASC
    `);
    return stmt.all(roomId) as any[];
  }

  public removePlaylistItem(id: string): void {
    const stmt = this.db.prepare(`DELETE FROM playlist WHERE id = ?`);
    stmt.run(id);
  }

  // --- User Authentication & Sessions ---
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password + '_watchparty_salt').digest('hex');
  }

  public registerUser(username: string, password: string): { success: boolean; token?: string; user?: any; error?: string } {
    const cleanUsername = (username || '').trim();
    if (!cleanUsername || cleanUsername.length < 2) {
      return { success: false, error: 'Username must be at least 2 characters long.' };
    }
    if (!password || password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }

    // Check if user already exists
    const existing = this.db.prepare(`SELECT * FROM users WHERE LOWER(username) = LOWER(?)`).get(cleanUsername);
    if (existing) {
      return { success: false, error: 'Username is already taken. Please choose another or log in.' };
    }

    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const passwordHash = this.hashPassword(password);
    const colors = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#06b6d4', '#e11d48'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    const now = Date.now();

    this.db.prepare(`
      INSERT INTO users (id, username, password_hash, avatar_color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, cleanUsername, passwordHash, avatarColor, now);

    // Create session token
    const token = 'tok_' + crypto.randomBytes(24).toString('hex');
    this.db.prepare(`
      INSERT INTO sessions (token, user_id, username, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, cleanUsername, now);

    return {
      success: true,
      token,
      user: { id: userId, username: cleanUsername, avatarColor, createdAt: now }
    };
  }

  public loginUser(username: string, password: string): { success: boolean; token?: string; user?: any; error?: string } {
    const cleanUsername = (username || '').trim();
    if (!cleanUsername || !password) {
      return { success: false, error: 'Username and password are required.' };
    }

    const user: any = this.db.prepare(`SELECT * FROM users WHERE LOWER(username) = LOWER(?)`).get(cleanUsername);
    if (!user) {
      return { success: false, error: 'Invalid username or password.' };
    }

    const passwordHash = this.hashPassword(password);
    if (user.password_hash !== passwordHash) {
      return { success: false, error: 'Invalid username or password.' };
    }

    const token = 'tok_' + crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO sessions (token, user_id, username, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, user.id, user.username, now);

    return {
      success: true,
      token,
      user: { id: user.id, username: user.username, avatarColor: user.avatar_color, createdAt: user.created_at }
    };
  }

  public getUserByToken(token: string): any | null {
    if (!token) return null;
    const session: any = this.db.prepare(`SELECT * FROM sessions WHERE token = ?`).get(token);
    if (!session) return null;

    const user: any = this.db.prepare(`SELECT id, username, avatar_color, created_at FROM users WHERE id = ?`).get(session.user_id);
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      avatarColor: user.avatar_color,
      createdAt: user.created_at
    };
  }

  public deleteSession(token: string): void {
    if (token) {
      this.db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    }
  }

  // --- SQLite Storage Statistics ---
  public getStorageStats(): any {
    let fileSizeBytes = 0;
    try {
      if (fs.existsSync(DB_PATH)) {
        fileSizeBytes = fs.statSync(DB_PATH).size;
      }
    } catch (e) {
      // Ignore
    }

    const getCount = (table: string): number => {
      try {
        const row: any = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        return row?.count || 0;
      } catch {
        return 0;
      }
    };

    const tables: any[] = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all() as any[];

    return {
      dbPath: DB_PATH,
      fileSizeBytes,
      roomsCount: getCount('rooms'),
      participantsCount: getCount('participants'),
      messagesCount: getCount('chat_messages'),
      playlistCount: getCount('playlist'),
      usersCount: getCount('users'),
      sessionsCount: getCount('sessions'),
      tables: tables.map(t => t.name)
    };
  }
}
