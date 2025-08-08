import { useEffect, useState } from "react";

import { getTableById, updateTableStatus } from "../../services/TableService";
import { useNavigate, useParams } from "react-router-dom";

import {
  getOrdersByTable,
  updateOrderStatus,
} from "../../services/OrderService";
import AddOrderModal from "../../components/Waiter/AddOrderModal";
import type { Order, Table } from "../../types/index";
import ChargeModal from "../../components/Waiter/ChargeModal";
import EditOrderModal from "../../components/Waiter/EditOrderModal";
const TableDetailPage = () => {
  const { id } = useParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [tableInfo, setTableInfo] = useState<Table | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (id) {
      getTableById(id).then(setTableInfo);
      getOrdersByTable(id).then(setOrders);
    }
  }, [id]);
  useEffect(() => {
    console.log("Mesa actual:", tableInfo?.number);
    console.log("Todas las órdenes:", orders);
  }, [orders, tableInfo]);

  const navigate = useNavigate();

  const handleDeliver = async (orderId: string) => {
    await updateOrderStatus(orderId, "delivered");
    if (id) {
      const updated = await getOrdersByTable(id);
      setOrders(updated);
    }
  };

  const occupyTable = async () => {
    if (!id) return;
    try {
      await updateTableStatus(id, 'ocupada');
      const updated = await getTableById(id);
      setTableInfo(updated);
    } catch (error) {
      console.error("Error al ocupar la mesa:", error);
      alert("No se pudo ocupar la mesa");
    }
  };

 const activeOrders = Array.isArray(orders)
  ? orders.filter(
      (o) =>
        (o.status === "preparing" || o.status === "ready") &&
        o.tableNumber === tableInfo?.number
    )
  : [];


  /*const readyOrders = Array.isArray(orders)
    ? orders.filter(
        (o) => o.status === "ready" && o.tableNumber === tableInfo?.number)
    : [];*/

  const deliveredOrders = Array.isArray(orders)
    ? orders.filter(
        (o) => o.status === "delivered" && o.tableNumber === tableInfo?.number
      )
    : [];

  const hasPendingOrders = orders.some((order) => order.status !== "delivered");

  return (
    <div className="min-h-screen bg-white text-white rounded-lg shadow-lg p-6 w-full max-w-6xl sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigate("/waiter")}
          className="bg-[#14144f]  px-3 py-1 rounded hover:bg-[#14144f]-800"
        >
          VOLVER
        </button>
        <div className="text-black text-center">
          Mesa {tableInfo?.number} {tableInfo?.status.toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        <div className="shadow-xl bg-white p-4 rounded-xl text-black ">
          <h2 className="font-bold">Info de la mesa</h2>
          <p>Estado: {tableInfo?.status}</p>
          <p>Capacidad: {tableInfo?.capacity}</p>

          {tableInfo?.status === "disponible" && (
            <button
              onClick={occupyTable}
              className="bg-gray-300 text-black px-3 py-1 rounded"
            >
              Ocupar mesa
            </button>
          )}

          {tableInfo?.status === "ocupada" && (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4  bg-[#14144f] px-3 py-1 rounded block w-full text-white font-semibold"
              >
                + Agregar orden
              </button>
              <button
                onClick={() => !hasPendingOrders && setShowChargeModal(true)}
                disabled={hasPendingOrders}
                className={`mt-2 px-3 py-1 rounded block w-full font-semibold ${
                  hasPendingOrders
                    ? "bg-gray-500 cursor-not-allowed text-white"
                    : "bg-[#646cffaa] text-black shadow-[0_0_10px_#646cffaa] hover:shadow-[0_0_15px_#646cff] transition"
                }`}
              >
                COBRAR
              </button>
            </>
          )}
        </div>
        {/*                    SECCION DE ORDENES               */}

        <div className="col-span-2 shadow-xl bg-white p-4 rounded-xl text-black overflow-y-auto">
  <h2 className="font-bold mb-2">Órdenes pendientes</h2>

  {activeOrders.map((order) => {
    const isReady = order.status === "ready";
    return (
      <div
        key={order.id}
        className="relative bg-white rounded-lg shadow-xl p-2 mb-4 border"
      >
        {isReady && (
          <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-2 py-4 rounded-bl-md shadow">
            ORDEN LISTA PARA ENTREGAR 
          </div>
        )}

        <p className="font-semibold mb-1">Total: ${order.total}</p>

        {order.recipes && order.recipes.length > 0 ? (
          <div className="text-black grid grid-cols-2 gap-2 p-2">
            {order.recipes.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div>
                  <p className="font-bold text-sm">{item.name}</p>
                  <p className="text-xs">Cantidad: {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Sin recetas</p>
        )}

        {order.recipes.length > 0 && (
          <button
            onClick={() => handleDeliver(order.id)}
            className="mt-2 bg-[#4d52b0] px-2 py-1 font-semi-bold text-white rounded text-sm"
          >
            ENTREGAR
          </button>
        )}
        <button
          onClick={() => setSelectedOrder(order)}
          className="mt-1 bg-[#3d408a] font-semi-bold text-white px-2 py-1 text-sm rounded"
        >
          Modificar
        </button>
      </div>
    );
  })}
</div>


        <div className="shadow-xl bg-white p-4 rounded-xl text-black  p-4 rounded">
          <h2 className="font-bold mb-2">Ordenes entregadas</h2>
          {deliveredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white shadow-xl p-2 mb-2 rounded-md"
            >
              {order.recipes.map((item, index) => (
                <div key={index} className="flex items-center gap-2 mb-1">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm">Cantidad: {item.quantity}</p>
                  </div>
                </div>
              ))}
              <p className="mt-1">Total: ${order.total}</p>
            </div>
          ))}
        </div>
      </div>

      {showChargeModal && id && (
        <ChargeModal
          tableId={id}
          onClose={() => setShowChargeModal(false)}
          onPaid={() => {
            setShowChargeModal(false);
            getTableById(id).then(setTableInfo); // <- actualiza estado
          }}
        />
      )}

      {showAddModal && id && (
        <AddOrderModal
          tableId={id}
          onClose={() => setShowAddModal(false)}
          onRefresh={() => getOrdersByTable(id).then(setOrders)}
        />
      )}
      {selectedOrder && (
        <EditOrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => {
            if (id) getOrdersByTable(id).then(setOrders);
          }}
        />
      )}
    </div>
  );
};

export default TableDetailPage;
