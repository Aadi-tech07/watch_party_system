import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogIn, UserPlus, X, AlertCircle, Lock, User, ShieldCheck } from 'lucide-react';
import { AuthUser } from '../types';
import { loginApi, registerApi } from '../services/auth';

/* Self-contained styles: no index.css edits and no extra CSS imports needed. */
const AUTH_CSS = `
.sp-auth-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.sp-auth-overlay *{box-sizing:border-box}
.sp-auth-backdrop{position:absolute;inset:0;z-index:0;background:radial-gradient(circle at 50% 25%,rgba(139,92,246,.22),transparent 55%),rgba(4,6,12,.8);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.sp-auth-card{position:relative;z-index:1;width:100%;max-width:440px;max-height:92vh;overflow-y:auto;color:#f8fafc;background:linear-gradient(160deg,rgba(20,26,44,.98),rgba(10,14,24,.99));border:1px solid rgba(139,92,246,.35);border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.7),0 0 40px rgba(139,92,246,.18);animation:spAuthPop .25s cubic-bezier(.16,1,.3,1)}
.sp-auth-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#8b5cf6,#06b6d4,transparent)}
@keyframes spAuthPop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
.sp-auth-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:24px 24px 16px}
.sp-auth-hleft{display:flex;align-items:center;gap:12px}
.sp-auth-icon{width:42px;height:42px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.4);color:#c084fc}
.sp-auth-title{margin:0;font-family:'Outfit','Inter',sans-serif;font-size:1.2rem;font-weight:700;letter-spacing:-.01em;color:#f8fafc}
.sp-auth-sub{margin:3px 0 0;font-size:.8rem;line-height:1.4;color:#94a3b8}
.sp-auth-close{flex-shrink:0;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;padding:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#94a3b8;cursor:pointer;transition:all .2s}
.sp-auth-close:hover{background:rgba(255,255,255,.12);color:#fff}
.sp-auth-tabs{display:flex;margin:0 24px 20px;padding:4px;background:rgba(0,0,0,.4);border-radius:10px}
.sp-auth-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 14px;border:none;background:transparent;color:#94a3b8;font-family:inherit;font-size:.9rem;font-weight:600;border-radius:7px;cursor:pointer;transition:all .2s}
.sp-auth-tab:hover{color:#fff}
.sp-auth-tab.active{background:#8b5cf6;color:#fff;box-shadow:0 4px 12px rgba(139,92,246,.4)}
.sp-auth-form{display:flex;flex-direction:column;gap:18px;padding:0 24px 24px}
.sp-auth-group{display:flex;flex-direction:column;gap:8px}
.sp-auth-label{display:flex;align-items:center;gap:6px;font-size:.85rem;font-weight:500;color:#94a3b8}
.sp-auth-input{width:100%;padding:12px 16px;background:rgba(10,14,24,.85);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#f8fafc;font-family:inherit;font-size:.95rem;outline:none;transition:all .2s}
.sp-auth-input::placeholder{color:#64748b}
.sp-auth-input:focus{border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.22)}
.sp-auth-input:disabled{opacity:.6}
.sp-auth-error{display:flex;align-items:flex-start;gap:8px;padding:10px 14px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:8px;color:#f87171;font-size:.82rem;line-height:1.4}
.sp-auth-error svg{flex-shrink:0;margin-top:1px}
.sp-auth-submit{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px 20px;border:none;border-radius:8px;background:linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%);color:#fff;font-family:inherit;font-size:1rem;font-weight:600;cursor:pointer;box-shadow:0 4px 20px rgba(139,92,246,.35);transition:all .2s}
.sp-auth-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 25px rgba(139,92,246,.5)}
.sp-auth-submit:disabled{opacity:.55;cursor:not-allowed}
.sp-auth-demo{margin-top:4px;padding-top:18px;border-top:1px solid rgba(255,255,255,.08)}
.sp-auth-demo-label{margin:0 0 10px;text-align:center;font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#64748b}
.sp-auth-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.sp-auth-chip{padding:7px 16px;border-radius:9999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#94a3b8;font-family:inherit;font-size:.8rem;font-weight:500;cursor:pointer;transition:all .2s}
.sp-auth-chip:hover:not(:disabled){background:rgba(139,92,246,.2);border-color:#8b5cf6;color:#fff}
.sp-auth-chip:disabled{opacity:.5;cursor:not-allowed}
@media(max-width:480px){.sp-auth-header{padding:20px 18px 14px}.sp-auth-tabs{margin:0 18px 18px}.sp-auth-form{padding:0 18px 20px}}
`;

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (user: AuthUser, token: string) => void;
  roomCode?: string;
  canClose?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  roomCode,
  canClose = true
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Escape to close + lock page scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canClose && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, canClose, onClose]);

  if (!isOpen) return null;

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    if (!cleanUser) return setError('Please enter a username.');
    if (!password) return setError('Please enter a password.');

    try {
      setIsLoading(true);
      const result =
        mode === 'login' ? await loginApi(cleanUser, password) : await registerApi(cleanUser, password);
      setPassword('');
      onSuccess(result.user, result.token);
    } catch (err: any) {
      setError(err?.message || 'Authentication error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (demoUsername: string) => {
    setError(null);
    setIsLoading(true);
    const demoPassword = 'password123';
    try {
      try {
        const loginRes = await loginApi(demoUsername, demoPassword);
        onSuccess(loginRes.user, loginRes.token);
        return;
      } catch {
        const regRes = await registerApi(demoUsername, demoPassword);
        onSuccess(regRes.user, regRes.token);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate demo user.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickGuest = async () => {
    const randomGuest = `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    const randomPass = 'guest_' + Math.random().toString(36).substring(2, 8);
    setIsLoading(true);
    setError(null);
    try {
      const regRes = await registerApi(randomGuest, randomPass);
      onSuccess(regRes.user, regRes.token);
    } catch (err: any) {
      setError(err?.message || 'Failed to create guest account.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="sp-auth-overlay" data-auth-version="sp-v3">
      <style>{AUTH_CSS}</style>
      <div className="sp-auth-backdrop" onClick={canClose ? onClose : undefined} />

      <div className="sp-auth-card" role="dialog" aria-modal="true" aria-label="Sign in or register">
        <div className="sp-auth-header">
          <div className="sp-auth-hleft">
            <div className="sp-auth-icon">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="sp-auth-title">{mode === 'login' ? 'Sign In to SyncParty' : 'Create an Account'}</h3>
              <p className="sp-auth-sub">
                {roomCode
                  ? `Authentication required to join Room ${roomCode}`
                  : 'Log in to sync video, chat, and participate'}
              </p>
            </div>
          </div>
          {canClose && onClose && (
            <button type="button" className="sp-auth-close" onClick={onClose} title="Close" aria-label="Close">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="sp-auth-tabs">
          <button
            type="button"
            className={`sp-auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            <LogIn size={15} /> Sign In
          </button>
          <button
            type="button"
            className={`sp-auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            <UserPlus size={15} /> Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sp-auth-form">
          {error && (
            <div className="sp-auth-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="sp-auth-group">
            <label className="sp-auth-label">
              <User size={14} /> Username
            </label>
            <input
              type="text"
              className="sp-auth-input"
              placeholder="e.g. MovieBuff22"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="sp-auth-group">
            <label className="sp-auth-label">
              <Lock size={14} /> Password
            </label>
            <input
              type="password"
              className="sp-auth-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="sp-auth-submit" disabled={isLoading}>
            {isLoading ? (
              'Authenticating...'
            ) : mode === 'login' ? (
              <>
                <LogIn size={18} /> Sign In &amp; Continue
              </>
            ) : (
              <>
                <UserPlus size={18} /> Create Account &amp; Join
              </>
            )}
          </button>

          <div className="sp-auth-demo">
            <p className="sp-auth-demo-label">⚡ 1-Click Instant Demo Profiles</p>
            <div className="sp-auth-chips">
              <button type="button" className="sp-auth-chip" onClick={() => handleQuickDemo('Alice')} disabled={isLoading}>
                👩‍🎤 Alice
              </button>
              <button type="button" className="sp-auth-chip" onClick={() => handleQuickDemo('Bob')} disabled={isLoading}>
                👨‍🚀 Bob
              </button>
              <button type="button" className="sp-auth-chip" onClick={handleQuickGuest} disabled={isLoading}>
                ✨ Guest
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AuthModal;