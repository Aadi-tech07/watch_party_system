import React, { useState } from 'react';
import { LogIn, UserPlus, Sparkles, X, AlertCircle, Lock, User, KeyRound, ShieldCheck } from 'lucide-react';
import { AuthUser } from '../types';
import { loginApi, registerApi } from '../services/auth';

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setError('Please enter a username.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }

    try {
      setIsLoading(true);
      if (mode === 'login') {
        const result = await loginApi(cleanUser, password);
        onSuccess(result.user, result.token);
      } else {
        const result = await registerApi(cleanUser, password);
        onSuccess(result.user, result.token);
      }
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
      // Try logging in first
      try {
        const loginRes = await loginApi(demoUsername, demoPassword);
        onSuccess(loginRes.user, loginRes.token);
        return;
      } catch {
        // If user doesn't exist, register
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

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-backdrop" onClick={canClose ? onClose : undefined} />
      <div className="modal-container" style={{ maxWidth: '440px', width: '92%' }}>
        <div className="modal-card glassmorphic-panel">
          {/* Header */}
          <div className="modal-header">
            <div className="flex-row items-center gap-3">
              <div className="feature-icon" style={{ width: '40px', height: '40px' }}>
                <ShieldCheck size={22} className="text-accent" />
              </div>
              <div>
                <h3 className="modal-title">
                  {mode === 'login' ? 'Sign In to Watch Party' : 'Create an Account'}
                </h3>
                <p className="modal-subtitle">
                  {roomCode
                    ? `Authentication required to join Room ${roomCode}`
                    : 'Log in to sync video, chat, and participate'}
                </p>
              </div>
            </div>
            {canClose && onClose && (
              <button
                className="btn-icon"
                onClick={onClose}
                title="Close modal"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Tab Switcher */}
          <div className="flex-row gap-2" style={{ padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className={`filter-btn ${mode === 'login' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => {
                setMode('login');
                setError(null);
              }}
            >
              <LogIn size={15} /> Sign In
            </button>
            <button
              type="button"
              className={`filter-btn ${mode === 'register' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => {
                setMode('register');
                setError(null);
              }}
            >
              <UserPlus size={15} /> Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
            {error && (
              <div
                className="flex-row items-center gap-2"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem'
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} /> Username
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. MovieBuff22"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : mode === 'login' ? (
                <>
                  <LogIn size={18} /> Sign In & Continue
                </>
              ) : (
                <>
                  <UserPlus size={18} /> Create Account & Join
                </>
              )}
            </button>

            {/* Quick Demo Accounts */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <p
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)',
                  marginBottom: '0.75rem',
                  textAlign: 'center'
                }}
              >
                ⚡ 1-Click Instant Demo Profiles
              </p>
              <div className="flex-row gap-2">
                <button
                  type="button"
                  className="filter-btn"
                  style={{ flex: 1, fontSize: '0.8rem', justifyContent: 'center' }}
                  onClick={() => handleQuickDemo('Alice')}
                  disabled={isLoading}
                >
                  👩‍🎤 Alice
                </button>
                <button
                  type="button"
                  className="filter-btn"
                  style={{ flex: 1, fontSize: '0.8rem', justifyContent: 'center' }}
                  onClick={() => handleQuickDemo('Bob')}
                  disabled={isLoading}
                >
                  👨‍🚀 Bob
                </button>
                <button
                  type="button"
                  className="filter-btn"
                  style={{ flex: 1, fontSize: '0.8rem', justifyContent: 'center' }}
                  onClick={handleQuickGuest}
                  disabled={isLoading}
                >
                  ✨ Guest
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
