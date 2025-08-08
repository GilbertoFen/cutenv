import type { Order } from '../types/index';
import type { UpdateOrderItem } from '../types/index';
const API = '/api/orders';

export const getOrdersByTable = async (tableId: string): Promise<Order[]> => {
  const response = await fetch(`/api/orders/active/table/${tableId}`);
  if (!response.ok) {
    throw new Error('No se pudieron obtener las órdenes');
  }
  return await response.json();
};

export const getPreparingOrders = async ()=>{
  const res = await fetch(`${API}/search?status=preparing`)
  return res.json();
}

export const markReadyOrders = async(orderId: string) =>{
  const res = await fetch(`${API}/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type' : 'application/json'},
    body: JSON.stringify({status: 'ready'}

  )});
  return res.json();

}

export const updateOrderStatus = async (id: string, status: string): Promise<void> => {
  await fetch(`${API}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
};

export async function updateOrder(orderId: string, items: UpdateOrderItem[], notes?:string) {
  const response = await fetch(`/api/orders/${orderId}`, {
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
  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};
