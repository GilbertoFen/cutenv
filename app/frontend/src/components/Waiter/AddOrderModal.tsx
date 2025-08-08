import { useEffect, useState } from "react";
import { getAllRecipes } from "../../services/RecipeService";
import { createOrder } from "../../services/OrderService";
import type { Recipe } from "../../types";
import type { AddOrderModalProps } from "../../types";
import type { SelectedItem } from "../../types";

export default function AddOrderModal({
  tableId,
  onClose,
  onRefresh,
}: AddOrderModalProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [notes, setNotes] = useState('');


  useEffect(() => {
    getAllRecipes().then(setRecipes);
  }, []);

  const addItem = (recipe: Recipe) => {
    if (!recipe.id) {
      console.warn("No se encontro el id de la receta ", recipe);
      return;
    }
    
    // Añadir por primera vez a la venta o incrementar
    setSelectedItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.recipe.id === recipe.id);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            recipe, 
            quantity: 1,
          },
        ];
      }
    });
  };

  const sendOrder = async () => {
    const items = selectedItems.map((i) => ({
      recipe: i.recipe.id,
      quantity: i.quantity,
    }));
    await createOrder({ table: tableId, items, notes });
    onRefresh();
    onClose();
  };

  const total = selectedItems.reduce(
    (sum, item) => sum + item.recipe.price * item.quantity, 0
  );

  const filteredRecipes = activeCategory
    ? recipes.filter((recipe) => recipe.category === activeCategory)
    : recipes;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-white text-black p-4 rounded-xl w-full max-w-4xl h-[90vh] overflow-hidden overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-2 mb-2">
          <h2 className="text-xl font-bold">Menú</h2>
          <button onClick={onClose} className="text-xl font-bold">
            &times;
          </button>
        </div>

        <div className="flex flex-col md:flex-row overflow-y-auto h-full">
          <div className="w-1/4 bg-gray-100 p-2 overflow-y-auto max-h-full">
            <h3 className="font-bold mb-2">Filtros / Categorías</h3>
            <div className="space-y-2">
              {/*          FILTROS          */}
              <button
                onClick={() => setActiveCategory("desayuno")}
                className={`px-2 py-1 rounded w-full ${activeCategory === "desayuno" ? "bg-[#646cffaa] font-bold text-white" : "bg-gray-300"}`}
              >
                Desayuno
              </button>

              <button
                onClick={() => setActiveCategory("bebidas")}
                className={`px-2 py-1 rounded w-full ${activeCategory === "bebidas" ? "bg-[#646cffaa] font-bold text-white" : "bg-gray-300"}`}
              >
                Bebidas
              </button>
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-2 py-1 rounded w-full ${activeCategory === null ? "bg-[#646cffaa] font-bold text-white" : "bg-gray-300"}`}
              >
                Ver todo
              </button>
            </div>
            <div className="space-y-2">
              {/*          INFORMACION          */}
              Resumen
              {selectedItems.map((item, index) => (
                <div
                  key={item.recipe.id}
                  className="flex items-center gap-2 bg-white p-2 rounded shadow text-black"
                >
                  {/*       IMAGE N      */}
                  {item.recipe.imageUrl && (
                    <img
                      src={item.recipe.imageUrl}
                      alt={item.recipe.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  )}
                  


                  
                  <div className="flex-1">
                    
                    <p className="font-semibold text-xs">{item.recipe.name}</p>
                    <p className="text-xs text-gray-500">
                      Total: ${(item.recipe.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  

                  <div className="flex flex-wrap justify-end gap-1 mt-1">
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
                      className="bg-red-400 text-white text-xs px-2 rounded"
                    >
                      -
                    </button>

                    <span className="px-1 text-sm">{item.quantity}</span>

                    <button
                      onClick={() =>
                        setSelectedItems((prev) =>
                          prev.map((it, i) =>
                            i === index
                              ? { ...it, quantity: it.quantity + 1 }
                              : it
                          )
                        )
                      }
                      className="bg-green-400 text-white text-xs px-2 rounded"
                    >
                      +
                    </button>

                    <button
                      onClick={() =>
                        setSelectedItems((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      className="bg-gray-400 text-white px-2 rounded"
                      title="Eliminar"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
                    <label htmlFor="notes" className="block font-bold text-sm mb-1">Notas para cocina (opcional):</label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ejemplo Sin cebolla, etc."
                      className="w-full p-2 border rounded resize-none text-sm text-black"
                      rows={3}
                    />
                  </div>
            <div className="mt-2 text-right font-bold text-black">
              Total: ${total.toFixed(2)}
            </div>

            <button
              onClick={sendOrder}
              className="mt-2 bg-[#3d408a] text-white px-3 py-1 rounded w-full"
            >
              Enviar orden
            </button>
          </div>

          {/*                     MENU CON PLATILLOS                  */}
          <div className="w-full md:w-3/4 p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="border rounded p-2 flex flex-col items-center justify-between h-[220px] max-w-[160px] mx-auto text-center shadow"
              >
                <img
                  src={recipe.imageUrl || "/images/placeholder.jpg"}
                  alt={recipe.name}
                  className="w-full h-32 object-cover rounded-md mb-1"
                />
                <p className="font-bold  text-xs  w-full   text-center">
                  {recipe.name}
                </p>
                <p className="text-xs text-gray-600">${recipe.price}</p>
                <button
                  onClick={() => addItem(recipe)}
                  className="mt-1 bg-[#3d408a] font-semi-bold text-white px-3 py-1 rounded"
                >
                  Agregar +
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
