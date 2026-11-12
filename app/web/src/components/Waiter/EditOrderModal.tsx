'use client';

import { useEffect, useMemo, useState } from "react";
import type { Recipe, SaleProps } from "@/types";
import { getAllRecipes } from "@/services/RecipeService";
import { updateOrder, cancelOrder, checkOrderStock, type StockWarning } from "@/services/OrderService";
import { AppIcon, RecipeIcon } from "@/components/icons";
import { useNotification } from "@/context/NotificationContext";

interface EditableDishItem {
  id: string; // Recipe ID
  itemId?: string; // Subdocument item ID if exists
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  category?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  notes?: string;
}

const EditOrderModal = ({ order, onClose, onUpdate }: SaleProps) => {
  const { notify, confirm } = useNotification();
  const [menu, setMenu] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [notes, setNotes] = useState(order.notes || "");
  const [stockWarnings, setStockWarnings] = useState<StockWarning[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'dishes' | 'add'>('dishes');

  // Convert order.recipes into editable items
  const [items, setItems] = useState<EditableDishItem[]>(() =>
    (order.recipes || []).map((r: any) => ({
      id: r.id || r.itemId || (r as any)._id || '',
      itemId: r.itemId || r.id,
      name: r.name || 'Platillo',
      price: Number(r.price ?? 0),
      quantity: Number(r.quantity ?? 1),
      imageUrl: r.imageUrl,
      category: r.category,
      status: r.status || 'preparing',
      notes: r.notes || '',
    }))
  );

  useEffect(() => {
    getAllRecipes()
      .then((recs) => {
        setMenu(recs);
        // Fill prices from menu if missing in order
        setItems((prev) =>
          prev.map((it) => {
            if (it.price > 0) return it;
            const found = recs.find((m) => m.id === it.id);
            return found ? { ...it, price: found.price, imageUrl: it.imageUrl || found.imageUrl } : it;
          })
        );
      })
      .catch(() => notify.error("Error al cargar el menú del restaurante"));
  }, []);

  useEffect(() => {
    const active = items.filter((it) => it.status !== 'cancelled');
    if (active.length === 0) {
      setStockWarnings([]);
      return;
    }
    const payload = active.map((it) => ({ recipe: it.id, quantity: it.quantity }));
    checkOrderStock(payload).then((res) => {
      setStockWarnings(res.warnings || []);
    });
  }, [items]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    menu.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [menu]);

  const filteredMenu = useMemo(() => {
    return menu.filter((recipe) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = !activeCategory || recipe.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [menu, searchQuery, activeCategory]);

  const quantityChange = (index: number, delta: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty < 1) return prev;
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemNote = (index: number, note: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], notes: note };
      return updated;
    });
  };

  const addToMenu = (recipe: Recipe) => {
    if (!recipe.id) return;
    setItems((prev) => {
      const existing = prev.find((item) => item.id === recipe.id);
      if (existing) {
        return prev.map((item) =>
          item.id === recipe.id
            ? { ...item, quantity: item.quantity + 1, status: item.status === 'cancelled' ? 'preparing' : item.status }
            : item
        );
      } else {
        return [
          ...prev,
          {
            id: recipe.id!,
            name: recipe.name,
            price: Number(recipe.price || 0),
            quantity: 1,
            imageUrl: recipe.imageUrl,
            category: recipe.category,
            status: 'preparing',
            notes: '',
          },
        ];
      }
    });
    notify.success(`"${recipe.name}" agregado a la comanda`);
  };

  const totalCalculated = useMemo(() => {
    return items
      .filter((it) => it.status !== 'cancelled')
      .reduce((acc, it) => acc + (it.price * it.quantity), 0);
  }, [items]);

  const save = async () => {
    if (items.length === 0) {
      const ok = await confirm({
        title: "Eliminar comanda sin platillos",
        message: "Has eliminado todos los platillos de la comanda. Al guardar, esta orden se eliminará por completo.",
        confirmText: "Sí, eliminar comanda",
        cancelText: "Volver",
        type: "danger",
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      const updatedPayload = items.map((item) => ({
        recipe: item.id,
        quantity: item.quantity,
        status: item.status,
        notes: item.notes,
      }));

      await updateOrder(order.id, updatedPayload, notes);
      notify.success("Comanda actualizada correctamente.");
      onUpdate();
      onClose();
    } catch (err: any) {
      notify.error(err.message || "Error al actualizar la orden");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelOrder = async () => {
    const ok = await confirm({
      title: "Cancelar comanda completa",
      message: "¿Confirmas que deseas cancelar esta orden por completo? Se liberarán los insumos elegibles y el total se descontará de la cuenta.",
      confirmText: "Sí, cancelar orden",
      cancelText: "No cancelar",
      type: "danger",
    });
    if (!ok) return;

    setSaving(true);
    try {
      await cancelOrder(order.id);
      notify.success("Orden cancelada correctamente.");
      onUpdate();
      onClose();
    } catch (err: any) {
      notify.error(err.message || "Error al cancelar la orden");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 rounded-3xl w-full max-w-4xl shadow-soft-xl border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
              #{String(order.id).slice(-4)}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Editar Comanda</span>
                {order.tableNumber && (
                  <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                    Mesa {order.tableNumber}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Modifica cantidades, agrega platillos del menú o cancela productos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Cerrar modal"
          >
            <AppIcon name="close" size={16} />
          </button>
        </div>

        {/* Tab switchers on small/tablet devices */}
        <div className="flex lg:hidden border-b border-slate-100 bg-slate-50/80 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('dishes')}
            className={`min-h-[40px] px-4 py-2 font-black text-xs rounded-t-xl transition border-b-2 ${
              activeTab === 'dishes'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-soft-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Platillos en comanda ({items.filter((i) => i.status !== 'cancelled').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`min-h-[40px] px-4 py-2 font-black text-xs rounded-t-xl transition border-b-2 ${
              activeTab === 'add'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-soft-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            + Agregar del menú
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Stock warnings banner */}
          {stockWarnings.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl text-xs space-y-1">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                <AppIcon name="warning" size={15} className="text-amber-600" />
                <span>Aviso de existencias en almacén:</span>
              </div>
              <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-amber-800">
                {stockWarnings.map((w, i) => (
                  <li key={i}>
                    <strong>{w.recipeName}:</strong> Insumo <em>{w.ingredientName}</em> requiere {w.required} {w.unit} (disponibles: {w.available} {w.unit}).
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Grid Layout: Left dishes / Right menu */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: Current order items (visible on lg or when activeTab === 'dishes') */}
            <div className={`space-y-3 ${activeTab === 'dishes' ? 'block' : 'hidden lg:block'} lg:col-span-7`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Platillos en la comanda
                </span>
                <span className="text-xs font-black text-slate-700">
                  Subtotal: ${totalCalculated.toFixed(2)}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
                  <strong>Comanda sin platillos:</strong> Al guardar, esta orden se eliminará automáticamente.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
                  {items.map((item, index) => {
                    const isCancelled = item.status === 'cancelled';
                    const isDelivered = item.status === 'delivered';
                    const isReady = item.status === 'ready';

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-2xl border transition-all ${
                          isCancelled
                            ? 'bg-slate-50 border-slate-200 opacity-50'
                            : isDelivered
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-white border-slate-200/90 shadow-soft-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <RecipeIcon
                              imageUrl={item.imageUrl}
                              name={item.name}
                              size={20}
                              containerClassName="w-10 h-10 rounded-xl shrink-0"
                            />
                            <div className="min-w-0">
                              <p className={`font-black text-sm truncate ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                {item.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-bold text-slate-600">
                                  ${item.price.toFixed(2)} c/u
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-black text-indigo-700">
                                  Subtotal: ${(item.price * item.quantity).toFixed(2)}
                                </span>
                                <span
                                  className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                    isCancelled
                                      ? 'bg-rose-100 text-rose-800'
                                      : isDelivered
                                      ? 'bg-slate-200 text-slate-700'
                                      : isReady
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isCancelled
                                    ? 'Cancelado'
                                    : isDelivered
                                    ? 'Entregado'
                                    : isReady
                                    ? 'Listo'
                                    : 'Preparando'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Controls */}
                          {!isDelivered && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => quantityChange(index, -1)}
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition active:scale-95"
                                title="Reducir cantidad"
                              >
                                -
                              </button>
                              <span className="w-7 text-center font-black text-sm text-slate-900">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => quantityChange(index, 1)}
                                className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center transition active:scale-95"
                                title="Aumentar cantidad"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition active:scale-95 ml-1"
                                title="Quitar de la comanda"
                              >
                                <AppIcon name="close" size={13} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Individual note input */}
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => updateItemNote(index, e.target.value)}
                            placeholder="Nota para cocina (ej. sin cebolla, término medio...)"
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Order-level notes */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nota general para cocina:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones generales para toda la comanda..."
                  rows={2}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Right: Add from menu (visible on lg or when activeTab === 'add') */}
            <div className={`space-y-3 ${activeTab === 'add' ? 'block' : 'hidden lg:block'} lg:col-span-5 border border-slate-200/90 bg-slate-50/60 p-4 rounded-3xl`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  + Agregar platillos del menú
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {filteredMenu.length} disponibles
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar platillo por nombre…"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="absolute left-2.5 top-2.5 text-slate-400">
                  <AppIcon name="search" size={13} />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className={`min-h-[28px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 ${
                    !activeCategory
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Todas
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`min-h-[28px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 ${
                      activeCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Menu items list */}
              <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                {filteredMenu.map((recipe) => (
                  <div
                    key={recipe.id}
                    onClick={() => addToMenu(recipe)}
                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-soft-xs cursor-pointer transition active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RecipeIcon
                        category={recipe.category}
                        imageUrl={recipe.imageUrl}
                        name={recipe.name}
                        size={18}
                        containerClassName="w-9 h-9 rounded-lg shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {recipe.name}
                        </p>
                        <p className="text-[11px] font-black text-slate-600">
                          ${Number(recipe.price || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="min-h-[32px] px-2.5 py-1 text-xs font-black bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white rounded-lg transition"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCancelOrder}
            disabled={saving}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Cancelar la comanda completa"
          >
            <AppIcon name="delete" size={14} className="text-rose-600" />
            <span>Cancelar comanda completa</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl transition shadow-soft-xs"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition shadow-soft-xs active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <AppIcon name="check" size={14} />
              <span>{saving ? "Guardando…" : `Guardar Cambios ($${totalCalculated.toFixed(2)})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;