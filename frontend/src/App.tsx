import React, { useState, useEffect } from 'react';
import { getSocket } from './services/socket';
import { Lobby } from './components/Lobby';
import { WatchParty } from './components/WatchParty';
import './styles/index.css';

export const App: React.FC = () => {
  const [inParty, setInParty] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [urlRoomCode, setUrlRoomCode] = useState<string>('');

  const socket = getSocket();

  // Check URL query parameters for direct invite link (?room=XYZ)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setUrlRoomCode(roomParam.toUpperCase());
    }
  }, []);

  const handleJoinParty = (
    roomId: string,
    joinedUsername: string,
    isCreate: boolean = false,
    initialVideo?: string
  ) => {
    const cleanRoom = roomId.toUpperCase().trim();
    const cleanUser = joinedUsername.trim();

    setCurrentRoomId(cleanRoom);
    setUsername(cleanUser);

    // Emit join_room to WebSocket server
    socket.emit('join_room', {
      roomId: cleanRoom,
      username: cleanUser
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
      {!inParty ? (
        <Lobby onJoinRoom={handleJoinParty} initialRoomCode={urlRoomCode} />
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
