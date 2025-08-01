export default function InventoryCategory() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Gestionar inventario &gt; Lácteos (o todo)</h2>
      <div className="flex mt-4">
        <aside className="w-1/4 p-2">
          <input placeholder="buscar producto ej. leche lala" className="w-full p-2 mb-2" />
          <div className="bg-gray-200 p-2">más productos</div>
        </aside>
        <main className="w-3/4 p-4 bg-gray-100 rounded">
          <h3>Leche lala</h3>
          <div className="bg-gray-300 w-32 h-32 mb-2">foto</div>
          <div>Utilizado en los platillos:</div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="bg-gray-300 p-2">Platillos que lo utilizan</div>
            <div className="bg-gray-300 p-2">Platillos que lo utilizan</div>
            <div className="bg-gray-300 p-2">Platillos que lo utilizan</div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="bg-indigo-900 text-white px-4 py-2 rounded">Editar</button>
            <button className="bg-indigo-900 text-white px-4 py-2 rounded">Eliminar</button>
            <button className="bg-indigo-900 text-white px-4 py-2 rounded">Ver detalles</button>
            <button className="bg-indigo-900 text-white px-4 py-2 rounded">Otra acción</button>
          </div>
        </main>
      </div>
    </div>
  )
}
