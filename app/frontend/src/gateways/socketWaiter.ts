import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getWaiterSocket(authToken?: string) {
  if (!socket) {
    const base = 'http://localhost:3000';
    socket = io(`${base}/waiter`, {
      transports: ['websocket'],   
      withCredentials: true,  
      auth: authToken ? { token: authToken } : undefined,
    });
    socket.on('connect', () => console.log('[WS waiter] connected', socket?.id));
    socket.on('connect_error', (e) => console.error('[WS waiter] connect_error', e?.message));
  }
  return socket;
}

