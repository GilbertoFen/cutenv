import React from 'react';
import { Link } from "react-router-dom";
const categories = ['Lácteos', 'Verduras', 'Pastas', 'etc', 'etc', 'etc', 'etc'];

const Inventory: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-900 text-white py-4 px-8 text-xl font-semibold">Gestión de inventario</header>
      <div className="p-8">
        <label className="block text-lg font-medium mb-2">Categorías de productos</label>
        <input type="text" placeholder="Buscar Categoría" className="w-full border rounded-md px-4 py-2 mb-4" />
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map(cat => (
            <button key={cat} className="bg-gray-200 rounded-md py-4 text-center font-medium hover:bg-gray-300">{cat}</button>
          ))}
        </div>
        <div className="flex justify-between mt-6">
          <button className="bg-indigo-900 text-white px-4 py-2 rounded-md">Ver todo</button>
          <Link
            to="/inventory/add-product"
            className="bg-[#14144f] text-white px-4 py-2 rounded hover:bg-[#2a2a7f]"
            >
            Agregar Producto
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
