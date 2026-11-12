import type { Order, UpdateOrderItem } from "@/types";
import { apiFetch } from "@/lib/api";

export const getOrdersByTable = async (tableId: string): Promise<Order[]> => {
  const response = await apiFetch(`/orders/active/table/${tableId}`);
  if (!response.ok) {
    throw new Error("No se pudieron obtener las órdenes");
  }
  return await response.json();
};

export const getAllOrders = async (): Promise<Order[]> => {
  const response = await apiFetch(`/orders`);
  if (!response.ok) {
    throw new Error("No se pudieron obtener las órdenes");
  }
  return await response.json();
};

export const getPreparingOrders = async () => {
  const res = await apiFetch("/orders/search?status=preparing");
  if (!res.ok) throw new Error("Error al obtener órdenes en preparación");
  return res.json();
};

export const markReadyOrders = async (orderId: string) => {
  const res = await apiFetch(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "ready" }),
  });
  if (!res.ok) throw new Error("Error al marcar orden como lista");
  return res.json();
};

export const updateOrderStatus = async (id: string, status: string): Promise<void> => {
  const res = await apiFetch(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Error al actualizar estado de la orden");
};

export const cancelOrder = async (orderId: string): Promise<any> => {
  const res = await apiFetch(`/orders/${orderId}/cancel`, {
    method: "PATCH",
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Error al cancelar la orden");
  }
  return res.json().catch(() => ({}));
};

export async function updateOrder(orderId: string, items: UpdateOrderItem[], notes?: string) {
  const response = await apiFetch(`/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({ items, notes }),
  });

  if (!response.ok) {
    throw new Error("Error al actualizar la orden");
  }
}

interface CreateOrderDto {
  table: string;
  items: { recipe: string; quantity: number }[];
  notes?: string;
}

export const createOrder = async (data: CreateOrderDto): Promise<any> => {
  const res = await apiFetch("/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear orden");
  return res.json().catch(() => ({}));
};

export interface StockWarning {
  recipeId: string;
  recipeName: string;
  ingredientName: string;
  required: number;
  available: number;
  unit: string;
}

export const checkOrderStock = async (
  items: { recipe: string; quantity: number }[]
): Promise<{ available: boolean; warnings: StockWarning[] }> => {
  try {
    const res = await apiFetch("/orders/check-stock", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
    if (!res.ok) return { available: true, warnings: [] };
    return await res.json();
  } catch {
    return { available: true, warnings: [] };
  }
};

export const updateOrderItemStatus = async (
  orderId: string,
  itemId: string,
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
): Promise<void> => {
  const res = await apiFetch(`/orders/${orderId}/items/${itemId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Error al actualizar estado del platillo");
};

export const callWaiterForDish = async (
  orderId: string,
  itemId: string,
  data: { reason: 'ready' | 'unavailable' | 'issue' | 'other'; message?: string }
): Promise<any> => {
  const res = await apiFetch(`/orders/${orderId}/items/${itemId}/call-waiter`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al notificar al mesero");
  return res.json().catch(() => ({}));
};

export const dismissWaiterCall = async (
  orderId: string,
  itemId: string
): Promise<any> => {
  const res = await apiFetch(`/orders/${orderId}/items/${itemId}/dismiss-call`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Error al descartar llamado");
  return res.json().catch(() => ({}));
};
