export type Role = 'host' | 'moderator' | 'participant' | 'viewer';
export type PlayState = 'playing' | 'paused';

export interface AuthUser {
    id: string;
    username: string;
    avatarColor?: string;
    createdAt?: number;
}

export interface ParticipantInfo {
    userId: string;
    username: string;
    role: Role;
    joinedAt: number;
}

export interface VideoState {
    videoId: string;
    playState: PlayState;
    currentTime: number;
    lastUpdated: number;
    roomName: string;
    hostId: string;
    queue?: PlaylistItem[];
    myUserId?: string;
    myRole?: Role;
}

export interface PlaylistItem {
    id: string;
    roomId?: string;
    videoId: string;
    title: string;
    addedBy: string;
    createdAt: number;
}

export interface ChatMessage {
    id: string;
    roomId?: string;
    userId: string;
    username: string;
    role: Role | 'system';
    text: string;
    timestamp: number;
}

export interface ReactionItem {
    id: string;
    emoji: string;
    username: string;
    timestamp: number;
}

export interface ControlRequest {
    id: string;
    userId: string;
    username: string;
    requestedAt: number;
    reason?: string;
}
