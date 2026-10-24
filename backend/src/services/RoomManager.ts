import { Room } from '../models/Room';
import { Participant } from '../models/Participant';
import { DatabaseService } from '../db/database';
import { Role } from '../types';

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, Room>;
  private socketToRoom: Map<string, string>; // socketId -> roomId
  private db: DatabaseService;

  private constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map();
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  public generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  public createRoom(
    name: string,
    hostUsername: string,
    socketId: string,
    customRoomId?: string,
    initialVideoId: string = 'dQw4w9WgXcQ',
    customHostId?: string
  ): { room: Room; host: Participant } {
    const roomId = customRoomId ? customRoomId.toUpperCase().trim() : this.generateRoomId();
    const hostId = customHostId || ('user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const host = new Participant(hostId, socketId, hostUsername, 'host');

    const room = new Room(
      roomId,
      name || `${hostUsername}'s Party`,
      hostId,
      initialVideoId,
      'paused',
      0
    );

    room.addParticipant(host);
    this.rooms.set(roomId, room);
    this.socketToRoom.set(socketId, roomId);

    // Persist to Database
    this.db.saveRoom({
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      currentVideoId: room.currentVideoId,
      playState: room.playState,
      currentTime: room.currentTime,
      createdAt: room.createdAt,
      updatedAt: Date.now()
    });

    this.db.saveParticipant({
      id: host.id,
      roomId: room.id,
      username: host.username,
      role: host.role,
      joinedAt: host.joinedAt,
      isActive: 1
    });

    return { room, host };
  }

  public getOrCreateRoom(roomId: string, name: string = 'Watch Party'): Room {
    const normalizedId = roomId.toUpperCase().trim();
    let room = this.rooms.get(normalizedId);
    if (!room) {
      // Check database
      const dbRoom = this.db.getRoom(normalizedId);
      if (dbRoom) {
        room = new Room(
          dbRoom.id,
          dbRoom.name,
          dbRoom.host_id,
          dbRoom.current_video_id,
          dbRoom.play_state,
          dbRoom.current_time,
          dbRoom.created_at
        );
        this.rooms.set(normalizedId, room);
      }
    }
    return room!;
  }

  public joinRoom(
    roomId: string,
    username: string,
    socketId: string,
    customUserId?: string
  ): { room: Room; participant: Participant; isNewHost: boolean } {
    const normalizedId = roomId.toUpperCase().trim();
    let room = this.getRoom(normalizedId);

    let isNewHost = false;
    let participantRole: Role = 'participant';

    if (!room) {
      // If room doesn't exist, this joiner becomes the creator/host!
      isNewHost = true;
      participantRole = 'host';
      const created = this.createRoom(`${username}'s Party`, username, socketId, normalizedId, 'dQw4w9WgXcQ', customUserId);
      return { room: created.room, participant: created.host, isNewHost: true };
    }

    // If room has no active participants or host has left, could promote or keep participant
    if (room.participants.size === 0) {
      isNewHost = true;
      participantRole = 'host';
      room.hostId = '';
    }

    const userId = customUserId || ('user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const participant = new Participant(userId, socketId, username, participantRole);

    if (isNewHost) {
      room.hostId = userId;
    }

    room.addParticipant(participant);
    this.socketToRoom.set(socketId, room.id);

    // Save to DB
    this.db.saveParticipant({
      id: participant.id,
      roomId: room.id,
      username: participant.username,
      role: participant.role,
      joinedAt: participant.joinedAt,
      isActive: 1
    });

    return { room, participant, isNewHost };
  }

  public getRoom(roomId: string): Room | undefined {
    const normalizedId = roomId.toUpperCase().trim();
    let room = this.rooms.get(normalizedId);
    if (!room) {
      const dbRoom = this.db.getRoom(normalizedId);
      if (dbRoom) {
        room = new Room(
          dbRoom.id,
          dbRoom.name,
          dbRoom.host_id,
          dbRoom.current_video_id,
          dbRoom.play_state,
          dbRoom.current_time,
          dbRoom.created_at
        );
        // Load playlist from DB
        const dbPlaylist = this.db.getRoomPlaylist(normalizedId);
        if (dbPlaylist && dbPlaylist.length > 0) {
          room.queue = dbPlaylist.map(p => ({
            id: p.id,
            videoId: p.video_id,
            title: p.title,
            addedBy: p.added_by,
            createdAt: p.created_at
          }));
        }
        this.rooms.set(normalizedId, room);
      }
    }
    return room;
  }

  public getRoomBySocket(socketId: string): Room | undefined {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return undefined;
    return this.getRoom(roomId);
  }

  public removeSocket(socketId: string): { room?: Room; participant?: Participant } {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return {};

    this.socketToRoom.delete(socketId);
    const room = this.rooms.get(roomId);
    if (!room) return {};

    const participant = room.getParticipantBySocket(socketId);
    if (participant) {
      room.removeParticipant(participant.id);
      this.db.saveParticipant({
        id: participant.id,
        roomId: room.id,
        username: participant.username,
        role: participant.role,
        joinedAt: participant.joinedAt,
        isActive: 0
      });

      // If the host leaves and there are still other participants in the room,
      // auto-promote the first remaining participant or moderator to host!
      if (participant.id === room.hostId && room.participants.size > 0) {
        // Look for moderator first, else first participant
        let nextHost = Array.from(room.participants.values()).find(p => p.role === 'moderator');
        if (!nextHost) {
          nextHost = room.participants.values().next().value;
        }
        if (nextHost) {
          nextHost.updateRole('host');
          room.hostId = nextHost.id;
          this.db.updateParticipantRole(nextHost.id, 'host');
        }
      }
    }

    // Persist room updated state
    this.persistRoomState(room);

    return { room, participant };
  }

  public persistRoomState(room: Room): void {
    this.db.saveRoom({
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      currentVideoId: room.currentVideoId,
      playState: room.playState,
      currentTime: room.calculateCurrentTime(),
      createdAt: room.createdAt,
      updatedAt: Date.now()
    });
  }
}
