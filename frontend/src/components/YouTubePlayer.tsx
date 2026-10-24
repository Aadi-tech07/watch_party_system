import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Sparkles,
  Lock,
  RotateCw,
  Tv,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { formatTime } from '../utils/youtube';
import { Role } from '../types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  playState: 'playing' | 'paused';
  currentTime: number;
  userRole: Role;
  canControl: boolean;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onSeek: (time: number) => void;
  onRequestControl: () => void;
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  playState,
  currentTime,
  userRole,
  canControl,
  onPlay,
  onPause,
  onSeek,
  onRequestControl,
  isTheaterMode,
  onToggleTheater
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef<boolean>(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'adjusting'>('synced');
  const [showControlHint, setShowControlHint] = useState(false);

  // Initialize YouTube IFrame API
  useEffect(() => {
    let isMounted = true;

    const loadAPI = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        if (!document.getElementById('youtube-iframe-api-script')) {
          const tag = document.createElement('script');
          tag.id = 'youtube-iframe-api-script';
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScript = document.getElementsByTagName('script')[0];
          firstScript.parentNode?.insertBefore(tag, firstScript);
        }

        const prevHandler = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prevHandler) prevHandler();
          if (isMounted) initPlayer();
        };
      }
    };

    const initPlayer = () => {
      if (!isMounted) return;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }

      playerRef.current = new window.YT.Player('yt-player-target', {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0, // Custom controls to enforce role-based access control
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
          playsinline: 1
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            setIsPlayerReady(true);
            setDuration(event.target.getDuration() || 0);
            event.target.setVolume(volume);

            if (currentTime > 0) {
              event.target.seekTo(currentTime, true);
            }
            if (playState === 'playing') {
              event.target.playVideo();
            } else {
              event.target.pauseVideo();
            }
          },
          onStateChange: (event: any) => {
            if (isSyncingRef.current) return;

            if (canControl) {
              if (event.data === window.YT.PlayerState.PLAYING && playState !== 'playing') {
                onPlay(event.target.getCurrentTime());
              } else if (event.data === window.YT.PlayerState.PAUSED && playState !== 'paused') {
                onPause(event.target.getCurrentTime());
              }
            }
          }
        }
      });
    };

    loadAPI();

    return () => {
      isMounted = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Handle Video ID change
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;

    try {
      const currentLoadedVideoId = playerRef.current.getVideoData?.()?.video_id;
      if (currentLoadedVideoId !== videoId) {
        isSyncingRef.current = true;
        playerRef.current.loadVideoById({
          videoId,
          startSeconds: currentTime || 0
        });
        if (playState === 'playing') {
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
        }
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 800);
      }
    } catch (err) {
      console.warn('Error changing video in player:', err);
    }
  }, [videoId, isPlayerReady]);

  // Handle Sync State Changes (playState, currentTime)
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;

    isSyncingRef.current = true;

    try {
      const currentActualTime = playerRef.current.getCurrentTime() || 0;
      const drift = Math.abs(currentActualTime - currentTime);

      // If drift is significant (> 1.5s), resync position
      if (drift > 1.5) {
        setSyncStatus('adjusting');
        playerRef.current.seekTo(currentTime, true);
        setTimeout(() => setSyncStatus('synced'), 600);
      }

      // Sync play/pause state
      const ytState = playerRef.current.getPlayerState();
      if (playState === 'playing') {
        if (ytState !== window.YT.PlayerState.PLAYING) {
          playerRef.current.playVideo();
        }
      } else {
        if (ytState !== window.YT.PlayerState.PAUSED) {
          playerRef.current.pauseVideo();
        }
      }
    } catch (err) {
      console.warn('Sync error:', err);
    }

    const timer = setTimeout(() => {
      isSyncingRef.current = false;
    }, 500);

    return () => clearTimeout(timer);
  }, [playState, currentTime, isPlayerReady]);

  // Periodic ticker for progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && isPlayerReady) {
        try {
          const t = playerRef.current.getCurrentTime() || 0;
          const d = playerRef.current.getDuration() || 0;
          setLocalTime(t);
          if (d > 0 && d !== duration) setDuration(d);
        } catch (e) {
          // ignore
        }
      }
    }, 350);

    return () => clearInterval(interval);
  }, [isPlayerReady, duration]);

  // Custom Controls Handlers
  const handleTogglePlay = () => {
    if (!canControl) {
      setShowControlHint(true);
      setTimeout(() => setShowControlHint(false), 3000);
      return;
    }

    if (playState === 'playing') {
      onPause(localTime);
    } else {
      onPlay(localTime);
    }
  };

  const handleJump = (seconds: number) => {
    if (!canControl) {
      setShowControlHint(true);
      setTimeout(() => setShowControlHint(false), 3000);
      return;
    }
    const newTarget = Math.max(0, Math.min(duration, localTime + seconds));
    setLocalTime(newTarget);
    onSeek(newTarget);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canControl) {
      setShowControlHint(true);
      setTimeout(() => setShowControlHint(false), 3000);
      return;
    }
    const target = parseFloat(e.target.value);
    setLocalTime(target);
    onSeek(target);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    if (playerRef.current) {
      playerRef.current.setVolume(val);
      if (val === 0) {
        playerRef.current.mute();
        setIsMuted(true);
      } else if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const handleToggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
      playerRef.current.setVolume(volume || 50);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Fullscreen request error:', err.message);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const progressPercent = duration > 0 ? (localTime / duration) * 100 : 0;

  return (
    <div className={`player-wrapper ${isTheaterMode ? 'theater-mode' : ''}`} ref={containerRef}>
      {/* Cinema Ambient Backlight Glow */}
      <div className="cinema-ambient-glow" />

      {/* Video Viewport Container */}
      <div className="video-viewport">
        <div id="yt-player-target" className="yt-iframe-element" />

        {/* Non-controllers Overlay */}
        {!canControl && (
          <div
            className="video-click-interceptor"
            onClick={() => {
              setShowControlHint(true);
              setTimeout(() => setShowControlHint(false), 3500);
            }}
          />
        )}

        {/* Restriction Hint Toast */}
        {showControlHint && (
          <div className="control-restriction-toast animate-fade-in">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Host & Moderators hold playback controls</span>
            <button className="btn-request-inline" onClick={onRequestControl}>
              <Sparkles className="w-3.5 h-3.5" /> Request Control
            </button>
          </div>
        )}

        {/* Sync Drift Indicator */}
        <div className={`sync-pill ${syncStatus}`}>
          <div className="sync-dot" />
          <span>{syncStatus === 'synced' ? 'Synchronized' : 'Calibrating Drift...'}</span>
        </div>
      </div>

      {/* Floating Modern Custom Controls Island */}
      <div className="player-controls-bar">
        {/* Play/Pause Button */}
        <button
          className={`btn-play-pause ${!canControl ? 'disabled-control' : ''}`}
          onClick={handleTogglePlay}
          title={canControl ? (playState === 'playing' ? 'Pause' : 'Play') : 'Playback locked for participants'}
        >
          {playState === 'playing' ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Quick Skip -10s and +10s (Host/Mod only) */}
        {canControl && (
          <div className="skip-buttons-group">
            <button
              className="btn-skip"
              onClick={() => handleJump(-10)}
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="skip-label">10s</span>
            </button>
            <button
              className="btn-skip"
              onClick={() => handleJump(10)}
              title="Forward 10 seconds"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="skip-label">10s</span>
            </button>
          </div>
        )}

        {/* Time Stamp */}
        <div className="time-display">
          <span className="current-time">{formatTime(localTime)}</span>
          <span className="time-divider">/</span>
          <span className="total-time">{formatTime(duration)}</span>
        </div>

        {/* Scrub Slider Container with smooth progress track */}
        <div className="scrub-container">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={localTime}
            onChange={handleSeekChange}
            className={`scrub-slider ${!canControl ? 'slider-locked' : ''}`}
            disabled={!canControl}
          />
          <div
            className="scrub-progress"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Volume Controls */}
        <div className="volume-control-group">
          <button className="btn-mute" onClick={handleToggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-200" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>

        {/* Theater Mode Toggle */}
        {onToggleTheater && (
          <button
            className={`btn-theater ${isTheaterMode ? 'btn-theater-active' : ''}`}
            onClick={onToggleTheater}
            title={isTheaterMode ? 'Exit Theater Mode' : 'Enter Theater Mode'}
          >
            <Tv className="w-4 h-4" />
          </button>
        )}

        {/* Fullscreen Button */}
        <button className="btn-fullscreen" onClick={handleFullscreen} title="Toggle Fullscreen">
          <Maximize className="w-4 h-4" />
        </button>

        {/* Role permission badge */}
        <div className={`badge-role-pill role-${userRole}`}>
          {userRole === 'host' && '👑 Host'}
          {userRole === 'moderator' && '🛡️ Mod'}
          {userRole === 'participant' && '👁️ Viewer'}
        </div>
      </div>
    </div>
  );
};
