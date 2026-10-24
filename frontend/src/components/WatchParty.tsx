import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { YouTubePlayer } from './YouTubePlayer';
import { ParticipantsList } from './ParticipantsList';
import { LiveChat } from './LiveChat';
import { VideoQueue } from './VideoQueue';
import { FloatingReactions } from './FloatingReactions';
import { extractYouTubeId } from '../utils/youtube';
import {
  ParticipantInfo,
  Role,
  VideoState,
  ChatMessage,
  PlaylistItem,
  ReactionItem,
  ControlRequest
} from '../types';
import {
  Crown,
  Shield,
  User,
  Copy,
  Check,
  LogOut,
  Users,
  MessageSquare,
  ListMusic,
  Share2,
  Sparkles,
  AlertCircle,
  X
} from 'lucide-react';

interface WatchPartyProps {
  socket: Socket;
  roomId: string;
  username: string;
  onLeaveRoom: () => void;
}

export const WatchParty: React.FC<WatchPartyProps> = ({
  socket,
  roomId,
  username,
  onLeaveRoom
}) => {
  // Room & Video State
  const [videoState, setVideoState] = useState<VideoState>({
    videoId: 'dQw4w9WgXcQ',
    playState: 'paused',
    currentTime: 0,
    lastUpdated: Date.now(),
    roomName: 'Watch Party',
    hostId: ''
  });

  // User & Participants State
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [myRole, setMyRole] = useState<Role>('participant');
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);

  // Chat & Queue State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [queue, setQueue] = useState<PlaylistItem[]>([]);
  const [latestReaction, setLatestReaction] = useState<ReactionItem | null>(null);

  // Active Sidebar Tab
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'participants' | 'queue'>('chat');

  // New Video Input (for Host/Mod)
  const [newVideoInput, setNewVideoInput] = useState('');
  const [showVideoInputModal, setShowVideoInputModal] = useState(false);

  // Copy Feedback
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Permission / Control Requests
  const [pendingControlRequest, setPendingControlRequest] = useState<ControlRequest | null>(null);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const isHost = myRole === 'host';
  const canControl = myRole === 'host' || myRole === 'moderator';

  // Setup WebSocket Event Listeners
  useEffect(() => {
    // 1. Initial State Sync
    socket.on('sync_state', (data: VideoState) => {
      setVideoState((prev) => ({
        ...prev,
        ...data,
        queue: data.queue || prev.queue
      }));
      if (data.myUserId) setCurrentUserId(data.myUserId);
      if (data.myRole) setMyRole(data.myRole);
      if (data.queue) setQueue(data.queue);
    });

    // 2. User Joined
    socket.on('user_joined', (data: { username: string; userId: string; role: Role; participants: ParticipantInfo[] }) => {
      setParticipants(data.participants);
    });

    // 3. User Left
    socket.on('user_left', (data: { username: string; userId: string; participants: ParticipantInfo[]; newHostId?: string }) => {
      setParticipants(data.participants);
      if (data.newHostId && data.newHostId === currentUserId) {
        setMyRole('host');
        showToast('👑 You are now the Room Host!');
      }
    });

    // 4. Role Assigned / Updated
    socket.on('role_assigned', (data: { userId: string; username: string; role: Role; participants: ParticipantInfo[]; newHostId?: string }) => {
      setParticipants(data.participants);
      if (data.userId === currentUserId) {
        setMyRole(data.role);
        showToast(`Role updated: You are now a ${data.role.toUpperCase()}`);
      }
    });

    // 5. Participant Removed (Self or Others)
    socket.on('participant_removed', (data: { userId: string; username: string; participants: ParticipantInfo[] }) => {
      setParticipants(data.participants);
    });

    socket.on('participant_removed_self', (data: { message: string }) => {
      alert(data.message || 'You have been removed from the room.');
      onLeaveRoom();
    });

    // 6. Chat Messages & History
    socket.on('chat_history', (data: { messages: ChatMessage[] }) => {
      setMessages(data.messages);
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    // 7. Reactions
    socket.on('reaction', (rx: ReactionItem) => {
      setLatestReaction(rx);
    });

    // 8. Queue Updates
    socket.on('queue_updated', (data: { queue: PlaylistItem[] }) => {
      setQueue(data.queue);
    });

    // 9. Permission Request received by Host/Mod
    socket.on('control_requested', (req: ControlRequest) => {
      setPendingControlRequest(req);
    });

    socket.on('request_submitted', (data: { message: string }) => {
      showToast(data.message);
    });

    socket.on('request_denied', (data: { message: string }) => {
      showToast(data.message);
    });

    // 10. General Errors
    socket.on('error_message', (data: { message: string }) => {
      showToast(`⚠️ ${data.message}`);
    });

    return () => {
      socket.off('sync_state');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('role_assigned');
      socket.off('participant_removed');
      socket.off('participant_removed_self');
      socket.off('chat_history');
      socket.off('chat_message');
      socket.off('reaction');
      socket.off('queue_updated');
      socket.off('control_requested');
      socket.off('request_submitted');
      socket.off('request_denied');
      socket.off('error_message');
    };
  }, [socket, currentUserId]);

  const showToast = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => {
      setStatusNotification(null);
    }, 4000);
  };

  // Playback Action Emitters
  const handlePlay = (time: number) => {
    socket.emit('play', { currentTime: time });
  };

  const handlePause = (time: number) => {
    socket.emit('pause', { currentTime: time });
  };

  const handleSeek = (time: number) => {
    socket.emit('seek', { time });
  };

  const handleChangeVideo = (vid: string) => {
    socket.emit('change_video', { videoId: vid });
    setShowVideoInputModal(false);
    setNewVideoInput('');
  };

  const handleAssignRole = (userId: string, role: Role) => {
    socket.emit('assign_role', { userId, role });
  };

  const handleRemoveParticipant = (userId: string) => {
    socket.emit('remove_participant', { userId });
  };

  const handleTransferHost = (userId: string) => {
    socket.emit('transfer_host', { newHostId: userId });
  };

  const handleSendMessage = (text: string) => {
    socket.emit('send_message', { text });
  };

  const handleSendReaction = (emoji: string) => {
    socket.emit('send_reaction', { emoji });
  };

  const handleAddToQueue = (videoId: string, title?: string) => {
    socket.emit('add_to_queue', { videoId, title });
  };

  const handlePlayNext = () => {
    socket.emit('play_next');
  };

  const handleRequestControl = () => {
    socket.emit('request_control', { reason: 'Requested playback permission' });
  };

  const handleRespondRequest = (approved: boolean) => {
    if (!pendingControlRequest) return;
    socket.emit('respond_request', {
      requestId: pendingControlRequest.id,
      approved,
      newRole: 'moderator'
    });
    setPendingControlRequest(null);
  };

  // Copy Invite Helpers
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="party-layout">
      {/* Reaction Canvas / Floating overlay */}
      <FloatingReactions latestReaction={latestReaction} />

      {/* Top Application Bar */}
      <header className="party-topbar glass-panel">
        <div className="topbar-left">
          <div className="room-title-group">
            <h1 className="party-name">{videoState.roomName || 'Watch Party'}</h1>
            <div className="room-code-badge" onClick={copyRoomCode} title="Click to copy room code">
              <span className="code-label">CODE:</span>
              <span className="code-value">{roomId}</span>
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400 ml-1" /> : <Copy className="w-3.5 h-3.5 text-slate-400 ml-1" />}
            </div>
          </div>

          <button className="btn-invite" onClick={copyInviteLink}>
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
          </button>
        </div>

        <div className="topbar-right">
          {/* User's Role Status */}
          <div className={`user-role-badge badge-${myRole}`}>
            {myRole === 'host' && <Crown className="w-3.5 h-3.5 text-amber-400 mr-1.5" />}
            {myRole === 'moderator' && <Shield className="w-3.5 h-3.5 text-cyan-400 mr-1.5" />}
            {myRole === 'participant' && <User className="w-3.5 h-3.5 text-slate-400 mr-1.5" />}
            <span className="role-text">{myRole.toUpperCase()}</span>
          </div>

          {/* Request Control button if participant */}
          {!canControl && (
            <button className="btn-request-control" onClick={handleRequestControl}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Request Control
            </button>
          )}

          {/* Leave Room Button */}
          <button className="btn-leave" onClick={onLeaveRoom} title="Leave Watch Party">
            <LogOut className="w-4 h-4 mr-1.5" /> Leave
          </button>
        </div>
      </header>

      {/* Main Party Stage */}
      <div className="party-stage">
        {/* Left: Video Player Section */}
        <main className="stage-player-section">
          {/* Change Video bar for Host & Moderators */}
          {canControl && (
            <div className="video-controller-strip glass-panel">
              <div className="current-playing-info">
                <span className="info-badge">NOW STREAMING</span>
                <span className="current-id">Video ID: {videoState.videoId}</span>
              </div>
              <div className="strip-actions">
                <button
                  className="btn-strip-change"
                  onClick={() => setShowVideoInputModal(true)}
                >
                  Change Video
                </button>
              </div>
            </div>
          )}

          {/* YouTube Player with Sync & Custom Controls */}
          <div className="player-stage-card glass-panel">
            <YouTubePlayer
              videoId={videoState.videoId}
              playState={videoState.playState}
              currentTime={videoState.currentTime}
              userRole={myRole}
              canControl={canControl}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              onRequestControl={handleRequestControl}
            />
          </div>

          {/* Pending Permission Request Toast Banner (Visible to Host/Moderator) */}
          {pendingControlRequest && canControl && (
            <div className="permission-request-banner animate-fade-in glass-panel">
              <div className="banner-info">
                <AlertCircle className="w-5 h-5 text-amber-400 mr-2" />
                <div>
                  <strong>{pendingControlRequest.username}</strong> requested playback controls permission.
                </div>
              </div>
              <div className="banner-actions">
                <button
                  className="btn-approve"
                  onClick={() => handleRespondRequest(true)}
                >
                  Approve as Moderator
                </button>
                <button
                  className="btn-decline"
                  onClick={() => handleRespondRequest(false)}
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Toast Notification message */}
          {statusNotification && (
            <div className="floating-toast animate-fade-in">
              <span>{statusNotification}</span>
              <button onClick={() => setStatusNotification(null)}>
                <X className="w-3.5 h-3.5 ml-2" />
              </button>
            </div>
          )}
        </main>

        {/* Right: Sidebar with Chat, Participants, and Playlist Queue */}
        <aside className="stage-sidebar glass-panel">
          {/* Sidebar Navigation Tabs */}
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab-btn ${activeSidebarTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('chat')}
            >
              <MessageSquare className="w-4 h-4 mr-1.5" />
              <span>Chat</span>
            </button>
            <button
              className={`sidebar-tab-btn ${activeSidebarTab === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('participants')}
            >
              <Users className="w-4 h-4 mr-1.5" />
              <span>Users ({participants.length})</span>
            </button>
            <button
              className={`sidebar-tab-btn ${activeSidebarTab === 'queue' ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('queue')}
            >
              <ListMusic className="w-4 h-4 mr-1.5" />
              <span>Queue ({queue.length})</span>
            </button>
          </div>

          {/* Sidebar Tab Content */}
          <div className="sidebar-content">
            {activeSidebarTab === 'chat' && (
              <LiveChat
                messages={messages}
                currentUserId={currentUserId}
                onSendMessage={handleSendMessage}
                onSendReaction={handleSendReaction}
              />
            )}

            {activeSidebarTab === 'participants' && (
              <ParticipantsList
                participants={participants}
                currentUserId={currentUserId}
                isHost={isHost}
                onAssignRole={handleAssignRole}
                onRemoveParticipant={handleRemoveParticipant}
                onTransferHost={handleTransferHost}
              />
            )}

            {activeSidebarTab === 'queue' && (
              <VideoQueue
                queue={queue}
                currentVideoId={videoState.videoId}
                canControl={canControl}
                onAddToQueue={handleAddToQueue}
                onPlayNext={handlePlayNext}
                onSelectVideo={handleChangeVideo}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Modal: Change Video for Host & Moderator */}
      {showVideoInputModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowVideoInputModal(false)}>
          <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Change Current Video</h3>
              <button className="modal-close" onClick={() => setShowVideoInputModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const id = extractYouTubeId(newVideoInput);
                if (id) {
                  handleChangeVideo(id);
                } else {
                  alert('Invalid YouTube URL or Video ID');
                }
              }}
              className="modal-form"
            >
              <div className="form-group">
                <label className="form-label">Enter YouTube URL or Video ID</label>
                <input
                  type="text"
                  required
                  placeholder="https://www.youtube.com/watch?v=... or 11-char ID"
                  value={newVideoInput}
                  onChange={(e) => setNewVideoInput(e.target.value)}
                  className="input-text"
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowVideoInputModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newVideoInput.trim()}
                  className="btn-modal-confirm"
                >
                  Switch Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
