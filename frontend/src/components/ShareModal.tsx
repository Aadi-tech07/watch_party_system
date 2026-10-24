import React, { useState } from 'react';
import { Copy, Check, QrCode, X, Share2, Send, MessageCircle } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQr, setShowQr] = useState(true);

  if (!isOpen) return null;

  const inviteUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareText = `Join my Watch Party on SyncParty: ${roomName || roomId}!`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${inviteUrl}`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(inviteUrl)}`;

  // Public QR server API for crisp phone scanning
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=8b5cf6&bgcolor=0c101d&data=${encodeURIComponent(inviteUrl)}`;

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="share-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="share-icon-box">
              <Share2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="modal-title">Invite Friends</h3>
              <p className="modal-subtitle">Share this party and watch in sync</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="share-modal-body">
          {/* Room Code Card */}
          <div className="share-section">
            <label className="share-label">Party Room Code</label>
            <div className="share-code-box">
              <span className="share-code-display">{roomId}</span>
              <button className="btn-copy-action" onClick={handleCopyCode}>
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 mr-1" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" /> Copy Code
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Invite Link Card */}
          <div className="share-section">
            <label className="share-label">Direct Invite Link</label>
            <div className="share-link-box">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="share-link-input"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button className="btn-copy-action" onClick={handleCopyUrl}>
                {copiedUrl ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 mr-1" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" /> Copy Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* QR Code for Mobile Scanning */}
          <div className="qr-section">
            <div className="qr-toggle-header" onClick={() => setShowQr(!showQr)}>
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                <QrCode className="w-4 h-4 text-purple-400" /> Mobile QR Code
              </span>
              <span className="text-xs text-purple-400 cursor-pointer">{showQr ? 'Hide' : 'Show'}</span>
            </div>
            {showQr && (
              <div className="qr-image-container animate-fade-in">
                <img
                  src={qrApiUrl}
                  alt="Party QR Code"
                  className="qr-image"
                  loading="lazy"
                />
                <span className="qr-caption">Scan with mobile camera to join instantly</span>
              </div>
            )}
          </div>

          {/* Social Quick Share */}
          <div className="social-share-row">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-social-share whatsapp"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
            </a>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-social-share telegram"
              title="Share on Telegram"
            >
              <Send className="w-4 h-4 mr-1.5" /> Telegram
            </a>
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-social-share twitter"
              title="Share on X / Twitter"
            >
              <Share2 className="w-4 h-4 mr-1.5" /> X / Twitter
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-modal-confirm w-full" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
