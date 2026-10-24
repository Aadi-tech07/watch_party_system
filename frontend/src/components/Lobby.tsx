import React, { useState, useEffect } from 'react';
import {
    Play,
    Users,
    Shield,
    Sparkles,
    Tv,
    ArrowRight,
    Radio,
    Film,
    Music,
    CheckCircle2,
    Database,
    Shuffle,
    Eye,
    Info,
    Clock,
    ExternalLink,
    Lock,
    LogIn,
    UserCheck
} from 'lucide-react';
import { extractYouTubeId } from '../utils/youtube';
import { StorageModal } from './StorageModal';
import { AuthUser } from '../types';

interface LobbyProps {
    onJoinRoom: (roomId: string, username: string, isCreate?: boolean, initialVideo?: string) => void;
    initialRoomCode?: string;
    currentUser: AuthUser | null;
    onOpenAuth: () => void;
    onLogout: () => void;
}

const PRESET_VIDEOS = [
    {
        title: 'Lofi Hip Hop Radio — Beats to Relax/Study to',
        id: 'jfKfPfyJRdk',
        tag: 'Lofi',
        channel: 'Lofi Girl'
    },
    {
        title: 'Blender Open Movie — Big Buck Bunny 4K 60FPS',
        id: 'aqz-KE-bpKQ',
        tag: 'Animation',
        channel: 'Blender Foundation'
    },
    {
        title: 'Synthwave Radio — Chill Beats & Retrowave',
        id: '4xDzrJKXOOY',
        tag: 'Synthwave',
        channel: 'Lofi Girl'
    },
    {
        title: 'Relaxing 4K Nature & Ocean Drone Tour',
        id: 'LXb3EKWsInQ',
        tag: 'Nature',
        channel: 'Relaxation Channel'
    }
];

