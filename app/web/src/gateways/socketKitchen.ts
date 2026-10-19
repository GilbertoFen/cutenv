import { io, Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '@/lib/config';

let socket: Socket | null = null;

export function getKitchenSocket(authToken?: string): Socket {
  if (!socket) {
    const base = getSocketBaseUrl();
    socket = io(`${base}/kitchen`, {
      transports: ['websocket'],
      withCredentials: true,
      auth: authToken ? { token: authToken } : undefined,
    });
  }
  return socket;
}
