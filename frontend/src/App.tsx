import React, { useState, useEffect } from 'react';
import { getSocket } from './services/socket';
import { Lobby } from './components/Lobby';
import { WatchParty } from './components/WatchParty';
import { AuthModal } from './components/AuthModal';
import { AuthUser } from './types';
import {
  clearAuthSession,
  fetchCurrentUser,
  getStoredToken,
  getStoredUser,
  logoutApi
} from './services/auth';
import './styles/index.css';
import './styles/index-auth-additions.css';

export const App: React.FC = () => {
  const [inParty, setInParty] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [urlRoomCode, setUrlRoomCode] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredUser());
  const [authToken, setAuthToken] = useState<string | null>(getStoredToken());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<{
    roomId: string;
    isCreate: boolean;
    initialVideo?: string;
    asViewer?: boolean;
  } | null>(null);

  const socket = getSocket();

  // Validate the stored session on load; keep React state in sync with storage.
  useEffect(() => {
    fetchCurrentUser().then((user) => {
      setCurrentUser(user);
      setAuthToken(user ? getStoredToken() : null);
    });
  }, []);

  // Open the auth modal when arriving through a shared room link.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setUrlRoomCode(roomParam.toUpperCase());
      if (!getStoredToken()) {
        setShowAuthModal(true);
      }
    }
  }, []);

  // Server rejected our token: wipe the stale session so the user can sign in again.
  useEffect(() => {
    const handleAuthRequired = () => {
      clearAuthSession();
      setCurrentUser(null);
      setAuthToken(null);
      setInParty(false);
      setCurrentRoomId('');
      setShowAuthModal(true);
    };

    socket.on('auth_required', handleAuthRequired);
    return () => {
      socket.off('auth_required', handleAuthRequired);
    };
  }, [socket]);

  const handleJoinParty = (
    roomId: string,
    joinedUsername: string,
    isCreate: boolean = false,
    initialVideo?: string,
    overrideToken?: string,
    overrideUser?: AuthUser,
    asViewer: boolean = false
  ) => {
    const activeToken = overrideToken || authToken || getStoredToken();
    const activeUser = overrideUser || currentUser || getStoredUser();

    if (!activeToken || !activeUser) {
      setPendingJoin({ roomId, isCreate, initialVideo, asViewer });
      setShowAuthModal(true);
      return;
    }

    const cleanRoom = roomId.toUpperCase().trim();
    const effectiveUsername = activeUser.username || joinedUsername.trim();

    setCurrentRoomId(cleanRoom);
    setUsername(effectiveUsername);

    socket.emit('join_room', {
      roomId: cleanRoom,
      username: effectiveUsername,
      token: activeToken,
      asViewer
    });

    if (isCreate && initialVideo) {
      setTimeout(() => {
        socket.emit('change_video', { videoId: initialVideo });
      }, 600);
    }

    setInParty(true);

    const newUrl = `${window.location.pathname}?room=${cleanRoom}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleAuthSuccess = (user: AuthUser, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    setShowAuthModal(false);

    if (pendingJoin) {
      const { roomId, isCreate, initialVideo, asViewer } = pendingJoin;
      setPendingJoin(null);
      handleJoinParty(roomId, user.username, isCreate, initialVideo, token, user, asViewer);
    } else if (urlRoomCode) {
      handleJoinParty(urlRoomCode, user.username, false, undefined, token, user, false);
    }
  };

  const handleLeaveParty = () => {
    if (currentRoomId) {
      socket.emit('leave_room', { roomId: currentRoomId });
    }
    setInParty(false);
    setCurrentRoomId('');
    setUrlRoomCode('');

    window.history.pushState({}, '', window.location.pathname);
  };

  const handleLogout = async () => {
    if (inParty) {
      handleLeaveParty();
    }
    await logoutApi();
    setCurrentUser(null);
    setAuthToken(null);
    setPendingJoin(null);
  };

  return (
    <div className="app-root">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        roomCode={urlRoomCode || pendingJoin?.roomId}
        canClose={true}
      />

      {!inParty ? (
        <Lobby
          onJoinRoom={handleJoinParty}
          initialRoomCode={urlRoomCode}
          currentUser={currentUser}
          onOpenAuth={() => setShowAuthModal(true)}
          onLogout={handleLogout}
        />
      ) : (
        <WatchParty
          socket={socket}
          roomId={currentRoomId}
          username={username}
          onLeaveRoom={handleLeaveParty}
        />
      )}
    </div>
  );
};

export default App;