import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

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
    `);
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
}
