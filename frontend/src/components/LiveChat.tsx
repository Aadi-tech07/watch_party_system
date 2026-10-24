import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Role } from '../types';
import { Send, Smile, Sparkles, Crown, Shield, User } from 'lucide-react';

interface LiveChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
}

const QUICK_EMOJIS = ['🔥', '❤️', '😂', '🎉', '👏', '🍿', '🚀'];

export const LiveChat: React.FC<LiveChatProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  onSendReaction
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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
      {/* Messages Stream */}
      <div className="chat-messages-stream">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <Smile className="w-8 h-8 text-slate-500 mb-2" />
            <p>Welcome to the Party! Say hello to everyone.</p>
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
                <div className="bubble-header">
                  <span className="bubble-author">{msg.username}</span>
                  {msg.role === 'host' && (
                    <span className="chat-role-chip chip-host">
                      <Crown className="w-2.5 h-2.5 mr-0.5" /> Host
                    </span>
                  )}
                  {msg.role === 'moderator' && (
                    <span className="chat-role-chip chip-mod">
                      <Shield className="w-2.5 h-2.5 mr-0.5" /> Mod
                    </span>
                  )}
                  <span className="bubble-time">{formatMsgTime(msg.timestamp)}</span>
                </div>
                <div className="bubble-body">{msg.text}</div>
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

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
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
