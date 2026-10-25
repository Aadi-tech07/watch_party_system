import React, { useState } from 'react';
import { ParticipantInfo, Role } from '../types';
import { Crown, Shield, User, MoreVertical, UserMinus, Eye, Radio, Sparkles } from 'lucide-react';

interface ParticipantsListProps {
  participants: ParticipantInfo[];
  currentUserId: string;
  isHost: boolean;
  onAssignRole: (userId: string, role: Role) => void;
  onRemoveParticipant: (userId: string) => void;
  onTransferHost: (userId: string) => void;
}

const getAvatarGradient = (name: string) => {
  const gradients = [
    'linear-gradient(135deg, #8b5cf6, #3b82f6)',
    'linear-gradient(135deg, #ec4899, #8b5cf6)',
    'linear-gradient(135deg, #06b6d4, #10b981)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #6366f1, #a855f7)',
    'linear-gradient(135deg, #14b8a6, #06b6d4)'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  currentUserId,
  isHost,
  onAssignRole,
  onRemoveParticipant,
  onTransferHost
}) => {
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  const partyMembers = participants.filter((p) => p.role !== 'viewer');
  const streamViewers = participants.filter((p) => p.role === 'viewer');

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'host':
        return (
          <span className="role-tag role-tag-host">
            <Crown className="w-3 h-3 mr-1 text-amber-300" /> Host
          </span>
        );
      case 'moderator':
        return (
          <span className="role-tag role-tag-mod">
            <Shield className="w-3 h-3 mr-1 text-cyan-300" /> Moderator
          </span>
        );
      case 'participant':
        return (
          <span className="role-tag role-tag-participant">
            <User className="w-3 h-3 mr-1 text-purple-300" /> Member
          </span>
        );
      case 'viewer':
      default:
        return (
          <span className="role-tag" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8' }}>
            <Eye className="w-3 h-3 mr-1 text-cyan-400" /> Viewer
          </span>
        );
    }
  };

  const renderUserCard = (p: ParticipantInfo) => {
    const isMe = p.userId === currentUserId;
    const isTargetHost = p.role === 'host';
    const isMenuOpen = activeMenuUserId === p.userId;

    return (
      <div key={p.userId} className={`participant-card ${isMe ? 'participant-me' : ''}`}>
        <div className="participant-info">
          <div className="avatar-wrapper">
            <div
              className="avatar-circle"
              style={{ background: getAvatarGradient(p.username) }}
            >
              {p.username.charAt(0).toUpperCase()}
            </div>
            <span className="online-indicator-dot" />
          </div>

          <div className="participant-details">
            <div className="name-row">
              <span className="participant-name">{p.username}</span>
              {isMe && <span className="me-badge">You</span>}
            </div>
            <div className="role-row">{getRoleBadge(p.role)}</div>
          </div>
        </div>

        {/* Host actions menu */}
        {isHost && !isMe && !isTargetHost && (
          <div className="participant-actions">
            <button
              className="btn-action-trigger"
              onClick={() => setActiveMenuUserId(isMenuOpen ? null : p.userId)}
              title="Manage privileges"
            >
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>

            {isMenuOpen && (
              <div className="actions-dropdown animate-fade-in">
                {p.role !== 'moderator' ? (
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      onAssignRole(p.userId, 'moderator');
                      setActiveMenuUserId(null);
                    }}
                  >
                    <Shield className="w-3.5 h-3.5 text-cyan-400 mr-2" /> Promote to Moderator
                  </button>
                ) : (
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      onAssignRole(p.userId, 'participant');
                      setActiveMenuUserId(null);
                    }}
                  >
                    <User className="w-3.5 h-3.5 text-slate-400 mr-2" /> Demote to Member
                  </button>
                )}

                <button
                  className="dropdown-item text-amber-400"
                  onClick={() => {
                    if (confirm(`Transfer full Room Host privileges to ${p.username}?`)) {
                      onTransferHost(p.userId);
                      setActiveMenuUserId(null);
                    }
                  }}
                >
                  <Crown className="w-3.5 h-3.5 mr-2" /> Transfer Host
                </button>

                <div className="dropdown-divider" />

                <button
                  className="dropdown-item text-red-400"
                  onClick={() => {
                    if (confirm(`Remove ${p.username} from the watch party?`)) {
                      onRemoveParticipant(p.userId);
                      setActiveMenuUserId(null);
                    }
                  }}
                >
                  <UserMinus className="w-3.5 h-3.5 mr-2" /> Kick from Room
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="participants-container">
      {/* Column 1: Party Participants (Joined with code, full chat) */}
      <div className="participants-column-group">
        <div className="participants-header">
          <div className="flex items-center gap-2">
            <span className="section-title">Party Members</span>
            <span className="count-badge count-badge-party">{partyMembers.length}</span>
          </div>
          <span className="text-xs text-amber-300 font-medium">Chat & Audio Sync</span>
        </div>

        <div className="participants-list">
          {partyMembers.map((p) => renderUserCard(p))}
        </div>
      </div>

      {/* Column 2: Stream Viewers (Watching stream without chat passcode) */}
      <div className="participants-column-group mt-4">
        <div className="participants-header">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span className="section-title">Stream Viewers</span>
            <span className="count-badge count-badge-viewers">{streamViewers.length}</span>
          </div>
          <span className="text-xs text-cyan-400 font-medium">Watching Live</span>
        </div>

        <div className="participants-list">
          {streamViewers.length === 0 ? (
            <div className="viewers-empty-hint">
              <span>No external stream viewers currently.</span>
            </div>
          ) : (
            streamViewers.map((p) => renderUserCard(p))
          )}
        </div>
      </div>
    </div>
  );
};
