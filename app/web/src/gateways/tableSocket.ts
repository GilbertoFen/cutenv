import { io, Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '@/lib/config';

let socket: Socket | null = null;

export function getTablesSocket(): Socket {
  if (!socket) {
    const base = getSocketBaseUrl();
    socket = io(`${base}/tables`, {
      transports: ['websocket'],
    });
    socket.on('connect', () => console.log('[WS tables] connected', socket?.id));
    socket.on('connect_error', (e) => console.error('[WS tables] connect_error', e?.message));
  }
  return socket;
}
