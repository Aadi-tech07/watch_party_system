import React, { useState } from 'react';
import { ParticipantInfo, Role } from '../types';
import { Crown, Shield, User, MoreVertical, UserMinus, ShieldAlert, Award, Sparkles } from 'lucide-react';

interface ParticipantsListProps {
  participants: ParticipantInfo[];
  currentUserId: string;
  isHost: boolean;
  onAssignRole: (userId: string, role: Role) => void;
  onRemoveParticipant: (userId: string) => void;
  onTransferHost: (userId: string) => void;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  currentUserId,
  isHost,
  onAssignRole,
  onRemoveParticipant,
  onTransferHost
}) => {
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'host':
        return (
          <span className="role-tag role-tag-host">
            <Crown className="w-3 h-3 mr-1 text-amber-400" /> Host
          </span>
        );
      case 'moderator':
        return (
          <span className="role-tag role-tag-mod">
            <Shield className="w-3 h-3 mr-1 text-cyan-400" /> Moderator
          </span>
        );
      default:
        return (
          <span className="role-tag role-tag-participant">
            <User className="w-3 h-3 mr-1 text-slate-400" /> Participant
          </span>
        );
    }
  };

  return (
    <div className="participants-container">
      <div className="participants-header">
        <span className="section-title">In the Room</span>
        <span className="count-badge">{participants.length}</span>
      </div>

      <div className="participants-list">
        {participants.map((p) => {
          const isMe = p.userId === currentUserId;
          const isTargetHost = p.role === 'host';
          const isMenuOpen = activeMenuUserId === p.userId;

          return (
            <div key={p.userId} className={`participant-card ${isMe ? 'participant-me' : ''}`}>
              <div className="participant-info">
                <div className="avatar-circle">
                  {p.username.charAt(0).toUpperCase()}
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
                    title="Manage participant"
                  >
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>

                  {isMenuOpen && (
                    <div className="actions-dropdown animate-fade-in">
                      {p.role === 'participant' ? (
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            onAssignRole(p.userId, 'moderator');
                            setActiveMenuUserId(null);
                          }}
                        >
                          <Shield className="w-3.5 h-3.5 text-cyan-400 mr-2" /> Make Moderator
                        </button>
                      ) : (
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            onAssignRole(p.userId, 'participant');
                            setActiveMenuUserId(null);
                          }}
                        >
                          <User className="w-3.5 h-3.5 text-slate-400 mr-2" /> Demote to Participant
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
                        <UserMinus className="w-3.5 h-3.5 mr-2" /> Remove from Room
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
