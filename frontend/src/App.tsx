import React, { useState, useEffect } from 'react';
import { getSocket } from './services/socket';
import { Lobby } from './components/Lobby';
import { WatchParty } from './components/WatchParty';
import { AuthModal } from './components/AuthModal';
import { AuthUser } from './types';
import { fetchCurrentUser, getStoredToken, logoutApi } from './services/auth';
import './styles/index.css';

export const App: React.FC = () => {
  const [inParty, setInParty] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [urlRoomCode, setUrlRoomCode] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(getStoredToken());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<{
    roomId: string;
    isCreate: boolean;
    initialVideo?: string;
  } | null>(null);

  const socket = getSocket();

  // Load existing session on mount
  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user);
        setAuthToken(getStoredToken());
      }
    });
  }, []);

  // Check URL query parameters for direct invite link (?room=XYZ)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const code = roomParam.toUpperCase();
      setUrlRoomCode(code);
      // If user arrives via link and is not authenticated, prompt login immediately!
      if (!getStoredToken()) {
        setShowAuthModal(true);
      }
    }
  }, []);

  // Listen for auth_required from server
  useEffect(() => {
    const handleAuthRequired = () => {
      setInParty(false);
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
    initialVideo?: string
  ) => {
    // If not authenticated, require login first!
    if (!currentUser || !authToken) {
      setPendingJoin({ roomId, isCreate, initialVideo });
      setShowAuthModal(true);
      return;
    }

    const cleanRoom = roomId.toUpperCase().trim();
    const effectiveUsername = currentUser.username || joinedUsername.trim();

    setCurrentRoomId(cleanRoom);
    setUsername(effectiveUsername);

    // Emit join_room with authentication token
    socket.emit('join_room', {
      roomId: cleanRoom,
      username: effectiveUsername,
      token: authToken
    });

    // If host chose a custom initial video on creation
    if (isCreate && initialVideo) {
      setTimeout(() => {
        socket.emit('change_video', { videoId: initialVideo });
      }, 600);
    }

    setInParty(true);

    // Update URL history without page reload
    const newUrl = `${window.location.pathname}?room=${cleanRoom}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleAuthSuccess = (user: AuthUser, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    setShowAuthModal(false);

    // If there was a pending room join (or direct link)
    if (pendingJoin) {
      const { roomId, isCreate, initialVideo } = pendingJoin;
      setPendingJoin(null);
      handleJoinParty(roomId, user.username, isCreate, initialVideo);
    } else if (urlRoomCode) {
      handleJoinParty(urlRoomCode, user.username, false);
    }
  };

  const handleLogout = async () => {
    await logoutApi();
    setCurrentUser(null);
    setAuthToken(null);
    if (inParty) {
      handleLeaveParty();
    }
  };

  const handleLeaveParty = () => {
    if (currentRoomId) {
      socket.emit('leave_room', { roomId: currentRoomId });
    }
    setInParty(false);
    setCurrentRoomId('');

    // Clear URL param
    window.history.pushState({}, '', window.location.pathname);
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
