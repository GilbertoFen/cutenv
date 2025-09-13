import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getTablesSocket() {
  if (!socket) {
    const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    socket = io(`${base.replace(/\/+$/, '')}/tables`, {
      transports: ['websocket'],
    });
    socket.on('connect', () => console.log('[WS tables] connected', socket?.id));
    socket.on('connect_error', e => console.error('[WS tables] connect_error', e?.message));
  }
  return socket;
}
