import { Socket } from 'socket.io-client';
import { getManagedSocket } from './socketManager';

export function getKitchenSocket(authToken?: string): Socket {
  return getManagedSocket('/kitchen', authToken);
}
