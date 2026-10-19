'use client';

import { useEffect, useState } from "react";
import { getAllRecipes } from "@/services/RecipeService";
import { createOrder, checkOrderStock, type StockWarning } from "@/services/OrderService";
import type { Recipe, AddOrderModalProps, SelectedItem } from "@/types";
import { AppIcon, RecipeIcon } from "@/components/icons";

export default function AddOrderModal({
  tableId,
  onClose,
  onRefresh,
}: AddOrderModalProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [stockWarnings, setStockWarnings] = useState<StockWarning[]>([]);

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

  const total = selectedItems.reduce(
    (sum, item) => sum + item.recipe.price * item.quantity,
    0
  );

  const sendOrder = async () => {
    const items = selectedItems.map((i) => ({
      recipe: i.recipe.id,
      quantity: i.quantity,
    }));
    await createOrder({ table: tableId, items, notes });
    onRefresh();
    onClose();
  };

  const filteredRecipes = activeCategory
    ? recipes.filter((r) => r.category === activeCategory)
    : recipes;

  const CategoryChip = ({
    value,
    label,
  }: {
    value: string | null;
    label: string;
  }) => {
    const active = activeCategory === value;
    return (
      <button
        onClick={() => setActiveCategory(value)}
        className={`px-3 py-2 rounded-full text-sm whitespace-nowrap transition
          ${active ? "bg-indigo-600 text-white font-bold" : "bg-slate-200 text-slate-800"}
        `}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div
        className="
          relative w-screen h-screen bg-white text-slate-900
          md:w-[90vw] md:h-[90vh] md:max-w-5xl md:rounded-2xl md:shadow-2xl
          flex flex-col overflow-hidden
        "
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 bg-white">
          <h2 className="text-lg md:text-xl font-bold text-slate-900">Menú</h2>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-white bg-[#14144f] hover:opacity-90 inline-flex items-center justify-center"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <AppIcon name="close" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="md:hidden border-b">
            <div className="px-4 pt-3 pb-2 text-sm font-semibold">Categorías</div>
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
              <CategoryChip value={"desayuno"} label="Desayuno" />
              <CategoryChip value={"bebidas"} label="Bebidas" />
              <CategoryChip value={null} label="Ver todo" />
            </div>
          </div>

          <div className="px-4 py-3 md:py-4 grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-4 h-full">
            <aside className="hidden md:flex md:col-span-4">
              <div className="bg-slate-50 rounded-xl p-3 w-full flex flex-col min-h-0 border border-slate-200">
                <div className="shrink-0">
                  <h3 className="font-bold mb-2 text-slate-800">Filtros / Categorías</h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setActiveCategory("desayuno")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium w-full text-left transition ${
                        activeCategory === "desayuno"
                          ? "bg-indigo-600 font-bold text-white shadow-sm"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      Desayuno
                    </button>
                    <button
                      onClick={() => setActiveCategory("bebidas")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium w-full text-left transition ${
                        activeCategory === "bebidas"
                          ? "bg-indigo-600 font-bold text-white shadow-sm"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      Bebidas
                    </button>
                    <button
                      onClick={() => setActiveCategory(null)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium w-full text-left transition ${
                        activeCategory === null
                          ? "bg-indigo-600 font-bold text-white shadow-sm"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      Ver todo
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex-1 min-h-0 overflow-y-auto pr-1">
                  <h3 className="font-bold mb-2 text-slate-800">Resumen</h3>

                  {stockWarnings.length > 0 && (
                    <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-[11px]">
                        <AppIcon name="warning" size={13} className="text-amber-600 shrink-0" />
                        <span>Aviso de inventario insuficiente:</span>
                      </div>
                      <ul className="list-disc pl-4 text-[10px] space-y-0.5 text-amber-800">
                        {stockWarnings.map((w, i) => (
                          <li key={i}>
                            <strong>{w.recipeName}:</strong> Falta <em>{w.ingredientName}</em> ({w.required} req. / {w.available} disp. {w.unit})
                          </li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-amber-900 font-medium">
                        Consulta con cocina para confirmar si es posible conseguir más insumos.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {selectedItems.length === 0 && (
                      <p className="text-sm text-slate-500">Aún no has agregado platillos.</p>
                    )}
                    {selectedItems.map((item, index) => (
                      <div
                        key={item.recipe.id}
                        className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm"
                      >
                        <RecipeIcon
                          imageUrl={item.recipe.imageUrl}
                          category={item.recipe.category}
                          name={item.recipe.name}
                          size={18}
                          containerClassName="w-10 h-10 rounded shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs truncate text-slate-800">{item.recipe.name}</p>
                          <p className="text-xs text-slate-500 font-medium">
                            ${(item.recipe.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setSelectedItems((prev) =>
                                prev.map((it, i) =>
                                  i === index && it.quantity > 1
                                    ? { ...it, quantity: it.quantity - 1 }
                                    : it
                                )
                              )
                            }
                            className="bg-rose-500 text-white text-xs px-2 py-1 rounded hover:bg-rose-600"
                            aria-label="Disminuir"
                          >
                            −
                          </button>
                          <span className="px-1 text-sm w-6 text-center font-bold">{item.quantity}</span>
                          <button
                            onClick={() =>
                              setSelectedItems((prev) =>
                                prev.map((it, i) =>
                                  i === index ? { ...it, quantity: it.quantity + 1 } : it
                                )
                              )
                            }
                            className="bg-emerald-600 text-white text-xs px-2 py-1 rounded hover:bg-emerald-700"
                            aria-label="Aumentar"
                          >
                            +
                          </button>
                          <button
                            onClick={() =>
                              setSelectedItems((prev) => prev.filter((_, i) => i !== index))
                            }
                            className="bg-slate-400 text-white p-1 rounded hover:bg-slate-500 inline-flex items-center justify-center"
                            title="Eliminar"
                            aria-label="Eliminar"
                          >
                            <AppIcon name="close" size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t mt-3 shrink-0">
                  <label htmlFor="notes" className="block font-bold text-sm mb-1 text-slate-800">
                    Notas para cocina (opcional):
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Sin cebolla"
                    className="w-full p-2 border border-slate-300 rounded-lg resize-none text-sm"
                    rows={3}
                  />
                  <div className="mt-3 text-right font-bold text-slate-900">Total: ${total.toFixed(2)}</div>
                  <button
                    onClick={sendOrder}
                    className="mt-2 w-full bg-[#14144f] hover:bg-[#1f1f6d] text-white px-3 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                    disabled={selectedItems.length === 0}
                  >
                    Enviar orden
                  </button>
                </div>
              </div>
            </aside>

            <main className="md:col-span-8 min-h-0 flex flex-col">
              <details className="md:hidden mb-3 rounded-lg border">
                <summary className="list-none px-4 py-3 font-semibold cursor-pointer select-none flex items-center justify-between">
                  Resumen de la orden
                  <span className="text-sm font-normal">Total ${total.toFixed(2)}</span>
                </summary>
                <div className="px-4 pb-3 space-y-2">
                  {selectedItems.length === 0 && (
                    <p className="text-sm text-gray-500">Aún no has agregado platillos.</p>
                  )}
                  {selectedItems.map((item, index) => (
                    <div
                      key={item.recipe.id}
                      className="flex items-center gap-2 bg-white p-2 rounded shadow"
                    >
                      {item.recipe.imageUrl && (
                        <img
                          src={item.recipe.imageUrl}
                          alt={item.recipe.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs truncate">{item.recipe.name}</p>
                        <p className="text-xs text-gray-500">
                          ${(item.recipe.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setSelectedItems((prev) =>
                              prev.map((it, i) =>
                                i === index && it.quantity > 1
                                    ? { ...it, quantity: it.quantity - 1 }
                                  : it
                              )
                            )
                          }
                          className="bg-red-500 text-white text-xs px-2 py-1 rounded"
                        >
                          −
                        </button>
                        <span className="px-1 text-sm w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() =>
                            setSelectedItems((prev) =>
                              prev.map((it, i) =>
                                i === index ? { ...it, quantity: it.quantity + 1 } : it
                              )
                            )
                          }
                          className="bg-green-600 text-white text-xs px-2 py-1 rounded"
                        >
                          +
                        </button>
                        <button
                          onClick={() =>
                            setSelectedItems((prev) => prev.filter((_, i) => i !== index))
                          }
                          className="bg-gray-400 text-white p-1 rounded inline-flex items-center justify-center"
                          aria-label="Eliminar"
                        >
                          <AppIcon name="close" size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="mt-3">
                    <label htmlFor="notes-m" className="block font-bold text-sm mb-1">
                      Notas para cocina (opcional):
                    </label>
                    <textarea
                      id="notes-m"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej. Sin cebolla"
                      className="w-full p-2 border rounded resize-none text-sm"
                      rows={3}
                    />
                  </div>
                </div>
              </details>

              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredRecipes.map((recipe) => (
                    <div key={recipe.id} className="border border-slate-200 rounded-xl p-2.5 flex flex-col bg-white shadow-sm hover:shadow-md transition-shadow">
                      <RecipeIcon
                        imageUrl={recipe.imageUrl}
                        category={recipe.category}
                        name={recipe.name}
                        size={40}
                        containerClassName="w-full h-28 sm:h-32 rounded-lg mb-2"
                      />
                      <p className="font-semibold text-sm line-clamp-2 min-h-[2.25rem] text-slate-800">
                        {recipe.name}
                      </p>
                      <p className="text-xs font-bold text-indigo-700 mb-2">${recipe.price}</p>
                      <button
                        onClick={() => addItem(recipe)}
                        className="mt-auto bg-[#14144f] hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Agregar +
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </main>
          </div>
        </div>

        <div className="md:hidden sticky bottom-0 bg-white border-t px-4 py-3 flex items-center justify-between">
          <div className="font-bold">Total: ${total.toFixed(2)}</div>
          <button
            onClick={sendOrder}
            className="bg-[#14144f] text-white px-4 py-2 rounded font-semibold"
            disabled={selectedItems.length === 0}
          >
            Enviar orden
          </button>
        </div>
      </div>
    </div>
  );
}
