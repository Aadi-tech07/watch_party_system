import React, { useState } from 'react';
import { PlaylistItem } from '../types';
import { extractYouTubeId } from '../utils/youtube';
import { Plus, Play, Trash2, ListMusic, Video, Radio, Sparkles } from 'lucide-react';

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
      {/* Header */}
      <div className="queue-header">
        <div className="queue-title-row">
          <ListMusic className="w-4 h-4 text-purple-400 mr-1.5" />
          <span className="section-title">Party Playlist Queue</span>
          <span className="queue-count-tag">{queue.length}</span>
        </div>
        {canControl && queue.length > 0 && (
          <button className="btn-play-next" onClick={onPlayNext}>
            <Play className="w-3.5 h-3.5 fill-current mr-1" /> Skip to Next
          </button>
        )}
      </div>

      {/* Now Streaming Banner with animated sound wave */}
      <div className="now-streaming-banner animate-fade-in">
        <div className="banner-thumb-box">
          <img
            src={`https://img.youtube.com/vi/${currentVideoId}/mqdefault.jpg`}
            alt="Current Video"
            className="banner-thumb-img"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="live-soundwave">
            <span className="bar bar-1" />
            <span className="bar bar-2" />
            <span className="bar bar-3" />
          </div>
        </div>
        <div className="banner-info">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="now-playing-tag">NOW PLAYING</span>
            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
          </div>
          <span className="banner-video-id">ID: {currentVideoId}</span>
        </div>
      </div>

      {/* Add to Queue Form */}
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

      {/* Queued items list */}
      <div className="queue-list">
        {queue.length === 0 ? (
          <div className="queue-empty-state">
            <div className="empty-icon-circle">
              <Video className="w-6 h-6 text-purple-400" />
            </div>
            <h4>Queue is empty</h4>
            <p>Queue up upcoming videos so the party keeps streaming without interruption!</p>
          </div>
        ) : (
          queue.map((item, index) => (
            <div key={item.id} className="queue-item-card animate-fade-in">
              <span className="queue-index">#{index + 1}</span>
              <div className="queue-item-thumb">
                <img
                  src={`https://img.youtube.com/vi/${item.videoId}/default.jpg`}
                  alt={item.title}
                  className="queue-thumb-img"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="queue-item-info">
                <span className="queue-item-title">{item.title}</span>
                <span className="queue-item-meta">Added by {item.addedBy}</span>
              </div>
              {canControl && (
                <button
                  className="btn-play-item"
                  onClick={() => onSelectVideo(item.videoId)}
                  title="Play this video immediately"
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
