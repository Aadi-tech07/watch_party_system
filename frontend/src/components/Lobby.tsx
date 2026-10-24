import React, { useState, useEffect } from 'react';
import { Play, Users, Shield, Sparkles, Tv, ArrowRight, Radio, Film, Music, CheckCircle2 } from 'lucide-react';
import { extractYouTubeId } from '../utils/youtube';

interface LobbyProps {
  onJoinRoom: (roomId: string, username: string, isCreate?: boolean, initialVideo?: string) => void;
  initialRoomCode?: string;
}

const PRESET_VIDEOS = [
  { title: 'Lofi Hip Hop Radio', id: 'jfKfPfyJRdk', tag: 'Chill' },
  { title: 'Blender - Big Buck Bunny', id: 'aqz-KE-bpKQ', tag: 'Animation' },
  { title: 'Synthwave Radio Beats', id: '4xDzrJKXOOY', tag: 'Music' },
  { title: '4K Nature Relaxing Drone', id: 'LXb3EKWsInQ', tag: 'Nature' }
];

export const Lobby: React.FC<LobbyProps> = ({ onJoinRoom, initialRoomCode }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');

  // Create Room state
  const [hostName, setHostName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [videoInput, setVideoInput] = useState(PRESET_VIDEOS[0].id);

  // Join Room state
  const [joinRoomCode, setJoinRoomCode] = useState(initialRoomCode || '');
  const [joinUsername, setJoinUsername] = useState('');

  // Active rooms from backend API
  const [recentRooms, setRecentRooms] = useState<any[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setIsLoadingRooms(true);
        const res = await fetch('/api/rooms');
        if (res.ok) {
          const data = await res.json();
          setRecentRooms(data.rooms || []);
        }
      } catch (err) {
        // Backend might be warming up or different origin
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchRooms();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;
    const cleanVideoId = extractYouTubeId(videoInput) || PRESET_VIDEOS[0].id;
    // Auto generate clean room code
    const generatedCode = 'PARTY-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    onJoinRoom(generatedCode, hostName.trim(), true, cleanVideoId);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomCode.trim() || !joinUsername.trim()) return;
    onJoinRoom(joinRoomCode.trim().toUpperCase(), joinUsername.trim(), false);
  };

  return (
    <div className="lobby-container">
      {/* Background glowing ambient light effects */}
      <div className="ambient-glow glow-top" />
      <div className="ambient-glow glow-bottom" />

      {/* Hero Header */}
      <header className="lobby-header">
        <div className="brand-badge animate-fade-in">
          <Radio className="w-4 h-4 text-red-500 animate-pulse mr-2" />
          <span>REAL-TIME WATCH PARTY SYSTEM</span>
        </div>
        <h1 className="hero-title">
          Watch YouTube in <span className="gradient-text">Perfect Sync</span> With Anyone.
        </h1>
        <p className="hero-subtitle">
          Synchronized playback, host role-based access control, live chat, instant reactions, and playlist queue.
        </p>
      </header>

      {/* Main Lobby Card */}
      <div className="lobby-card glass-panel">
        {/* Navigation Tabs */}
        <div className="tab-switcher">
          <button
            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <Sparkles className="w-4 h-4 mr-2" /> Create Room
          </button>
          <button
            className={`tab-btn ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            <Users className="w-4 h-4 mr-2" /> Join With Code
          </button>
        </div>

        {/* Tab 1: Create Room */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreate} className="lobby-form animate-fade-in">
            <div className="form-group">
              <label className="form-label">Your Nickname (Host)</label>
              <input
                type="text"
                required
                maxLength={20}
                placeholder="e.g. Alex"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="input-text"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Party Title (Optional)</label>
              <input
                type="text"
                maxLength={35}
                placeholder="e.g. Friday Movie Night"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="input-text"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial YouTube Video URL or ID</label>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... or Video ID"
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
                className="input-text"
              />

              {/* Preset quick picks */}
              <div className="preset-container">
                <span className="preset-label">Quick Picks:</span>
                <div className="preset-chips">
                  {PRESET_VIDEOS.map((vid) => (
                    <button
                      key={vid.id}
                      type="button"
                      onClick={() => setVideoInput(vid.id)}
                      className={`preset-chip ${videoInput === vid.id ? 'preset-active' : ''}`}
                    >
                      {vid.tag}: {vid.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" disabled={!hostName.trim()} className="btn-primary-action">
              <span>Create Watch Party</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </form>
        )}

        {/* Tab 2: Join Room */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoin} className="lobby-form animate-fade-in">
            <div className="form-group">
              <label className="form-label">Room Code</label>
              <input
                type="text"
                required
                maxLength={15}
                placeholder="e.g. PARTY-9821"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                className="input-text uppercase-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Your Nickname</label>
              <input
                type="text"
                required
                maxLength={20}
                placeholder="e.g. Sam"
                value={joinUsername}
                onChange={(e) => setJoinUsername(e.target.value)}
                className="input-text"
              />
            </div>

            <button
              type="submit"
              disabled={!joinRoomCode.trim() || !joinUsername.trim()}
              className="btn-primary-action"
            >
              <span>Join Watch Party</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </form>
        )}
      </div>

      {/* Recent / Public Rooms from SQLite */}
      {recentRooms.length > 0 && (
        <section className="recent-rooms-section">
          <h2 className="recent-title">Active / Persisted Rooms in SQLite</h2>
          <div className="rooms-grid">
            {recentRooms.slice(0, 4).map((r) => (
              <div
                key={r.id}
                className="room-card glass-panel"
                onClick={() => {
                  setJoinRoomCode(r.id);
                  setActiveTab('join');
                }}
              >
                <div className="room-card-header">
                  <span className="room-id-tag">{r.id}</span>
                  <span className="room-state-tag">{r.play_state}</span>
                </div>
                <h3 className="room-card-name">{r.name}</h3>
                <div className="room-card-footer">
                  <span>Video: {r.current_video_id}</span>
                  <span className="room-join-hint">Click to join →</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feature Highlights Grid */}
      <section className="features-grid">
        <div className="feature-item glass-panel">
          <div className="feature-icon bg-red-500/10 text-red-400">
            <Play className="w-6 h-6 fill-current" />
          </div>
          <h3 className="feature-title">Real-Time Sync</h3>
          <p className="feature-desc">
            Sub-second synchronization using WebSockets. When the host plays, pauses, or seeks, all participants follow automatically.
          </p>
        </div>

        <div className="feature-item glass-panel">
          <div className="feature-icon bg-cyan-500/10 text-cyan-400">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="feature-title">Role-Based Access</h3>
          <p className="feature-desc">
            Host has full control over playback and participants. Promote members to Moderator, transfer host, or kick unruly viewers.
          </p>
        </div>

        <div className="feature-item glass-panel">
          <div className="feature-icon bg-purple-500/10 text-purple-400">
            <Tv className="w-6 h-6" />
          </div>
          <h3 className="feature-title">Persistent Rooms & Queue</h3>
          <p className="feature-desc">
            Room state, chat history, and upcoming playlist queues are automatically saved to SQLite for resilience and continuity.
          </p>
        </div>
      </section>
    </div>
  );
};
