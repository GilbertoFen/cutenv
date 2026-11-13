import { Socket } from 'socket.io-client';
import { getManagedSocket } from './socketManager';

export function getTablesSocket(): Socket {
  return getManagedSocket('/tables');
}
