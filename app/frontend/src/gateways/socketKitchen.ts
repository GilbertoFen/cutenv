import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getKitchenSocket(authToken?: string) {
  if (!socket) {
    socket = io(`http://localhost:3000/kitchen`, {
      transports: ['websocket'],
      withCredentials: true,
      auth: authToken ? { token: authToken } : undefined,
    });
  }
  return socket;
}
