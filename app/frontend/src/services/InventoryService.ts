import type { InventoryItem } from "../types";

export async function getInventory(): Promise<InventoryItem[]> {
  const res = await fetch("/api/products", { credentials: "include" });
  if (!res.ok) throw new Error("Error al obtener inventario");
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((r: any): InventoryItem => ({
    id: String(r.id ?? r._id),
    name: String(r.name ?? "—"),
    brand: r.brand ?? undefined,
    price: typeof r.price === "number" ? r.price : Number(r.price ?? 0),
    sku: r.barCode != null ? String(r.barCode) : undefined,
    category: r.category ?? undefined,
    unit: r.unitMesure ?? undefined,
    description: r.description ?? undefined,
    currentQty: Number.isFinite(+r.stock) ? +r.stock : 0,
    packageQty: Number.isFinite(+r.quantity) ? +r.quantity : undefined,
    lastUpdate: r.updatedAt ?? r.updateAt ?? r.lastUpdate ?? undefined,
  }));
}

export async function updateProductStock(productId: string, newStock: number) {
  const res = await fetch(`/api/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stock: newStock }),
    credentials: "include",
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`No se pudo actualizar el stock: ${res.status} ${msg}`);
  }
  return res.json().catch(() => ({}));
}

export async function adjustStock(product: InventoryItem, delta: number) {
  const target = Math.max(0, (product.currentQty ?? 0) + delta);
  await updateProductStock(product.id, target);
  return target;
}
