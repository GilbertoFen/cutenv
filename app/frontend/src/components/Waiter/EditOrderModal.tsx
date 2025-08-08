import { useEffect, useState } from "react";
import type { Recipe } from "../../types/index";
import type { SaleProps } from "../../types";
import { getAllRecipes } from "../../services/RecipeService";
import { updateOrder } from "../../services/OrderService";
const EditOrderModal = ({ order, onClose, onUpdate }: SaleProps) => {
  const [items, setItems] = useState(() => [...order.recipes]);
  const [menu, setMenu] = useState<Recipe[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [notes, setNotes] = useState(order.notes || '');

   useEffect(() => {
    getAllRecipes()
      .then(setMenu)
      .catch(() => alert("Error al cargar el menú"));
  }, []);

  const quantityChange = (index: number, delta: number) => {
    console.log("Cambio cantidad", { index, delta });
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
    const updatedItems = items.map((item) => ({
      recipe: item.id!, 
      quantity: item.quantity,
      notes: item.notes
    }));

    await updateOrder(order.id, updatedItems, notes);

    onUpdate();
    onClose();
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-white text-black p-4 rounded w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Editar orden</h2>

        <div className="grid grid-cols-1 gap-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-gray-100 p-2 rounded"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-12 h-12 rounded object-cover"
                />
              )}
              <span className="flex-1">{item.name}</span>
              <div className="flex gap-1 items-center">
                <button
                  onClick={() => quantityChange(index, -1)}
                  className="px-2 bg-red-500 text-white rounded"
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button
                  onClick={() => quantityChange(index, 1)}
                  className="px-2 bg-green-500 text-white rounded"
                >
                  +
                </button>
                <button
                  onClick={() => removeItem(index)}
                  className="ml-2 px-2 bg-gray-600 text-white rounded"
                  title="Quitar platillo"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/*             MENU DE RECETAS NUEVAS             */}
        <div className="mt-4">
          <div className="mt-4">
                    <label htmlFor="notes" className="block font-bold text-sm mb-1">Notas para cocina (opcional):</label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej. Sin cebolla, bien cocido, etc."
                      className="w-full p-2 border rounded resize-none text-sm text-black"
                      rows={3}
                    />
                  </div>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-sm text-white text-bold p-1 rounded-md bg-[#14144f]"
          >
            {showMenu ? "Ocultar menu" : "Ver menu"}
          </button>

          {showMenu && (
            <div className="grid grid-cols-2 gap-2 mt-3 max-h-40 overflow-y-auto">
              {menu.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center gap-2 bg-gray-200 p-2 rounded cursor-pointer hover:bg-gray-300"
                  onClick={() => addToMenu(recipe)}
                >
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <span className="text-sm">{recipe.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 gap-2">
          <button onClick={onClose} className="bg-gray-300 px-4 py-1 rounded">
            Cancelar
          </button>
          <button
            onClick={save}
            className="bg-[#3d408a] px-4 py-1 text-white rounded"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;
