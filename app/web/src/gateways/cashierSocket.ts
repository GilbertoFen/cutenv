import { io, Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '@/lib/config';

let socket: Socket | null = null;

export function getCashierSocket(): Socket {
  if (socket && socket.connected) return socket;

  const base = getSocketBaseUrl();
  socket = io(`${base}/cashier`, {
    transports: ['websocket'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('[WS /cashier] connected', socket?.id);
  });
  socket.on('disconnect', (r) => {
    console.log('[WS /cashier] disconnected', r);
  });
  socket.on('connect_error', (e) => {
    console.error('[WS /cashier] connect_error', e.message);
  });

  return socket;
}
