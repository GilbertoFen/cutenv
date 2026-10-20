import { apiFetch } from "@/lib/api";
import type { BarcodeLookupResponse } from "@/types";

export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResponse> {
  const cleanCode = String(barcode || "").trim();
  if (!cleanCode) {
    throw new Error("El código de barras no puede estar vacío");
  }

  const res = await apiFetch("/products/barcode/lookup", {
    method: "POST",
    body: JSON.stringify({ barcode: cleanCode }),
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
  const res = await apiFetch(`/products/${productId}/stock-entry`, {
    method: "POST",
    body: JSON.stringify({ quantity, notes, reference }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Error al registrar la entrada de mercancía");
  }

  return await res.json();
}

export async function getStockMovements(productId?: string) {
  const url = productId
    ? `/products/movements/all?productId=${productId}`
    : "/products/movements/all";

  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Error al consultar movimientos");
  return await res.json();
}
