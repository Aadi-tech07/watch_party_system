import { io, Socket } from 'socket.io-client';

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 
  (window.location.port === '5173' ? 'http://localhost:5001' : window.location.origin);

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(BACKEND_URL, {
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected to Watch Party WebSocket server:', socketInstance?.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('⚠️ Disconnected from server:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });
  }

  return socketInstance;
}
