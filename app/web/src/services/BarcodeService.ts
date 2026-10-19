import { getApiUrl } from "@/lib/config";
import type { BarcodeLookupResponse } from "@/types";

export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResponse> {
  const cleanCode = String(barcode || "").trim();
  if (!cleanCode) {
    throw new Error("El código de barras no puede estar vacío");
  }

  const res = await fetch(getApiUrl("/products/barcode/lookup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ barcode: cleanCode }),
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Error al consultar el código (${res.status})`);
  }

  return await res.json();
}

export async function registerStockEntry(
  productId: string,
  quantity: number,
  notes?: string,
  reference?: string
) {
  const res = await fetch(getApiUrl(`/products/${productId}/stock-entry`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity, notes, reference }),
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Error al registrar la entrada de mercancía");
  }

  return await res.json();
}

export async function getStockMovements(productId?: string) {
  const url = productId
    ? getApiUrl(`/products/movements/all?productId=${productId}`)
    : getApiUrl("/products/movements/all");

  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Error al consultar movimientos");
  return await res.json();
}
