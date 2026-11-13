import { Socket } from 'socket.io-client';
import { getManagedSocket } from './socketManager';

export function getCashierSocket(): Socket {
  return getManagedSocket('/cashier');
}
