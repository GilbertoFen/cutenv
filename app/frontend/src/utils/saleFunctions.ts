import type { SaleData } from "../types";
import type {BackendSale, SaleItem, SaleOrder} from "../types/index"
export type OrderType = 'local' | 'para llevar' | 'evento' | 'domicilio';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
export function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

// Normaliza a SaleData[]
export function normalizeSalesResponse(json: unknown): SaleData[] {
  const rawList: unknown[] =
    isArray(json) ? json
    : (isRecord(json) && isArray(json.data)) ? json.data
    : (isRecord(json) && isArray(json.results)) ? json.results
    : (json ? [json] : []);

  const toNumber = (n: unknown): number => {
    const x = typeof n === "string" ? Number(n) : (n as number);
    return Number.isFinite(x) ? (x as number) : 0;
  };

  const mapOrder = (o: unknown): SaleOrder => {
    if (!isRecord(o)) return { total: 0, items: [] };
    const itemsRaw = isArray(o.items) ? o.items : [];
    const items: SaleItem[] = itemsRaw
      .map((it) => (isRecord(it) ? it : {}))
      .map((it) => ({
        recipe: String(it.recipe ?? ""),
        quantity: toNumber(it.quantity),
        price: toNumber(it.price),
      }));
    return { total: toNumber(o.total), items };
  };

  return rawList
    .map((r) => (isRecord(r) ? (r as BackendSale) : ({} as BackendSale)))
    .map((s) => {
      const id = s.id ?? s._id ?? "";
      const orders = Array.isArray(s.orders) ? s.orders.map(mapOrder) : [];
      return {
        id: String(id),
        _id: s._id,
        folio: String(s.folio ?? "—"),
        totalAmount: toNumber(s.totalAmount),
        orders,
        orderType: s.orderType as OrderType | undefined,
        paymentMethod: s.paymentMethod as PaymentMethod | undefined,
        status: s.status,
        date: s.date,
        table: s.table, // objeto {number} o string; la UI lo resuelve
      } as SaleData;
    });
}