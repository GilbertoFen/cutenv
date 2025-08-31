import type { SaleData } from "../types";
import { normalizeSalesResponse } from "../utils/saleFunctions";

export type OrderType = 'local' | 'para llevar' | 'evento' | 'domicilio';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

export async function getAllSales(): Promise<SaleData[]> {
  const res = await fetch("/api/sales", { credentials: "include" });
  if (!res.ok) throw new Error("Error al obtener ventas");
  const json: unknown = await res.json();     // ← json tipado como unknown, no any
  return normalizeSalesResponse(json);
}
export async function getUnpaidSaleByTable(tableId: string) {
  const url = `/api/sales/search?table=${encodeURIComponent(tableId)}&status=unpaid`;
  console.debug('[getUnpaidSaleByTable] GET', url);
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GET search failed: ${res.status} ${res.statusText} ${txt}`);
  }
  const data = await res.json();
  console.debug('[getUnpaidSaleByTable] result length:', Array.isArray(data) ? data.length : 'n/a', data?.[0]);
  return Array.isArray(data) ? data[0] ?? null : null;
}


export async function getSaleById(saleId: string) {
  const res = await fetch(`/api/sales/search?_id=${saleId}`);
  const data = await res.json();
  return data[0];
}

// En servidor local de Flask
export async function printSale(saleId: string) {
  const saleData = await getSaleById(saleId);

  if (!saleData) throw new Error("Venta no encontrada");

  await fetch("http://localhost:5000/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ venta: saleData }),
  });
}

export async function paySale(
  saleId: string,
  body: { orderType: OrderType; paymentMethod: PaymentMethod }
) {
  // Log de lo que envías
  console.debug('[paySale] Sending', { saleId, body });

  let res: Response;
  try {
    res = await fetch(`/api/sales/${saleId}/pay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (netErr: unknown) {
    // Error de red/proxy/CORS
    console.error('[paySale] Network error:', netErr);
    throw new Error('No se pudo contactar al servidor (network/CORS)');
  }

  if (!res.ok) {
    // Captura status, statusText y el body (json o texto) para depurar
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
      // si no se pudo leer el body
    }
    const composed = `[${res.status} ${res.statusText}] ${detail || 'Sin mensaje'}`;
    console.error('[paySale] Server error:', composed);
    throw new Error(composed);
  }

  // intenta parsear JSON, si no hay body devuelve objeto vacío
  try {
    return await res.json();
  } catch {
    return {};
  }
}