import React, { useState } from 'react';
import { PlaylistItem } from '../types';
import { extractYouTubeId } from '../utils/youtube';
import { Plus, Play, Trash2, ListMusic, Video, Check } from 'lucide-react';

interface VideoQueueProps {
  queue: PlaylistItem[];
  currentVideoId: string;
  canControl: boolean;
  onAddToQueue: (videoId: string, title?: string) => void;
  onPlayNext: () => void;
  onSelectVideo: (videoId: string) => void;
}

export const VideoQueue: React.FC<VideoQueueProps> = ({
  queue,
  currentVideoId,
  canControl,
  onAddToQueue,
  onPlayNext,
  onSelectVideo
}) => {
  const [videoInput, setVideoInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const id = extractYouTubeId(videoInput);
    if (!id) {
      setErrorMsg('Please enter a valid YouTube URL or Video ID');
      return;
    }

    onAddToQueue(id, titleInput.trim() || `YouTube Video (${id})`);
    setVideoInput('');
    setTitleInput('');
  };

  return (
    <div className="queue-container">
      <div className="queue-header">
        <div className="queue-title-row">
          <ListMusic className="w-4 h-4 text-purple-400 mr-1.5" />
          <span className="section-title">Party Playlist Queue</span>
        </div>
        {canControl && queue.length > 0 && (
          <button className="btn-play-next" onClick={onPlayNext}>
            <Play className="w-3.5 h-3.5 fill-current mr-1" /> Play Next
          </button>
        )}
      </div>

      {/* Add to Queue form */}
      <form onSubmit={handleAdd} className="queue-add-form">
        <input
          type="text"
          value={videoInput}
          onChange={(e) => setVideoInput(e.target.value)}
          placeholder="Paste YouTube URL or Video ID..."
          className="queue-input"
        />
        <div className="queue-submit-row">
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Custom title (optional)"
            className="queue-title-input"
          />
          <button type="submit" disabled={!videoInput.trim()} className="btn-queue-add">
            <Plus className="w-4 h-4 mr-1" /> Add to Queue
          </button>
        </div>
        {errorMsg && <p className="queue-error-text">{errorMsg}</p>}
      </form>

      {/* Current playing card */}
      <div className="current-video-banner">
        <div className="current-badge">NOW PLAYING</div>
        <div className="video-id-text">Video ID: {currentVideoId}</div>
      </div>

      {/* Queued items list */}
      <div className="queue-list">
        {queue.length === 0 ? (
          <div className="queue-empty-state">
            <Video className="w-8 h-8 text-slate-500 mb-2" />
            <p>Queue is empty. Add videos to play continuously!</p>
          </div>
        ) : (
          queue.map((item, index) => (
            <div key={item.id} className="queue-item-card animate-fade-in">
              <span className="queue-index">#{index + 1}</span>
              <div className="queue-item-info">
                <span className="queue-item-title">{item.title}</span>
                <span className="queue-item-meta">Added by {item.addedBy}</span>
              </div>
              {canControl && (
                <button
                  className="btn-play-item"
                  onClick={() => onSelectVideo(item.videoId)}
                  title="Play this video now"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
