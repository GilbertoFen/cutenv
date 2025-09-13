import { useState } from 'react';
 import { markReadyOrders } from '../../services/OrderService';
import { useKitchenOrders } from '../../hooks/useKitchenOrders';

const CookPage = () => {
  const { orders, setOrders } = useKitchenOrders(); 
  const [updating, setUpdating] = useState<string | null>(null);

  const handleReady = async (id: string) => {
    try {
      setUpdating(id);
      await markReadyOrders(id); 
      setOrders(prev => prev.filter(o => o.id !== id));
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Ordenes en preparación</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <div key={order.id} className="bg-white p-4 shadow-md rounded-md border border-gray-300">
            <h2 className="text-lg font-semibold mb-2">Mesa {order.tableNumber}</h2>
            <ul className="mb-3">
              {order.recipes.map((item, index) => (
                <li key={index} className="flex items-center gap-2 mb-1">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded" />
                  )}
                  <div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                  </div>
                </li>
              ))}
              {order.notes && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-black p-2 mt-2 rounded">
                  <strong>Nota:</strong> {order.notes}
                </div>
              )}
            </ul>
            <button
              onClick={() => handleReady(order.id)}
              disabled={updating === order.id}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded w-full font-bold"
            >
              {updating === order.id ? 'Marcando...' : 'Marcar como lista'}
            </button>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <p className="text-center text-gray-500 mt-6">No hay ordenes pendientes por preparar</p>
      )}
    </div>
  );
};

export default CookPage;
