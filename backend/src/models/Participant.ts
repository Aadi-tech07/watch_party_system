import { Role, ParticipantData } from '../types';

export class Participant {
  public readonly id: string;
  public socketId: string;
  public username: string;
  public role: Role;
  public readonly joinedAt: number;

  constructor(id: string, socketId: string, username: string, role: Role = 'participant') {
    this.id = id;
    this.socketId = socketId;
    this.username = username;
    this.role = role;
    this.joinedAt = Date.now();
  }

  public isHost(): boolean {
    return this.role === 'host';
  }

  public isModerator(): boolean {
    return this.role === 'moderator';
  }

  public canControlPlayback(): boolean {
    return this.role === 'host' || this.role === 'moderator';
  }

  public canManageRoles(): boolean {
    return this.role === 'host';
  }

  public canRemoveParticipants(): boolean {
    return this.role === 'host';
  }

  public canTransferHost(): boolean {
    return this.role === 'host';
  }

  public canChat(): boolean {
    return this.role !== 'viewer';
  }

  public updateRole(newRole: Role): void {
    this.role = newRole;
  }

  public toJSON(): ParticipantData {
    return {
      id: this.id,
      socketId: this.socketId,
      username: this.username,
      role: this.role,
      joinedAt: this.joinedAt
    };
  }
}
