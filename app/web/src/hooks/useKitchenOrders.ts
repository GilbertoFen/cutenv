import { useEffect, useState } from 'react';
import type { Order } from '@/types';
import { getPreparingOrders } from '@/services/OrderService';
import { getKitchenSocket } from '@/gateways/socketKitchen';
import { isTicketACocinaEnabled, printKitchenOrderToLocalAgent } from '@/services/PrinterService';

const getOrderId = (o: any): string => String(o?.id || o?._id || '');

export function useKitchenOrders(authToken?: string) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    getPreparingOrders().then((data) => {
      if (Array.isArray(data)) {
        const preparing = data
          .filter((o) => o.status === 'preparing')
          .map((o) => ({ ...o, id: getOrderId(o) }));
        setOrders(preparing);
      } else {
        setOrders([]);
      }
    });

    const socket = getKitchenSocket(authToken);

    const joinRoom = () => {
      socket.emit('joinKitchen', { restaurantId: null });
    };

    if (socket.connected) {
      joinRoom();
    }
    socket.on('connect', joinRoom);

    const onCreated = (o: Order) => {
      if (o.status !== 'preparing') return;
      const oId = getOrderId(o);
      const normalizedOrder = { ...o, id: oId };
      setOrders((prev) => (prev.some((x) => getOrderId(x) === oId) ? prev : [normalizedOrder, ...prev]));

      // Impresión automática silenciosa en cocina si TICKET_A_COCINA=TRUE
      if (isTicketACocinaEnabled()) {
        printKitchenOrderToLocalAgent(normalizedOrder).catch((err) =>
          console.warn('[useKitchenOrders] Fallo silencioso en auto-print de cocina:', err)
        );
      }
    };

    const onUpdated = (o: Order) => {
      const oId = getOrderId(o);
      const normalizedOrder = { ...o, id: oId };
      setOrders((prev) => {
        if (o.status !== 'preparing') return prev.filter((x) => getOrderId(x) !== oId);
        const i = prev.findIndex((x) => getOrderId(x) === oId);
        if (i === -1) return [normalizedOrder, ...prev];
        const clone = prev.slice();
        clone[i] = normalizedOrder;
        return clone;
      });
    };

    const onStatusChanged = ({ id, status }: { id: string; status: string }) => {
      if (status !== 'preparing') {
        setOrders((prev) => prev.filter((x) => getOrderId(x) !== id));
      }
    };

    const onDeleted = ({ id }: { id: string }) => {
      setOrders((prev) => prev.filter((x) => getOrderId(x) !== id));
    };

    socket.on('order.created', onCreated);
    socket.on('order.updated', onUpdated);
    socket.on('order.status.changed', onStatusChanged);
    socket.on('order.deleted', onDeleted);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('order.created', onCreated);
      socket.off('order.updated', onUpdated);
      socket.off('order.status.changed', onStatusChanged);
      socket.off('order.deleted', onDeleted);
    };
  }, [authToken]);

  return { orders, setOrders };
}
