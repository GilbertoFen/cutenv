import type { Order, UpdateOrderItem } from "@/types";
import { getApiUrl } from "@/lib/config";

export const getOrdersByTable = async (tableId: string): Promise<Order[]> => {
  const response = await fetch(getApiUrl(`/orders/active/table/${tableId}`));
  if (!response.ok) {
    throw new Error("No se pudieron obtener las órdenes");
  }
  return await response.json();
};

export const getPreparingOrders = async () => {
  const res = await fetch(getApiUrl("/orders/search?status=preparing"));
  if (!res.ok) throw new Error("Error al obtener órdenes en preparación");
  return res.json();
};

export const markReadyOrders = async (orderId: string) => {
  const res = await fetch(getApiUrl(`/orders/${orderId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ready" }),
  });
  if (!res.ok) throw new Error("Error al marcar orden como lista");
  return res.json();
};

export const updateOrderStatus = async (id: string, status: string): Promise<void> => {
  const res = await fetch(getApiUrl(`/orders/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Error al actualizar estado de la orden");
};

export async function updateOrder(orderId: string, items: UpdateOrderItem[], notes?: string) {
  const response = await fetch(getApiUrl(`/orders/${orderId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
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

export const createOrder = async (data: CreateOrderDto): Promise<void> => {
  const res = await fetch(getApiUrl("/orders"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear orden");
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
    const res = await fetch(getApiUrl("/orders/check-stock"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  status: 'preparing' | 'ready' | 'delivered' | 'cancelled'
): Promise<void> => {
  const res = await fetch(getApiUrl(`/orders/${orderId}/items/${itemId}/status`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Error al actualizar estado del platillo");
};
