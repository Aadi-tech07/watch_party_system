import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Role } from '../types';
import { Send, Smile, Sparkles, Crown, Shield, User, Volume2, VolumeX, MessageSquare } from 'lucide-react';

interface LiveChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
}

const QUICK_EMOJIS = ['🔥', '❤️', '😂', '🎉', '👏', '🍿', '🚀', '😍'];

// Deterministic gradient generator for user avatars
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

export const LiveChat: React.FC<LiveChatProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  onSendReaction
}) => {
  const [inputText, setInputText] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);

  // Play subtle web audio chime on new message
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // AudioContext might be blocked until user gesture
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    if (messages.length > prevCountRef.current) {
      const last = messages[messages.length - 1];
      if (last && last.userId !== currentUserId) {
        playChime();
      }
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const formatMsgTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container">
      {/* Chat header bar with sound toggle */}
      <div className="chat-header-bar">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
          <span>Live Party Stream ({messages.length})</span>
        </div>
        <button
          className="btn-sound-toggle"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Mute message chime' : 'Enable message chime'}
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>
      </div>

      {/* Messages Stream */}
      <div className="chat-messages-stream">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="empty-icon-circle">
              <Smile className="w-6 h-6 text-purple-400" />
            </div>
            <h4>No messages yet</h4>
            <p>Welcome to the watch party! Say hi to your fellow viewers.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSystem = msg.role === 'system' || msg.userId === 'system';
            const isMe = msg.userId === currentUserId;

            if (isSystem) {
              return (
                <div key={msg.id} className="system-chat-message animate-fade-in">
                  <span className="system-pill">System</span>
                  <span className="system-text">{msg.text}</span>
                  <span className="system-time">{formatMsgTime(msg.timestamp)}</span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`user-chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'} animate-fade-in`}
              >
                {!isMe && (
                  <div
                    className="chat-avatar-mini"
                    style={{ background: getAvatarGradient(msg.username) }}
                  >
                    {msg.username.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="bubble-wrapper">
                  <div className="bubble-header">
                    <span className="bubble-author">{msg.username}</span>
                    {msg.role === 'host' && (
                      <span className="chat-role-chip chip-host">
                        <Crown className="w-2.5 h-2.5 mr-0.5 text-amber-300" /> Host
                      </span>
                    )}
                    {msg.role === 'moderator' && (
                      <span className="chat-role-chip chip-mod">
                        <Shield className="w-2.5 h-2.5 mr-0.5 text-cyan-300" /> Mod
                      </span>
                    )}
                    <span className="bubble-time">{formatMsgTime(msg.timestamp)}</span>
                  </div>
                  <div className="bubble-body">{msg.text}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reaction Bar */}
      <div className="quick-reactions-bar">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            className="btn-quick-emoji"
            onClick={() => onSendReaction(emoji)}
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Field Form */}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message in real-time..."
          maxLength={300}
          className="chat-input-field"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="btn-chat-send"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