export const Lobby: React.FC<LobbyProps> = ({
    onJoinRoom,
    initialRoomCode,
    currentUser,
    onOpenAuth,
    onLogout
}) => {
    const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');

    // Create Room state
    const [hostName, setHostName] = useState(currentUser?.username || '');
    const [roomName, setRoomName] = useState('');
    const [videoInput, setVideoInput] = useState(PRESET_VIDEOS[0].id);
    const [generatedCode, setGeneratedCode] = useState(() => 'PARTY-' + Math.random().toString(36).substring(2, 6).toUpperCase());

    // Join Room state
    const [joinRoomCode, setJoinRoomCode] = useState(initialRoomCode || '');
    const [joinUsername, setJoinUsername] = useState(currentUser?.username || '');

    // Active rooms from backend API
    const [recentRooms, setRecentRooms] = useState<any[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);

    // Storage Modal state
    const [showStorageModal, setShowStorageModal] = useState(false);

    const currentPreviewId = extractYouTubeId(videoInput) || PRESET_VIDEOS[0].id;

    // Sync username if currentUser changes
    useEffect(() => {
        if (currentUser) {
            setHostName(currentUser.username);
            setJoinUsername(currentUser.username);
        }
    }, [currentUser]);

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
                // Backend might be warming up
            } finally {
                setIsLoadingRooms(false);
            }
        };

        fetchRooms();
    }, []);

    const randomizeCode = () => {
        setGeneratedCode('PARTY-' + Math.random().toString(36).substring(2, 6).toUpperCase());
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            onOpenAuth();
            return;
        }
        const cleanVideoId = extractYouTubeId(videoInput) || PRESET_VIDEOS[0].id;
        onJoinRoom(generatedCode, currentUser.username, true, cleanVideoId);
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            onOpenAuth();
            return;
        }
        if (!joinRoomCode.trim()) return;
        onJoinRoom(joinRoomCode.trim().toUpperCase(), currentUser.username, false);
    };

    return (
        <div className="lobby-container">
            {/* Background ambient glow effect */}
            <div className="ambient-glow glow-top" />
            <div className="ambient-glow glow-bottom" />
            <div className="ambient-grid-overlay" />

            {/* Storage Architecture Modal */}
            <StorageModal
                isOpen={showStorageModal}
                onClose={() => setShowStorageModal(false)}
            />

            {/* Top Banner / System Status Pill Row */}
            <div className="system-status-ribbon animate-fade-in">
                {/* User Authentication Status Pill */}
                {currentUser ? (
                    <div className="status-pill status-pill-active" style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.4)' }}>
                        <div
                            style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                backgroundColor: currentUser.avatarColor || '#6366f1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: '#ffffff',
                                marginRight: '6px'
                            }}
                        >
                            {currentUser.username.substring(0, 1).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{currentUser.username}</span>
                        <button
                            onClick={onLogout}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#f87171',
                                cursor: 'pointer',
                                fontSize: '11px',
                                marginLeft: '8px',
                                padding: '2px 4px',
                                borderRadius: '4px'
                            }}
                            title="Sign Out of account"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <button
                        className="status-pill status-pill-storage"
                        onClick={onOpenAuth}
                        style={{ cursor: 'pointer', borderColor: 'rgba(99, 102, 241, 0.5)', background: 'rgba(99, 102, 241, 0.15)' }}
                        title="Click to sign in or register"
                    >
                        <Lock className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
                        <span style={{ color: '#a5b4fc', fontWeight: 600 }}>Sign In / Register</span>
                    </button>
                )}

                <div className="status-pill status-pill-active">
                    <span className="pulse-indicator" />
                    <span>Real-Time Sync</span>
                </div>

                <button
                    className="status-pill status-pill-storage"
                    onClick={() => setShowStorageModal(true)}
                    title="Click to view SQLite storage details"
                >
                    <Database className="w-3.5 h-3.5 text-purple-400 mr-1.5" />
                    <span>SQLite Storage</span>
                    <span className="storage-chip">watchparty.sqlite</span>
                </button>

                <div className="status-pill status-pill-rbac">
                    <Shield className="w-3.5 h-3.5 text-cyan-400 mr-1.5" />
                    <span>Host RBAC</span>
                </div>
            </div>

            {/* Hero Header */}
            <header className="lobby-header">
                <div className="brand-badge animate-fade-in">
                    <Radio className="w-4 h-4 text-red-500 animate-pulse mr-2" />
                    <span>CINEMATIC SYNCHRONIZED STREAMING</span>
                </div>
                <h1 className="hero-title">
                    Watch YouTube in <span className="gradient-text">Perfect Sync</span> With Anyone.
                </h1>
                <p className="hero-subtitle">
                    Sub-second playback synchronization, host role-based access control, live interactive chat, floating reactions, and persistent playlist queue.
                </p>
            </header>

            {/* Main Lobby Glass Card */}
            <div className="lobby-card glass-panel">
                {/* Navigation Tabs with sliding pill indicator */}
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
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">
                                    Your Nickname <span className="text-amber-400 text-xs font-normal">(You will be Host 👑)</span>
                                </label>
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
                                    placeholder="e.g. Weekend Anime & Chill"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    className="input-text"
                                />
                            </div>
                        </div>

                        {/* Generated Room Code preview */}
                        <div className="form-group">
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="form-label mb-0">Assigned Room Code</label>
                                <button
                                    type="button"
                                    onClick={randomizeCode}
                                    className="btn-randomize-code"
                                    title="Generate a new room code"
                                >
                                    <Shuffle className="w-3.5 h-3.5 mr-1" /> Re-roll Code
                                </button>
                            </div>
                            <div className="room-code-preview-box">
                                <span className="code-text">{generatedCode}</span>
                                <span className="text-xs text-slate-400">Share this with friends after creating</span>
                            </div>
                        </div>

                        {/* Initial Video Input & Live Preview */}
                        <div className="form-group">
                            <label className="form-label">Initial YouTube Video URL or ID</label>
                            <input
                                type="text"
                                placeholder="https://www.youtube.com/watch?v=... or 11-char ID"
                                value={videoInput}
                                onChange={(e) => setVideoInput(e.target.value)}
                                className="input-text"
                            />

                            {/* Video Preview Card */}
                            {currentPreviewId && (
                                <div className="video-live-preview-card animate-fade-in">
                                    <div className="preview-thumb-box">
                                        <img
                                            src={`https://img.youtube.com/vi/${currentPreviewId}/hqdefault.jpg`}
                                            alt="Video preview"
                                            className="preview-img"
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                        <div className="preview-play-overlay">
                                            <Play className="w-6 h-6 text-white fill-current" />
                                        </div>
                                    </div>
                                    <div className="preview-details">
                                        <span className="preview-badge">READY TO STREAM</span>
                                        <span className="preview-id">ID: {currentPreviewId}</span>
                                        <span className="preview-hint">Will start synchronized for all participants</span>
                                    </div>
                                </div>
                            )}

                            {/* Preset Quick Picks */}
                            <div className="preset-container">
                                <span className="preset-label">Or choose a trending preset:</span>
                                <div className="preset-chips">
                                    {PRESET_VIDEOS.map((vid) => (
                                        <button
                                            key={vid.id}
                                            type="button"
                                            onClick={() => setVideoInput(vid.id)}
                                            className={`preset-chip ${currentPreviewId === vid.id ? 'preset-active' : ''}`}
                                        >
                                            <span className="chip-tag">{vid.tag}</span>
                                            <span className="chip-title">{vid.title}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={!hostName.trim()} className="btn-primary-action">
                            <span>Launch Watch Party</span>
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                    </form>
                )}

                {/* Tab 2: Join Room */}
                {activeTab === 'join' && (
                    <form onSubmit={handleJoin} className="lobby-form animate-fade-in">
                        <div className="form-group">
                            <label className="form-label">Party Room Code</label>
                            <input
                                type="text"
                                required
                                maxLength={15}
                                placeholder="e.g. PARTY-9821"
                                value={joinRoomCode}
                                onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                                className="input-text uppercase-input"
                                autoFocus
                            />
                            <span className="input-hint">Ask the host for their 6-character room code or join link.</span>
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
                            <span>Enter Watch Party</span>
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                    </form>
                )}
            </div>

            {/* Recent / Public Persisted Rooms from SQLite */}
            {recentRooms.length > 0 && (
                <section className="recent-rooms-section">
                    <div className="recent-header-row">
                        <div>
                            <h2 className="recent-title flex items-center gap-2">
                                <Database className="w-4 h-4 text-purple-400" />
                                <span>Active & Persisted Rooms in SQLite</span>
                            </h2>
                            <p className="recent-subtitle">
                                These rooms are persisted in <code className="text-purple-300">watchparty.sqlite</code>. Click any room to join instantly.
                            </p>
                        </div>
                        <button
                            className="btn-inspect-db-link"
                            onClick={() => setShowStorageModal(true)}
                        >
                            <Info className="w-3.5 h-3.5 mr-1.5" /> Database Details
                        </button>
                    </div>

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
                                <div className="room-card-thumb">
                                    <img
                                        src={`https://img.youtube.com/vi/${r.current_video_id}/mqdefault.jpg`}
                                        alt={r.name}
                                        className="room-card-img"
                                        onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                    <div className={`room-state-pill ${r.play_state === 'playing' ? 'state-playing' : 'state-paused'}`}>
                                        <span className="state-dot" />
                                        <span>{r.play_state.toUpperCase()}</span>
                                    </div>
                                </div>

                                <div className="room-card-content">
                                    <div className="room-card-header">
                                        <span className="room-id-tag">{r.id}</span>
                                    </div>
                                    <h3 className="room-card-name">{r.name || 'Watch Party'}</h3>
                                    <div className="room-card-footer">
                                        <span className="text-xs text-slate-400">Video: {r.current_video_id}</span>
                                        <span className="room-join-hint">Join Party →</span>
                                    </div>
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
                    <h3 className="feature-title">Sub-Second Sync</h3>
                    <p className="feature-desc">
                        Ultra-fast synchronization using WebSockets. When the host plays, pauses, or seeks, all participants lock in sync automatically without buffering drift.
                    </p>
                </div>

                <div className="feature-item glass-panel">
                    <div className="feature-icon bg-cyan-500/10 text-cyan-400">
                        <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="feature-title">Role-Based Access</h3>
                    <p className="feature-desc">
                        Host has full control over playback. Viewers can request permission, and hosts can promote trusted users to Moderator, transfer host, or manage the room.
                    </p>
                </div>

                <div className="feature-item glass-panel" onClick={() => setShowStorageModal(true)} style={{ cursor: 'pointer' }}>
                    <div className="feature-icon bg-purple-500/10 text-purple-400">
                        <Database className="w-6 h-6" />
                    </div>
                    <div className="flex items-center justify-between">
                        <h3 className="feature-title">Persistent SQLite</h3>
                        <span className="text-xs text-purple-400 underline">Inspect Data →</span>
                    </div>
                    <p className="feature-desc">
                        Room state, chat history, and upcoming playlist queues are saved on-disk to <code>watchparty.sqlite</code> for complete resilience across reconnects.
                    </p>
                </div>
            </section>

            {/* Footer with Data Transparency Link */}
            <footer className="lobby-footer">
                <div className="footer-content">
                    <span>SyncParty © Real-Time Watch Party System</span>
                    <div className="footer-links">
                        <button className="footer-storage-btn" onClick={() => setShowStorageModal(true)}>
                            <Database className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                            <span>Where is my data saved? (SQLite Inspector)</span>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};
