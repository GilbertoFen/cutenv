"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getInventory } from "@/services/InventoryService";
import type { InventoryItem } from "@/types";
import BarcodeScannerModal from "@/components/Inventory/BarcodeScannerModal";
import { AppIcon, IngredientIcon, CategoryIcon } from "@/components/icons";

const defaultCategories = [
  "Lácteos",
  "Verduras",
  "Carnes",
  "Bebidas",
  "Pastas",
  "Panadería",
  "Abarrotes",
  "Limpieza",
];

export default function InventoryPage() {
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  const loadInventory = useCallback(() => {
    setLoading(true);
    getInventory()
      .then((data) => {
        setItems(data);
        const dynamicCats = Array.from(
          new Set(
            data
              .map((d) => d.category)
              .filter((c): c is string => Boolean(c && c.trim()))
          )
        );
        if (dynamicCats.length > 0) {
          setCategories(Array.from(new Set([...defaultCategories, ...dynamicCats])));
        }
      })
      .catch((err) => console.error("Error al cargar inventario:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const displayedItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(search.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(search.toLowerCase()));

    const matchesCat = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AppIcon name="inventory" size={26} className="text-indigo-900" />
            <span>Control de Inventario</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administración centralizada de insumos, materias primas y existencias del restaurante
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBarcodeModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2"
            title="Escanear producto con lector físico o cámara"
          >
            <AppIcon name="scan" size={16} />
            <span>Escanear Código</span>
          </button>
          <Link
            href="/inventory/add-product"
            className="bg-[#14144f] hover:bg-[#202070] text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2"
          >
            <AppIcon name="add" size={16} />
            <span>Registrar Producto</span>
          </Link>
          <Link
            href="/manager"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors border border-slate-200"
          >
            Volver a Gerencia
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[280px]">
          <label className="block text-xs uppercase font-semibold text-slate-500 mb-1.5">
            Búsqueda de insumos y productos
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <AppIcon name="search" size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, marca o código..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              selectedCategory === null
                ? "bg-[#14144f] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            Ver Todas las Categorías ({items.length})
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div>
        <h2 className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-3">
          Categorías Disponibles
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredCategories.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? null : cat)}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  isSelected
                    ? "bg-indigo-50 border-indigo-400 text-indigo-950 shadow-sm ring-2 ring-indigo-500/20"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"}`}>
                  <CategoryIcon category={cat} type="ingredient" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{cat}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{count} producto{count === 1 ? "" : "s"}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base">
            {selectedCategory
              ? `Productos en "${selectedCategory}"`
              : "Catálogo General de Inventario"}
            <span className="ml-2 text-xs text-slate-500 font-normal">
              ({displayedItems.length} encontrado{displayedItems.length === 1 ? "" : "s"})
            </span>
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Cargando catálogo de productos...
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No se encontraron insumos o productos con los criterios seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Insumo / Producto</th>
                  <th className="px-6 py-3">Categoría</th>
                  <th className="px-6 py-3">Existencia</th>
                  <th className="px-6 py-3">Precio Unitario</th>
                  <th className="px-6 py-3 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedItems.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <IngredientIcon
                          imageUrl={prod.imageUrl}
                          category={prod.category}
                          name={prod.name}
                          size={16}
                          containerClassName="w-9 h-9 rounded-lg shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 block truncate">{prod.name}</span>
                          {prod.brand && (
                            <span className="block text-xs text-slate-400 font-normal truncate">
                              {prod.brand}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {prod.category || "General"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-emerald-700">
                      {prod.currentQty} {prod.unit || "uds"}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 font-medium">
                      ${Number(prod.price || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/inventory/${encodeURIComponent(prod.category || "general")}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Gestionar →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BarcodeScannerModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        onProductCreated={loadInventory}
        onStockUpdated={loadInventory}
      />
    </div>
  );
}
