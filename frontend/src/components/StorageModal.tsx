import React, { useState, useEffect } from 'react';
import { Database, HardDrive, Table, FileText, CheckCircle2, RefreshCw, X, Shield, Clock, Layers, ExternalLink } from 'lucide-react';

interface StorageStats {
  dbPath: string;
  fileSizeBytes: number;
  roomsCount: number;
  participantsCount: number;
  messagesCount: number;
  playlistCount: number;
  tables: string[];
}

interface StorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomId?: string;
}

export const StorageModal: React.FC<StorageModalProps> = ({
  isOpen,
  onClose,
  currentRoomId
}) => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/storage-info');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.warn('Failed to fetch storage info:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="storage-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="storage-icon-box">
              <Database className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="modal-title">Where Is Your Data Saved?</h3>
              <p className="modal-subtitle">SQLite Persistence Engine & System Architecture</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="storage-modal-body">
          {/* Quick Summary Banner */}
          <div className="storage-hero-banner">
            <div className="storage-hero-info">
              <div className="status-live-dot" />
              <div>
                <span className="font-semibold text-white">Active Database File: </span>
                <code className="storage-path-chip">{stats?.dbPath || 'watchparty.sqlite'}</code>
              </div>
            </div>
            <button
              className="btn-refresh-stats"
              onClick={fetchStats}
              disabled={isLoading}
              title="Refresh database statistics"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Database Specs Grid */}
          <div className="storage-specs-grid">
            <div className="storage-stat-card">
              <div className="stat-label">
                <HardDrive className="w-4 h-4 text-cyan-400 mr-1.5" /> File Size
              </div>
              <div className="stat-value">{stats ? formatBytes(stats.fileSizeBytes) : '36 KB'}</div>
              <div className="stat-subtext">On-disk SQLite 3 file</div>
            </div>

            <div className="storage-stat-card">
              <div className="stat-label">
                <Layers className="w-4 h-4 text-purple-400 mr-1.5" /> Total Rooms
              </div>
              <div className="stat-value">{stats?.roomsCount ?? '1+'}</div>
              <div className="stat-subtext">Active & persisted parties</div>
            </div>

            <div className="storage-stat-card">
              <div className="stat-label">
                <FileText className="w-4 h-4 text-emerald-400 mr-1.5" /> Messages Saved
              </div>
              <div className="stat-value">{stats?.messagesCount ?? '0'}</div>
              <div className="stat-subtext">Chat history across rooms</div>
            </div>

            <div className="storage-stat-card">
              <div className="stat-label">
                <Shield className="w-4 h-4 text-amber-400 mr-1.5" /> Active Participants
              </div>
              <div className="stat-value">{stats?.participantsCount ?? '1'}</div>
              <div className="stat-subtext">Persistent user sessions</div>
            </div>
          </div>

          {/* Table Breakdown */}
          <div className="storage-tables-section">
            <h4 className="section-heading">
              <Table className="w-4 h-4 text-purple-400 mr-1.5" />
              SQLite Relational Tables Schema
            </h4>
            <div className="table-list">
              <div className="table-row">
                <div className="table-name-group">
                  <span className="table-badge">rooms</span>
                  <span className="table-desc">Stores party ID, host ID, current video ID, playback state, and timestamp</span>
                </div>
                <span className="table-count-pill">{stats?.roomsCount || 0} rows</span>
              </div>

              <div className="table-row">
                <div className="table-name-group">
                  <span className="table-badge">participants</span>
                  <span className="table-desc">Stores participant ID, room association, username, and role (Host / Moderator / Participant)</span>
                </div>
                <span className="table-count-pill">{stats?.participantsCount || 0} rows</span>
              </div>

              <div className="table-row">
                <div className="table-name-group">
                  <span className="table-badge">chat_messages</span>
                  <span className="table-desc">Stores all chat messages, sender nickname, role badge, and creation timestamps</span>
                </div>
                <span className="table-count-pill">{stats?.messagesCount || 0} rows</span>
              </div>

              <div className="table-row">
                <div className="table-name-group">
                  <span className="table-badge">playlist</span>
                  <span className="table-desc">Stores queued YouTube videos, custom titles, and who added them</span>
                </div>
                <span className="table-count-pill">{stats?.playlistCount || 0} rows</span>
              </div>
            </div>
          </div>

          {/* Architecture Explanation Card */}
          <div className="storage-architecture-card">
            <h4 className="section-heading">How Data Sync & Storage Works:</h4>
            <ol className="architecture-steps">
              <li>
                <strong>1. In-Memory Sub-Second Sync:</strong> When playback plays, pauses, or seeks, updates are calculated in memory by the server's <code>RoomManager</code> and broadcast instantly via WebSockets (Socket.IO).
              </li>
              <li>
                <strong>2. Permanent SQLite Persistence:</strong> Room state, chat messages, participant roles, and playlist items are committed to the <code>watchparty.sqlite</code> file via Node's native <code>node:sqlite</code> database engine.
              </li>
              <li>
                <strong>3. Seamless Reconnect & Resumption:</strong> If a user refreshes or a new participant arrives, the room state and chat history are loaded from SQLite so no progress is ever lost.
              </li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <span className="text-xs text-slate-400 flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1" /> Last verified: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button className="btn-modal-confirm" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
