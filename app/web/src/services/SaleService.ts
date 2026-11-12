import type { SaleData } from "@/types";
import { normalizeSalesResponse } from "@/utils/saleFunctions";
import { apiFetch } from "@/lib/api";

export type OrderType = 'local' | 'para llevar' | 'evento' | 'domicilio';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

export async function getAllSales(): Promise<SaleData[]> {
  const res = await apiFetch("/sales");
  if (!res.ok) throw new Error("Error al obtener ventas");
  const json: unknown = await res.json();
  return normalizeSalesResponse(json);
}

export async function getUnpaidSaleByTable(tableId: string) {
  const url = `/sales/search?table=${encodeURIComponent(tableId)}&status=unpaid`;
  console.debug('[getUnpaidSaleByTable] GET', url);
  const res = await apiFetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GET search failed: ${res.status} ${res.statusText} ${txt}`);
  }
  const data = await res.json();
  console.debug('[getUnpaidSaleByTable] result length:', Array.isArray(data) ? data.length : 'n/a', data?.[0]);
  return Array.isArray(data) ? data[0] ?? null : null;
}

export async function getSaleById(saleId: string) {
  const res = await apiFetch(`/sales/search?_id=${saleId}`);
  if (!res.ok) throw new Error("Error al obtener venta");
  const data = await res.json();
  return data[0];
}

export async function printSale(saleId: string) {
  const saleData = await getSaleById(saleId);
  if (!saleData) throw new Error("Venta no encontrada");

  const printerUrl =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PRINTER_URL) ||
    'http://localhost:5000/print';

  await fetch(printerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ venta: saleData }),
  });
}

export async function paySale(
  saleId: string,
  body: {
    orderType: OrderType;
    paymentMethod: PaymentMethod;
    promotionId?: string;
    discountAmount?: number;
    authorizedBy?: string;
    authReason?: string;
    promotionApplied?: any;
  }
) {
  console.debug('PAYSALE send: ', { saleId, body });

  let res: Response;
  try {
    res = await apiFetch(`/sales/${saleId}/pay`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  } catch (netErr: unknown) {
    console.error('PAYSALE error:', netErr);
    throw new Error('No se pudo contactar al servidor (network/CORS)');
  }

  if (!res.ok) {
    let detail = '';
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await res.json();
        if (typeof j?.message === 'string') detail = j.message;
        else if (Array.isArray(j?.message)) detail = j.message.join(', ');
        else if (j?.error) detail = j.error;
        else detail = JSON.stringify(j);
      } else {
        detail = await res.text();
      }
    } catch {
    }
    const composed = `[${res.status} ${res.statusText}] ${detail || 'Sin mensaje'}`;
    console.error('[paySale] Server error:', composed);
    throw new Error(composed);
  }

  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function requestTicket(saleId: string) {
  const r = await apiFetch(`/sales/${saleId}/request-ticket`, { method: 'POST' });
  if (!r.ok) throw new Error('request-ticket failed');
  return r.json();
}

export async function markPrinted(saleId: string) {
  const r = await apiFetch(`/sales/${saleId}/mark-printed`, { method: 'POST' });
  if (!r.ok) throw new Error('mark-printed failed');
  return r.json();
}

export async function getTicketQueue(status: 'requested' | 'printed' = 'requested') {
  const r = await apiFetch(`/sales/tickets?status=${status}`);
  if (!r.ok) throw new Error('ticket queue failed');
  return r.json();
}

export async function cancelSale(
  saleId: string,
  credentials: { username: string; password: string; reason: string }
) {
  const res = await apiFetch(`/sales/${saleId}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'No se pudo cancelar la cuenta');
  }

  return res.json();
}

export interface CashCutData {
  restaurantName: string;
  date: string;
  dateFormatted: string;
  generatedAt: string;
  generatedAtFormatted: string;
  timezone: string;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalTransactions: number;
    averageTicket: number;
    totalDiscounts: number;
  };
  byPaymentMethod: {
    items: Array<{
      method: string;
      label: string;
      total: number;
      transactionsCount: number;
      percentage: number;
    }>;
    totalRevenue: number;
    totalTransactions: number;
  };
  byOrderType: {
    items: Array<{
      orderType: string;
      label: string;
      total: number;
      ordersCount: number;
      percentage: number;
    }>;
    totalAmount: number;
    totalOrders: number;
  };
  kitchenActivity: {
    coldComandasCount: number;
    hotComandasCount: number;
    ordersWithColdCount: number;
    ordersWithHotCount: number;
    coldDishesCount: number;
    hotDishesCount: number;
    totalComandasCount: number;
    totalOrdersCount: number;
    totalDishesCount: number;
  };
  recentSales: Array<{
    id: string;
    folio: string;
    tableNumber: number | string;
    orderType: string;
    paymentMethod: string;
    status: string;
    totalAmount: number;
    discountAmount: number;
    date: string | Date;
    time: string;
  }>;
}

export async function getCashCutToday(date?: string): Promise<CashCutData> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await apiFetch(`/sales/cash-cut/today${query}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al obtener el corte de caja del día');
  }
  return res.json();
}

export async function downloadCashCutPdf(date?: string): Promise<void> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await apiFetch(`/sales/cash-cut/pdf${query}`);
  if (!res.ok) {
    throw new Error('Error al descargar el PDF de corte de caja');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `corte-de-caja-${date || new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
