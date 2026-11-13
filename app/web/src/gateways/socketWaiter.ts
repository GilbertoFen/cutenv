import { Socket } from 'socket.io-client';
import { getManagedSocket } from './socketManager';

export function getWaiterSocket(authToken?: string): Socket {
  return getManagedSocket('/waiter', authToken);
}
