export type Role = 'host' | 'moderator' | 'participant' | 'viewer';
export type PlayState = 'playing' | 'paused';

export interface ParticipantData {
  id: string;
  socketId: string;
  username: string;
  role: Role;
  joinedAt: number;
}

export interface VideoState {
  videoId: string;
  playState: PlayState;
  currentTime: number;
  lastUpdated: number;
}

export interface PlaylistItem {
  id: string;
  videoId: string;
  title: string;
  addedBy: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  role: Role;
  text: string;
  timestamp: number;
}

export interface ControlRequest {
  id: string;
  userId: string;
  username: string;
  requestedAt: number;
  reason?: string;
}
