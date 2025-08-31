import { useEffect, useRef, useState } from 'react';
import type { Order } from '../types';
import { getPreparingOrders } from '../services/OrderService';
import { getKitchenSocket } from '../gateways/socket';

export function useKitchenOrders(authToken?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const joinedRef = useRef(false);

  useEffect(() => {
    // 1) cargar estado inicial vía REST (solo una vez)
    getPreparingOrders().then((data) => {
      // asegurar que solo 'preparing' se muestre
      setOrders(Array.isArray(data) ? data.filter(o => o.status === 'preparing') : []);
    });

    // 2) conectar socket y escuchar eventos
    const socket = getKitchenSocket(authToken);

    const onCreated = (o: Order) => {
      if (o.status !== 'preparing') return;
      setOrders((prev) => (prev.some(x => x.id === o.id) ? prev : [o, ...prev]));
    };

    const onUpdated = (o: Order) => {
      setOrders((prev) => {
        // si la orden ya no está en preparing, quítala
        if (o.status !== 'preparing') return prev.filter(x => x.id !== o.id);
        // si sigue en preparing, reemplázala
        const i = prev.findIndex(x => x.id === o.id);
        if (i === -1) return [o, ...prev];
        const clone = prev.slice();
        clone[i] = o;
        return clone;
      });
    };

    const onStatusChanged = ({ id, status }: { id: string; status: string }) => {
      if (status !== 'preparing') {
        // si cambió a 'ready' o cualquier otro, la sacamos
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

    // Unirse a la "sala" (opcional)
    if (!joinedRef.current) {
      socket.emit('joinKitchen', { restaurantId: null }); // o tu id real si lo tienes
      joinedRef.current = true;
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
