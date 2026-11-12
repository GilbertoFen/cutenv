'use client';

import React, { useState, useMemo } from 'react';
import type { InventoryItem } from '@/types';
import { AppIcon, IngredientIcon } from '@/components/icons';
import { useNotification } from '@/context/NotificationContext';

interface Props {
  isOpen: boolean;
  inventory: InventoryItem[];
  onClose: () => void;
  onAdd: (ingredient: {
    ingredientId: string;
    name: string;
    quantity: number;
    unitMesure: string;
    stockAvailable?: number;
  }) => void;
}

export default function RecipeIngredientPickerModal({
  isOpen,
  inventory,
  onClose,
  onAdd,
}: Props) {
  const { notify } = useNotification();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  // Dosificación del ingrediente
  const [quantity, setQuantity] = useState<string>('1');
  const [unitMesure, setUnitMesure] = useState<string>('kg');

  const categories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((i) => i.category && set.add(i.category));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [inventory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory.filter((item) => {
      if (selectedCategory !== 'all' && (item.category ?? '') !== selectedCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q))
      );
    });
  }, [inventory, search, selectedCategory]);

  if (!isOpen) return null;

  const handleSelectProduct = (product: InventoryItem) => {
    setSelectedProduct(product);
    const prodUnit = (product.unit || 'pza').toLowerCase();
    if (prodUnit === 'kg' || prodUnit === 'g' || prodUnit === 'kilos') {
      setUnitMesure('g');
      setQuantity('100');
    } else if (prodUnit === 'l' || prodUnit === 'lt' || prodUnit === 'ml') {
      setUnitMesure('ml');
      setQuantity('50');
    } else {
      setUnitMesure(product.unit || 'pza');
      setQuantity('1');
    }
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const numQty = parseFloat(quantity);
    if (!Number.isFinite(numQty) || numQty <= 0) {
      notify.warning('Por favor ingrese una cantidad o porcentaje válido mayor a 0');
      return;
    }

    onAdd({
      ingredientId: selectedProduct.id,
      name: selectedProduct.name,
      quantity: numQty,
      unitMesure: unitMesure.trim() || selectedProduct.unit || 'pza',
      stockAvailable: selectedProduct.currentQty,
    });

    setSelectedProduct(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-[#14144f] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/50 flex items-center justify-center">
              <AppIcon name="ingredients" size={18} className="text-indigo-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Vincular Insumo del Inventario a la Receta</h3>
              <p className="text-[11px] text-indigo-200">
                Seleccione el insumo para descontar automáticamente existencias al preparar y vender esta receta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Cerrar modal"
          >
            <AppIcon name="close" size={16} />
          </button>
        </div>

        {/* Search and filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <AppIcon name="search" size={14} />
            </span>
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar insumo por nombre, marca, categoría o código..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Filtrar:</span>
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat === 'all' ? 'Todos los insumos' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content: Insumos List + Selected Dosage Panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedProduct ? (
            /* Panel de configuración de dosificación para el producto seleccionado */
            <form onSubmit={handleConfirm} className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                <div className="flex items-center gap-3">
                  <IngredientIcon
                    category={selectedProduct.category}
                    name={selectedProduct.name}
                    size={22}
                    containerClassName="w-10 h-10 rounded-lg shrink-0"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{selectedProduct.name}</h4>
                    <p className="text-xs text-slate-500">
                      Marca: {selectedProduct.brand || 'Genérica'} · Categoría: {selectedProduct.category || 'General'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Existencia: {selectedProduct.currentQty} {selectedProduct.unit || 'pza'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cantidad aproximada o porción necesaria por cada receta:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Ej: 0.25, 100, 1"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['0.1', '0.25', '0.5', '1', '50', '100', '200'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setQuantity(val)}
                          className="px-2 py-0.5 rounded text-[10px] bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 font-medium"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <select
                      value={unitMesure}
                      onChange={(e) => setUnitMesure(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="g">Gramos (g)</option>
                      <option value="l">Litros (lt / l)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="pza">Piezas / Unidades (pza)</option>
                      <option value="oz">Onzas (oz)</option>
                      <option value="porcion">Porción</option>
                      <option value="cda">Cucharada</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Unidad base del almacén: <strong className="text-slate-600">{selectedProduct.unit || 'pza'}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-indigo-100 text-xs text-indigo-900 flex items-center gap-2">
                <AppIcon name="kpis" size={15} className="text-indigo-600 shrink-0" />
                <span>
                  Cada platillo vendido descontará automáticamente <strong>{quantity} {unitMesure}</strong> de existencias.
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  ← Cambiar Insumo
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  <AppIcon name="check" size={14} />
                  <span>Asignar a la Receta</span>
                </button>
              </div>
            </form>
          ) : (
            /* Lista de insumos para seleccionar */
            <div>
              <p className="text-xs text-slate-500 mb-2">
                Haga clic en el insumo que forma parte de este platillo:
              </p>

              {filtered.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-xl text-slate-400 text-xs">
                  No se encontraron insumos con el filtro actual.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectProduct(item)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <IngredientIcon
                          category={item.category}
                          name={item.name}
                          size={18}
                          containerClassName="w-8 h-8 rounded-lg shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-slate-900 truncate block group-hover:text-indigo-950">
                            {item.name}
                          </span>
                          <p className="text-[11px] text-slate-500 truncate">
                            {item.brand ? `${item.brand} · ` : ''}{item.category || 'General'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.currentQty > 0
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {item.currentQty} {item.unit || 'pza'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500">
            {inventory.length} insumos registrados en inventario
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
