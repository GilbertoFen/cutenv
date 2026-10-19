'use client';

import { useEffect, useState } from "react";
import type { Recipe, SaleProps } from "@/types";
import { getAllRecipes } from "@/services/RecipeService";
import { updateOrder, checkOrderStock, type StockWarning } from "@/services/OrderService";
import { AppIcon, RecipeIcon } from "@/components/icons";

const EditOrderModal = ({ order, onClose, onUpdate }: SaleProps) => {
  const [items, setItems] = useState(() => [...order.recipes]);
  const [menu, setMenu] = useState<Recipe[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [notes, setNotes] = useState(order.notes || '');
  const [stockWarnings, setStockWarnings] = useState<StockWarning[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAllRecipes()
      .then(setMenu)
      .catch(() => alert("Error al cargar el menú"));
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setStockWarnings([]);
      return;
    }
    const payload = items.map((it) => ({ recipe: it.id!, quantity: it.quantity }));
    checkOrderStock(payload).then((res) => {
      setStockWarnings(res.warnings || []);
    });
  }, [items]);

  const quantityChange = (index: number, delta: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty < 1) return prev;
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const addToMenu = (recipe: Recipe) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === recipe.id);
      if (existing) {
        return prev.map((item) =>
          item.id === recipe.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { ...recipe, quantity: 1 }];
      }
    });
  };

  const save = async () => {
    if (items.length === 0) {
      if (!confirm("Has eliminado todos los platillos de la orden. ¿Confirmas que deseas eliminar esta orden de la mesa?")) {
        return;
      }
    }
    setSaving(true);
    try {
      const updatedItems = items.map((item) => ({
        recipe: item.id!,
        quantity: item.quantity,
        notes: item.notes,
      }));

      await updateOrder(order.id, updatedItems, notes);

      onUpdate();
      onClose();
    } catch (err: any) {
      alert(err.message || "Error al actualizar la orden");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <div className="bg-white text-slate-900 p-6 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200">
        <h2 className="text-xl font-bold mb-4 text-slate-900">Editar orden</h2>

        {stockWarnings.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AppIcon name="warning" size={15} className="text-amber-600" />
              <span>Aviso informativo de inventario:</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Uno o más platillos podrían requerir insumos sin existencias suficientes en almacén:
            </p>
            <ul className="list-disc pl-4 text-[11px] space-y-0.5">
              {stockWarnings.map((w, i) => (
                <li key={i}>
                  <strong>{w.recipeName}:</strong> Insumo <em>{w.ingredientName}</em> requiere {w.required} {w.unit} (disponibles en stock: {w.available} {w.unit}).
                </li>
              ))}
            </ul>
            <p className="text-[11px] font-semibold text-amber-900 pt-1">
              Favor de consultar con cocina para confirmar si es posible conseguir más insumos antes de preparar.
            </p>
          </div>
        )}

        {items.length === 0 && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 mb-4 text-center">
            <strong>Orden sin platillos:</strong> Al guardar los cambios, esta orden se eliminará por completo y desaparecerá de la lista de órdenes pendientes.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto pr-1">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <span className="flex-1 font-medium text-sm text-slate-800">{item.name}</span>
              <div className="flex gap-1.5 items-center">
                <button
                  onClick={() => quantityChange(index, -1)}
                  className="w-7 h-7 flex items-center justify-center bg-rose-500 text-white rounded font-bold hover:bg-rose-600"
                >
                  -
                </button>
                <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                <button
                  onClick={() => quantityChange(index, 1)}
                  className="w-7 h-7 flex items-center justify-center bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700"
                >
                  +
                </button>
                <button
                  onClick={() => removeItem(index)}
                  className="ml-2 px-2.5 py-1 bg-slate-400 hover:bg-rose-600 text-white text-xs rounded transition-colors flex items-center justify-center"
                  title="Quitar platillo"
                  aria-label="Quitar platillo"
                >
                  <AppIcon name="close" size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label htmlFor="notes" className="block font-bold text-sm mb-1 text-slate-700">
            Notas para cocina (opcional):
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Sin cebolla, bien cocido, etc."
            className="w-full p-2.5 border border-slate-300 rounded-lg resize-none text-sm text-slate-900"
            rows={2}
          />
        </div>

        <div className="mt-4">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-xs font-bold text-white px-3 py-1.5 rounded-lg bg-[#14144f] hover:bg-[#1f1f6d] transition-colors"
          >
            {showMenu ? "Ocultar menú adicional" : "+ Agregar más platillos del menú"}
          </button>

          {showMenu && (
            <div className="grid grid-cols-2 gap-2 mt-3 max-h-44 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
              {menu.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => addToMenu(recipe)}
                >
                  <RecipeIcon
                    category={recipe.category}
                    imageUrl={recipe.imageUrl}
                    name={recipe.name}
                    size={20}
                    containerClassName="w-10 h-10 rounded shrink-0"
                  />
                  <span className="text-xs font-medium text-slate-800 line-clamp-1">{recipe.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 gap-3 pt-3 border-t">
          <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={save}
            className="bg-[#14144f] hover:bg-[#1f1f6d] px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;
