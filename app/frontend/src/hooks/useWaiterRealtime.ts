import { useEffect, useState } from 'react';
import { getWaiterSocket } from '../gateways/socketWaiter';
import type { Order } from '../types';

export function useWaiterRealtime() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const socket = getWaiterSocket();

    const onOrderCreated = (o: Order) => {
      setOrders(prev => (prev.some(x => x.id === o.id) ? prev : [o, ...prev]));
    };

    const onOrderUpdated = (o: Order) => {
      setOrders(prev => {
        const i = prev.findIndex(x => x.id === o.id);
        if (i === -1) return [o, ...prev];
        const next = prev.slice();
        next[i] = o;
        return next;
      });
    };

    const onStatusChanged = (p: { id: string; status: string }) => {
      setNotifications(n => [{ type: 'status', ...p, at: Date.now() }, ...n]);
      if (p.status !== 'preparing') {
        setOrders(prev => prev.filter(x => x.id !== p.id));
      }
    };

    socket.on('order.created', onOrderCreated);
    socket.on('order.updated', onOrderUpdated);
    socket.on('order.status.changed', onStatusChanged);
  
    return () => {
      socket.off('order.created', onOrderCreated);
      socket.off('order.updated', onOrderUpdated);
      socket.off('order.status.changed', onStatusChanged);
    };
  }, []);

  return { orders, notifications, setOrders };
}
