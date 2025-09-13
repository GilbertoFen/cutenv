import { useEffect, useRef, useState } from 'react';
import type { Order } from '../types';
import { getPreparingOrders } from '../services/OrderService';
import { getKitchenSocket } from '../gateways/socketKitchen';

export function useKitchenOrders(authToken?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const joined = useRef(false);

  useEffect(() => {
    getPreparingOrders().then((data) => {
      setOrders(Array.isArray(data) ? data.filter(o => o.status === 'preparing') : []);
    });

    const socket = getKitchenSocket(authToken);

    const onCreated = (o: Order) => {
      if (o.status !== 'preparing') return;
      setOrders((prev) => (prev.some(x => x.id === o.id) ? prev : [o, ...prev]));
    };

    const onUpdated = (o: Order) => {
      setOrders((prev) => {
        if (o.status !== 'preparing') return prev.filter(x => x.id !== o.id);
        const i = prev.findIndex(x => x.id === o.id);
        if (i === -1) return [o, ...prev];
        const clone = prev.slice();
        clone[i] = o;
        return clone;
      });
    };

    const onStatusChanged = ({ id, status }: { id: string; status: string }) => {
      if (status !== 'preparing') {
        setOrders(prev => prev.filter(x => x.id !== id));
      }
    };

    const onDeleted = ({ id }: { id: string }) => {
      setOrders(prev => prev.filter(x => x.id !== id));
    };

    socket.on('order.created', onCreated);
    socket.on('order.updated', onUpdated);
    socket.on('order.status.changed', onStatusChanged);
    socket.on('order.deleted', onDeleted);

    if (!joined.current) {
      socket.emit('joinKitchen', { restaurantId: null }); 
    }

    return () => {
      socket.off('order.created', onCreated);
      socket.off('order.updated', onUpdated);
      socket.off('order.status.changed', onStatusChanged);
      socket.off('order.deleted', onDeleted);
    };
  }, [authToken]);

  return { orders, setOrders };
}
