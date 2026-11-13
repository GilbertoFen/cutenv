import { useEffect } from 'react';
import { getTablesSocket } from '@/gateways/tableSocket';

export function useTableRealtime(tableId: string, onStatusChange: (p: any) => void) {
  useEffect(() => {
    if (!tableId) return;
    const socket = getTablesSocket();

    const join = () => {
      socket.emit('joinTable', { tableId });
    };

    if (socket.connected) {
      join();
    }
    socket.on('connect', join);

    const handler = (p: any) => {
      if (p.tableId === tableId) onStatusChange(p);
    };

    socket.on('table.status.changed', handler);
    return () => {
      socket.off('connect', join);
      socket.off('table.status.changed', handler);
    };
  }, [tableId, onStatusChange]);
}
