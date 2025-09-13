import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getCashierSocket(): Socket {
  if (socket && socket.connected) return socket;

  const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
  socket = io(`${base}/cashier`, {
    transports: ['websocket'], 
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('---  -- connected', socket?.id);
  });
  socket.on('disconnect', (r) => {
    console.log('[WS /cashier] disconnected', r);
  });
  socket.on('connect_error', (e) => {
    console.error('[WS /cashier] connect_error', e.message);
  });

  return socket!;
}
