"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { getInventory, adjustStock, deleteProduct } from "@/services/InventoryService";
import type { InventoryItem } from "@/types";
import { AppIcon, IngredientIcon } from "@/components/icons";

interface Props {
  params: Promise<{ category: string }>;
}

export default function InventoryCategoryPage({ params }: Props) {
  const resolvedParams = use(params);
  const categoryName = decodeURIComponent(resolvedParams.category);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    getInventory()
      .then((data) => {
        const catItems =
          categoryName.toLowerCase() === "general"
            ? data
            : data.filter(
                (i) =>
                  (i.category || "").toLowerCase() === categoryName.toLowerCase()
              );
        setItems(catItems.length > 0 ? catItems : data);
        if (catItems.length > 0) {
          setSelectedItem(catItems[0]);
        } else if (data.length > 0) {
          setSelectedItem(data[0]);
        }
      })
      .catch((err) => console.error("Error al obtener productos:", err))
      .finally(() => setLoading(false));
  }, [categoryName]);

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdjust = async (delta: number) => {
    if (!selectedItem) return;
    setUpdating(true);
    try {
      const newQty = await adjustStock(selectedItem, delta);
      const updated = { ...selectedItem, currentQty: newQty };
      setSelectedItem(updated);
      setItems((prev) =>
        prev.map((i) => (i.id === selectedItem.id ? updated : i))
      );
    } catch (err) {
      console.error(err);
      alert("No se pudo actualizar el stock");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    if (!confirm(`¿Eliminar definitivamente "${selectedItem.name}" del catálogo?`)) {
      return;
    }
    setUpdating(true);
    try {
      await deleteProduct(selectedItem.id);
      const remaining = items.filter((i) => i.id !== selectedItem.id);
      setItems(remaining);
      setSelectedItem(remaining[0] ?? null);
      alert("Producto eliminado correctamente");
    } catch (err) {
      console.error(err);
      alert("Error al eliminar producto");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/inventory" className="hover:text-indigo-600 font-medium transition-colors">
            Inventario
          </Link>
          <span>›</span>
          <span className="font-bold text-slate-900 capitalize">{categoryName}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inventory/add-product"
            className="bg-[#14144f] hover:bg-[#202070] text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            <AppIcon name="add" size={14} />
            <span>Nuevo Insumo</span>
          </Link>
          <Link
            href="/inventory"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-4 py-2 rounded-xl transition-colors border border-slate-200"
          >
            ← Volver al Inventario
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Product List */}
        <aside className="w-full md:w-80 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-sm">
          <div className="mb-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en categoría..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex-1 max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
            {loading ? (
              <p className="text-xs text-slate-400 p-4 text-center">Cargando...</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">No hay productos</p>
            ) : (
              filteredItems.map((prod) => {
                const isSelected = selectedItem?.id === prod.id;
                return (
                  <button
                    key={prod.id}
                    onClick={() => setSelectedItem(prod)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                      isSelected
                        ? "bg-indigo-50/80 border-indigo-400 text-indigo-950 shadow-sm"
                        : "bg-white border-slate-150 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <IngredientIcon
                        imageUrl={prod.imageUrl}
                        category={prod.category}
                        name={prod.name}
                        size={12}
                        containerClassName="w-6 h-6 rounded shrink-0"
                      />
                      <div className="font-semibold text-slate-900 truncate flex-1 min-w-0">{prod.name}</div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                      <span>Stock: <strong className="text-slate-700">{prod.currentQty} {prod.unit || "uds"}</strong></span>
                      <span className="font-semibold text-emerald-700">${Number(prod.price || 0).toFixed(2)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm">
          {selectedItem ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-start gap-4">
                  <IngredientIcon
                    imageUrl={selectedItem.imageUrl}
                    category={selectedItem.category}
                    name={selectedItem.name}
                    size={28}
                    containerClassName="w-16 h-16 rounded-2xl shrink-0"
                  />
                  <div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                      {selectedItem.category || "General"}
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 mt-2">
                      {selectedItem.name}
                    </h2>
                    {selectedItem.brand && (
                      <p className="text-sm text-slate-500">Marca: {selectedItem.brand}</p>
                    )}
                    {selectedItem.sku && (
                      <p className="text-xs text-slate-400 mt-0.5">Código / SKU: {selectedItem.sku}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400 font-medium">Existencia actual</div>
                  <div className="text-3xl font-extrabold text-emerald-700">
                    {selectedItem.currentQty}{" "}
                    <span className="text-sm font-normal text-slate-500">
                      {selectedItem.unit || "unidades"}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-1 font-medium">
                    Precio unitario: ${Number(selectedItem.price || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Adjust Stock Controls */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <h4 className="text-xs uppercase tracking-wider font-bold text-slate-600 mb-3">
                  Ajuste Rápido de Existencias
                </h4>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    disabled={updating || selectedItem.currentQty <= 0}
                    onClick={() => handleAdjust(-5)}
                    className="bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 shadow-sm"
                  >
                    -5
                  </button>
                  <button
                    disabled={updating || selectedItem.currentQty <= 0}
                    onClick={() => handleAdjust(-1)}
                    className="bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 shadow-sm"
                  >
                    -1
                  </button>
                  <span className="px-5 py-2 bg-white rounded-xl text-sm font-extrabold text-slate-900 border border-slate-300 shadow-inner">
                    {selectedItem.currentQty}
                  </span>
                  <button
                    disabled={updating}
                    onClick={() => handleAdjust(1)}
                    className="bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 shadow-sm"
                  >
                    +1
                  </button>
                  <button
                    disabled={updating}
                    onClick={() => handleAdjust(5)}
                    className="bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 shadow-sm"
                  >
                    +5
                  </button>
                  <button
                    disabled={updating}
                    onClick={() => handleAdjust(10)}
                    className="bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 shadow-sm"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">
                    Descripción / Notas
                  </h4>
                  <p className="text-sm text-slate-700">{selectedItem.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  disabled={updating}
                  onClick={handleDelete}
                  className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <AppIcon name="delete" size={14} />
                  <span>Eliminar Insumo</span>
                </button>
                <div className="text-xs text-slate-400">
                  ID: {selectedItem.id}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm py-16">
              <AppIcon name="inventory" size={44} className="mb-2 text-slate-300" />
              Selecciona un producto de la lista lateral para visualizar sus detalles.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
