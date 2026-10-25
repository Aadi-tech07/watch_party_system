import { Participant } from './Participant';
import { Role, PlayState, VideoState, PlaylistItem, ControlRequest } from '../types';

export class Room {
  public readonly id: string;
  public name: string;
  public hostId: string;
  public currentVideoId: string;
  public playState: PlayState;
  public currentTime: number;
  public lastUpdatedTime: number;
  public createdAt: number;
  public participants: Map<string, Participant>; // key: userId
  public queue: PlaylistItem[];
  public pendingRequests: Map<string, ControlRequest>; // key: requestId

  constructor(
    id: string,
    name: string,
    hostId: string,
    currentVideoId: string = 'dQw4w9WgXcQ',
    playState: PlayState = 'paused',
    currentTime: number = 0,
    createdAt: number = Date.now()
  ) {
    this.id = id;
    this.name = name;
    this.hostId = hostId;
    this.currentVideoId = currentVideoId;
    this.playState = playState;
    this.currentTime = currentTime;
    this.lastUpdatedTime = Date.now();
    this.createdAt = createdAt;
    this.participants = new Map();
    this.queue = [];
    this.pendingRequests = new Map();
  }

  public addParticipant(participant: Participant): void {
    this.participants.set(participant.id, participant);
  }

  public removeParticipant(userId: string): Participant | undefined {
    const participant = this.participants.get(userId);
    if (participant) {
      this.participants.delete(userId);
    }
    return participant;
  }

  public getParticipant(userId: string): Participant | undefined {
    return this.participants.get(userId);
  }

  public getParticipantBySocket(socketId: string): Participant | undefined {
    for (const participant of this.participants.values()) {
      if (participant.socketId === socketId) {
        return participant;
      }
    }
    return undefined;
  }

  public getHost(): Participant | undefined {
    return this.participants.get(this.hostId);
  }

  public getParticipantsList() {
    return Array.from(this.participants.values()).map(p => ({
      userId: p.id,
      username: p.username,
      role: p.role,
      joinedAt: p.joinedAt
    }));
  }

  public calculateCurrentTime(): number {
    if (this.playState === 'playing') {
      const elapsedSeconds = (Date.now() - this.lastUpdatedTime) / 1000;
      return this.currentTime + Math.max(0, elapsedSeconds);
    }
    return this.currentTime;
  }

  public updatePlayback(playState: PlayState, time?: number, userId?: string): { success: boolean; error?: string } {
    if (userId) {
      const user = this.participants.get(userId);
      if (!user || !user.canControlPlayback()) {
        return { success: false, error: 'Unauthorized: Only Host or Moderator can control playback.' };
      }
    }

    if (time !== undefined && !isNaN(time)) {
      this.currentTime = Math.max(0, time);
    } else if (this.playState === 'playing') {
      this.currentTime = this.calculateCurrentTime();
    }

    this.playState = playState;
    this.lastUpdatedTime = Date.now();
    return { success: true };
  }

  public seek(time: number, userId?: string): { success: boolean; error?: string } {
    if (userId) {
      const user = this.participants.get(userId);
      if (!user || !user.canControlPlayback()) {
        return { success: false, error: 'Unauthorized: Only Host or Moderator can seek.' };
      }
    }

    this.currentTime = Math.max(0, time);
    this.lastUpdatedTime = Date.now();
    return { success: true };
  }

  public changeVideo(videoId: string, userId?: string): { success: boolean; error?: string } {
    if (userId) {
      const user = this.participants.get(userId);
      if (!user || !user.canControlPlayback()) {
        return { success: false, error: 'Unauthorized: Only Host or Moderator can change the video.' };
      }
    }

    this.currentVideoId = videoId;
    this.currentTime = 0;
    this.playState = 'playing';
    this.lastUpdatedTime = Date.now();
    return { success: true };
  }

  public assignRole(assignerId: string, targetUserId: string, newRole: Role): { success: boolean; error?: string } {
    const assigner = this.participants.get(assignerId);
    if (!assigner || !assigner.canManageRoles()) {
      return { success: false, error: 'Unauthorized: Only the Room Host can assign roles.' };
    }

    const target = this.participants.get(targetUserId);
    if (!target) {
      return { success: false, error: 'Target participant not found in this room.' };
    }

    if (target.id === this.hostId && newRole !== 'host') {
      return { success: false, error: 'Host role cannot be changed directly. Use transfer host instead.' };
    }

    target.updateRole(newRole);
    return { success: true };
  }

  public transferHost(currentHostId: string, newHostId: string): { success: boolean; error?: string } {
    if (currentHostId !== this.hostId) {
      return { success: false, error: 'Unauthorized: Only the current Host can transfer host privileges.' };
    }

    const newHost = this.participants.get(newHostId);
    if (!newHost) {
      return { success: false, error: 'Target participant not found in this room.' };
    }

    const currentHost = this.participants.get(currentHostId);
    if (currentHost) {
      currentHost.updateRole('moderator'); // Demote current host to moderator
    }

    newHost.updateRole('host');
    this.hostId = newHost.id;
    return { success: true };
  }

  public removeUser(removerId: string, targetUserId: string): { success: boolean; error?: string } {
    const remover = this.participants.get(removerId);
    if (!remover || !remover.canRemoveParticipants()) {
      return { success: false, error: 'Unauthorized: Only the Host can remove participants.' };
    }

    if (targetUserId === this.hostId) {
      return { success: false, error: 'The Host cannot be removed from the room.' };
    }

    const target = this.participants.get(targetUserId);
    if (!target) {
      return { success: false, error: 'Participant not found.' };
    }

    this.participants.delete(targetUserId);
    return { success: true };
  }

  // Playlist management
  public addToQueue(item: PlaylistItem): void {
    this.queue.push(item);
  }

  public removeFromQueue(itemId: string, userId: string): boolean {
    const user = this.participants.get(userId);
    if (!user || !user.canControlPlayback()) return false;
    this.queue = this.queue.filter(q => q.id !== itemId);
    return true;
  }

  public playNextFromQueue(userId: string): { success: boolean; nextVideo?: PlaylistItem; error?: string } {
    const user = this.participants.get(userId);
    if (!user || !user.canControlPlayback()) {
      return { success: false, error: 'Unauthorized: Only Host or Moderator can play next video.' };
    }

    if (this.queue.length === 0) {
      return { success: false, error: 'Queue is empty.' };
    }

    const nextVideo = this.queue.shift();
    if (nextVideo) {
      this.changeVideo(nextVideo.videoId, userId);
      return { success: true, nextVideo };
    }

    return { success: false, error: 'Could not fetch next video.' };
  }

  // Permission Request
  public createControlRequest(userId: string, username: string, reason?: string): ControlRequest {
    const req: ControlRequest = {
      id: 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId,
      username,
      requestedAt: Date.now(),
      reason
    };
    this.pendingRequests.set(req.id, req);
    return req;
  }

  public resolveControlRequest(requestId: string): ControlRequest | undefined {
    const req = this.pendingRequests.get(requestId);
    if (req) {
      this.pendingRequests.delete(requestId);
    }
    return req;
  }

  public toStatePayload(): VideoState & { roomName: string; hostId: string; queue: PlaylistItem[] } {
    return {
      videoId: this.currentVideoId,
      playState: this.playState,
      currentTime: this.calculateCurrentTime(),
      lastUpdated: this.lastUpdatedTime,
      roomName: this.name,
      hostId: this.hostId,
      queue: this.queue
    };
  }
}
