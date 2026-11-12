'use client';

import { useEffect, useMemo, useState } from "react";
import { getAllRecipes } from "@/services/RecipeService";
import { createOrder, checkOrderStock, type StockWarning } from "@/services/OrderService";
import { printKitchenOrderToLocalAgent } from "@/services/PrinterService";
import type { Recipe, AddOrderModalProps, SelectedItem } from "@/types";
import { AppIcon, RecipeIcon } from "@/components/icons";
import { useNotification } from "@/context/NotificationContext";

export default function AddOrderModal({
  tableId,
  onClose,
  onRefresh,
}: AddOrderModalProps) {
  const { notify } = useNotification();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState("");
  const [stockWarnings, setStockWarnings] = useState<StockWarning[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showMobileTicket, setShowMobileTicket] = useState(false);

  useEffect(() => {
    getAllRecipes().then(setRecipes);
  }, []);

  useEffect(() => {
    if (selectedItems.length === 0) {
      setStockWarnings([]);
      return;
    }
    const payload = selectedItems.map((it) => ({ recipe: it.recipe.id, quantity: it.quantity }));
    checkOrderStock(payload).then((res) => {
      setStockWarnings(res.warnings || []);
    });
  }, [selectedItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [recipes]);

  const addItem = (recipe: Recipe) => {
    if (!recipe.id) {
      console.warn("No se encontró el id de la receta", recipe);
      return;
    }
    setSelectedItems((prev) => {
      const i = prev.findIndex((x) => x.recipe.id === recipe.id);
      if (i !== -1) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [...prev, { recipe, quantity: 1 }];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((item, i) => {
          if (i !== index) return item;
          const nextQty = item.quantity + delta;
          return nextQty > 0 ? { ...item, quantity: nextQty } : null;
        })
        .filter(Boolean) as SelectedItem[]
    );
  };

  const removeItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const total = selectedItems.reduce(
    (sum, item) => sum + item.recipe.price * item.quantity,
    0
  );

  const totalItemsCount = selectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const sendOrder = async () => {
    if (selectedItems.length === 0 || submitting) return;
    try {
      setSubmitting(true);
      const items = selectedItems.map((i) => ({
        recipe: i.recipe.id,
        quantity: i.quantity,
      }));
      const created = await createOrder({ table: tableId, items, notes });

      // Impresión automática e invisible en cocina (si TICKET_A_COCINA=TRUE)
      try {
        const orderPayload = {
          id: created?.id || created?._id || undefined,
          table: tableId,
          tableNumber: created?.tableNumber || created?.table?.number || undefined,
          notes,
          recipes: selectedItems.map((it) => ({
            name: it.recipe.name,
            quantity: it.quantity,
            notes: (it as any).notes || '',
            station: it.recipe.station || (it.recipe.category?.toLowerCase() === 'bebidas' ? 'ninguna' : 'ninguna'),
          })),
          createdAt: new Date().toISOString(),
        };
        printKitchenOrderToLocalAgent(orderPayload).catch((e) =>
          console.warn('[AddOrderModal] Auto-print comanda error:', e)
        );
      } catch (printErr) {
        console.warn('[AddOrderModal] Fallo silencioso al preparar comanda:', printErr);
      }

      notify.success("Comanda enviada a cocina exitosamente.");
      onRefresh();
      onClose();
    } catch (err: any) {
      notify.error(err?.message || "Error al enviar la orden a cocina");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchCat = !activeCategory || r.category?.toLowerCase() === activeCategory.toLowerCase();
      const matchQuery = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [recipes, activeCategory, searchQuery]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Main Container */}
      <div className="relative w-full h-full sm:h-[92vh] sm:max-w-7xl sm:rounded-3xl bg-slate-50 text-slate-900 shadow-soft-xl border border-slate-200/80 flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 shadow-soft-xs z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
              <AppIcon name="waiter" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Toma de Comanda
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Mesa {tableId ? tableId.slice(-4) : "—"}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Selecciona los platillos para enviarlos directamente al monitor de cocina
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Ticket toggle button */}
            <button
              onClick={() => setShowMobileTicket(!showMobileTicket)}
              className="lg:hidden relative min-h-[44px] px-3.5 py-2 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-2 active:scale-95 transition"
            >
              <AppIcon name="orders" size={16} />
              <span>Ver Ticket ({totalItemsCount})</span>
              {totalItemsCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>

            {/* Close button with large touch target */}
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 inline-flex items-center justify-center transition-colors active:scale-95"
              aria-label="Cerrar modal"
              title="Cerrar modal"
            >
              <AppIcon name="close" size={18} />
            </button>
          </div>
        </header>

        {/* Workspace Body: 2 Columns on Desktop */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          
          {/* LEFT: Product Catalog & Category Filters (60-65% width) */}
          <main className="flex-1 flex flex-col min-w-0 bg-slate-50 p-4 sm:p-5 overflow-hidden">
            
            {/* Search and Category Pills Bar */}
            <div className="space-y-3 mb-4 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar platillo o bebida por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[46px] pl-11 pr-4 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-soft-xs"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  🔍
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Pills Slider */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`min-h-[42px] px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 active:scale-95 ${
                    activeCategory === null
                      ? "bg-slate-900 text-white shadow-soft-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>Todos los platillos</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    activeCategory === null ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {recipes.length}
                  </span>
                </button>

                {categories.map((cat) => {
                  const isCurrent = activeCategory?.toLowerCase() === cat.toLowerCase();
                  const count = recipes.filter((r) => r.category?.toLowerCase() === cat.toLowerCase()).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`min-h-[42px] px-4 py-2 rounded-2xl text-xs font-bold capitalize whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 active:scale-95 ${
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-soft-sm shadow-indigo-600/20"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isCurrent ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {filteredRecipes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-dashed border-slate-300">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                    🍽️
                  </div>
                  <h3 className="text-base font-bold text-slate-700">No se encontraron productos</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Intenta cambiar la categoría o limpiar el término de búsqueda para ver más recetas disponibles.
                  </p>
                  {(searchQuery || activeCategory) && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setActiveCategory(null);
                      }}
                      className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
                    >
                      Restablecer filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                  {filteredRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-soft-xs hover:shadow-soft-md hover:border-indigo-300/80 transition-all flex flex-col justify-between group"
                    >
                      {/* Image / Icon container */}
                      <div className="relative mb-3">
                        <RecipeIcon
                          imageUrl={recipe.imageUrl}
                          category={recipe.category}
                          name={recipe.name}
                          size={44}
                          containerClassName="w-full h-32 sm:h-36 rounded-xl overflow-hidden bg-slate-100 group-hover:scale-[1.01] transition-transform duration-200"
                        />
                        {recipe.category && (
                          <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                            {recipe.category}
                          </span>
                        )}
                      </div>

                      {/* Info & Price */}
                      <div className="mb-3">
                        <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
                          {recipe.name}
                        </h4>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-xs font-semibold text-slate-400">Precio:</span>
                          <span className="text-lg font-black text-emerald-600">
                            ${Number(recipe.price || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Large prominent Add to Order button (Touch target 46px) */}
                      <button
                        onClick={() => addItem(recipe)}
                        className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-sm shadow-soft-xs hover:shadow-soft-sm transition-all flex items-center justify-center gap-2"
                        title={`Agregar ${recipe.name} a la orden`}
                      >
                        <span className="text-base font-black">+</span>
                        <span>Agregar</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* RIGHT: Modern Clean Soft Ticket & Order Details (35-40% width) */}
          <aside
            className={`
              w-full lg:w-[420px] xl:w-[460px] bg-white border-l border-slate-200 flex flex-col justify-between shrink-0 z-30 transition-all
              ${showMobileTicket ? "fixed inset-0 z-50 flex" : "hidden lg:flex"}
            `}
          >
            {/* Ticket Header */}
            <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                  <AppIcon name="receipt" size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Detalle del Pedido</h3>
                  <p className="text-[11px] text-slate-500">
                    {totalItemsCount} {totalItemsCount === 1 ? "artículo" : "artículos"} seleccionados
                  </p>
                </div>
              </div>

              {/* Mobile Back / Hide ticket */}
              <button
                onClick={() => setShowMobileTicket(false)}
                className="lg:hidden px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                ← Volver al Menú
              </button>
            </div>

            {/* Ticket Body: Scrollable items */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/50">
              
              {/* Stock Insufficient Warning Box */}
              {stockWarnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-1 shadow-soft-xs">
                  <div className="font-bold flex items-center gap-1.5 text-xs text-amber-800">
                    <AppIcon name="warning" size={15} className="text-amber-600 shrink-0" />
                    <span>Insumos ajustados en inventario:</span>
                  </div>
                  <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-amber-800">
                    {stockWarnings.map((w, i) => (
                      <li key={i}>
                        <strong>{w.recipeName}:</strong> Falta <em>{w.ingredientName}</em> ({w.required} req. / {w.available} disp. {w.unit})
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-amber-900 font-medium pt-0.5">
                    Verifica con cocina antes de confirmar para evitar retrasos.
                  </p>
                </div>
              )}

              {/* Items List */}
              {selectedItems.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
                    🧾
                  </div>
                  <p className="text-sm font-bold text-slate-700">El pedido está vacío</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Toca en <strong>Agregar</strong> sobre cualquier platillo del catálogo para añadirlo al ticket.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedItems.map((item, index) => {
                    const itemSubtotal = item.recipe.price * item.quantity;
                    return (
                      <div
                        key={item.recipe.id}
                        className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-soft-xs flex items-center gap-3 transition-all hover:border-slate-300"
                      >
                        {/* Thumbnail */}
                        <RecipeIcon
                          imageUrl={item.recipe.imageUrl}
                          category={item.recipe.category}
                          name={item.recipe.name}
                          size={24}
                          containerClassName="w-12 h-12 rounded-xl shrink-0 border border-slate-100"
                        />

                        {/* Name & Unit Price */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {item.recipe.name}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            ${item.recipe.price.toFixed(2)} c/u
                          </p>
                        </div>

                        {/* 44px Touch Quantity Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => updateQuantity(index, -1)}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-black text-sm flex items-center justify-center transition active:scale-95"
                            aria-label="Disminuir cantidad"
                            title="Disminuir cantidad"
                          >
                            −
                          </button>
                          
                          <span className="w-8 text-center font-extrabold text-sm text-slate-900 select-none">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() => updateQuantity(index, 1)}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 font-black text-sm flex items-center justify-center transition active:scale-95"
                            aria-label="Aumentar cantidad"
                            title="Aumentar cantidad"
                          >
                            +
                          </button>

                          {/* Delete Item Button */}
                          <button
                            onClick={() => removeItem(index)}
                            className="w-10 h-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center transition active:scale-95 ml-0.5"
                            aria-label="Eliminar producto"
                            title="Eliminar producto"
                          >
                            <AppIcon name="delete" size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Kitchen Notes */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-soft-xs">
                <label
                  htmlFor="kitchen-notes"
                  className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5"
                >
                  <AppIcon name="edit" size={13} className="text-indigo-600" />
                  <span>Instrucciones / Notas para Cocina (opcional):</span>
                </label>
                <textarea
                  id="kitchen-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Sin cebolla, término medio, alergia a mariscos..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
                />
              </div>
            </div>

            {/* Ticket Footer: Financial Breakdown & Large Primary Send Button */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 shrink-0 space-y-3.5 shadow-soft-sm">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Impuestos incluidos:</span>
                  <span className="font-semibold text-slate-800">$0.00</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm">
                  <span className="font-black text-slate-900">Total a Enviar:</span>
                  <span className="text-2xl font-black text-emerald-600">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Big primary CTA (min 48px height) */}
              <button
                onClick={sendOrder}
                disabled={selectedItems.length === 0 || submitting}
                className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm sm:text-base shadow-soft-md hover:shadow-soft-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                {submitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Enviando comanda a cocina…</span>
                  </>
                ) : (
                  <>
                    <AppIcon name="check" size={18} />
                    <span>Confirmar y Enviar Comanda</span>
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
