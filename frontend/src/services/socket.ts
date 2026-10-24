import { io, Socket } from 'socket.io-client';

const env = (import.meta as any).env || {};

/**
 * Resolve the backend URL.
 * 1. VITE_BACKEND_URL wins if set (.env file).
 * 2. In dev (any Vite port, localhost / 127.0.0.1 / LAN IP) use the SAME host on port 5001,
 *    so requests never accidentally hit the Vite dev server (which returns HTML, not JSON).
 * 3. In production assume the backend serves the app from the same origin.
 */
function resolveBackendUrl(): string {
  if (env.VITE_BACKEND_URL) {
    return String(env.VITE_BACKEND_URL).replace(/\/+$/, '');
  }
  if (env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:5001`;
  }
  return window.location.origin;
}

export const BACKEND_URL = resolveBackendUrl();

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
      console.error(`❌ WebSocket connection error (${BACKEND_URL}):`, error.message);
    });
  }

  return socketInstance;
}