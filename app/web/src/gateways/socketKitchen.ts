import { io, Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '@/lib/config';

let socket: Socket | null = null;

export function getKitchenSocket(authToken?: string): Socket {
  if (!socket) {
    const base = getSocketBaseUrl();
    socket = io(`${base}/kitchen`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      withCredentials: true,
      auth: authToken ? { token: authToken } : undefined,
    });

    socket.on('connect', () => {
      console.log('[socketKitchen] Conectado exitosamente al namespace /kitchen con ID:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[socketKitchen] Error de conexión en namespace /kitchen:', err.message);
    });
  } else if (authToken && (!socket.auth || (socket.auth as any).token !== authToken)) {
    socket.auth = { token: authToken };
    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
}
