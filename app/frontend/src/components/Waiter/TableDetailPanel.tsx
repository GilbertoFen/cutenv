import { useEffect, useState } from "react";
import { useTableRealtime } from "../../hooks/useRealTimeTable";
import { getTableById, updateTableStatus } from "../../services/TableService";
import { getWaiterSocket } from "../../gateways/socketWaiter";
import { getTablesSocket } from "../../gateways/tableSocket";
import {
  getOrdersByTable,
  updateOrderStatus,
} from "../../services/OrderService";
import {
  getUnpaidSaleByTable,
  requestTicket,
} from "../../services/SaleService";

import AddOrderModal from "./AddOrderModal"; 
import ChargeModal from "./ChargeModal";
import EditOrderModal from "./EditOrderModal";

import type { Order, Table } from "../../types";

type TableStatusPayload = {
  tableId: string;
  number: number;
  prevStatus: "disponible" | "ocupada" | "reservada";
  status: "disponible" | "ocupada" | "reservada";
  at: number;
};

type Props = {
  tableId: string;             
  onClose: () => void;       
};

export default function TableDetailPanel({ tableId, onClose }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tableInfo, setTableInfo] = useState<Table | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [occupying, setOccupying] = useState(false);

  // ===== Sockets: waiter (eventos de órdenes) =====
  useEffect(() => {
    if (!tableId || !tableInfo?.number) return;

    const socket = getWaiterSocket();
    const base = (import.meta as any).env?.VITE_API_URL;
    console.log("[WS waiter][DEBUG] Panel connecting to /waiter. API =", base);

    const onOrderUpdated = (o: Order) => {
      console.log("[WS waiter][DEBUG] order.updated", o);
      if (o.tableNumber !== tableInfo.number) {
        setOrders((prev) => prev.filter((x) => x.id !== o.id));
        return;
      }
      setOrders((prev) => {
        const i = prev.findIndex((x) => x.id === o.id);
        if (i === -1) return [o, ...prev];
        const next = prev.slice();
        next[i] = o;
        return next;
      });
    };

    const onStatusChanged = (p: { id: string; status: string; tableNumber?: number }) => {
      console.log("[WS waiter][DEBUG] order.status.changed", p);
      setOrders((prev) => {
        const i = prev.findIndex((x) => x.id === p.id);
        if (i === -1) return prev;
        const next = prev.slice();
        next[i] = { ...next[i], status: p.status };
        return next;
      });
    };

    socket.on("order.updated", onOrderUpdated);
    socket.on("order.status.changed", onStatusChanged);

    return () => {
      socket.off("order.updated", onOrderUpdated);
      socket.off("order.status.changed", onStatusChanged);
    };
  }, [tableId, tableInfo?.number]);

  useEffect(() => {
    if (tableId) {
      getTableById(tableId).then(setTableInfo);
      getOrdersByTable(tableId).then(setOrders);
    }
  }, [tableId]);

  useEffect(() => {
    console.log("Mesa actual:", tableInfo?.number);
    console.log("Todas las órdenes:", orders);
  }, [orders, tableInfo]);

  useEffect(() => {
    if (!tableId) return;
    const s = getTablesSocket();

    const onConnect = () => {
      console.log("[WS tables] connected, joining room table:", tableId);
      s.emit("joinTable", { tableId });
    };
    const onChange = (p: TableStatusPayload) => {
      console.log("[WS tables] table.status.changed", p);
      if (p.tableId !== tableId) return;
      setTableInfo((prev) => (prev ? { ...prev, status: p.status } : prev));

      if (p.status === "disponible") {
        setOrders([]);
        setSelectedOrder(null);
        setShowAddModal(false);
        setShowChargeModal(false);
      }
    };

    s.on("connect", onConnect);
    s.on("table.status.changed", onChange);

    return () => {
      try {
        s.emit("leaveTable", { tableId });
      } catch {}
      s.off("connect", onConnect);
      s.off("table.status.changed", onChange);
    };
  }, [tableId]);

  useTableRealtime(tableId, (p) => {
    setTableInfo((t) => (t ? { ...t, status: p.status } : t));
  });

  const handleDeliver = async (orderId: string) => {
    await updateOrderStatus(orderId, "delivered");
    if (tableId) {
      const updated = await getOrdersByTable(tableId);
      setOrders(updated);
    }
  };

  const occupyTable = async () => {
    if (!tableId) return;
    try {
      setOccupying(true);
      await updateTableStatus(tableId, "ocupada");
      const updated = await getTableById(tableId);
      setTableInfo(updated);
    } catch (error) {
      console.error("Error al ocupar la mesa:", error);
      alert("No se pudo ocupar la mesa");
    } finally {
      setOccupying(false);
    }
  };

  const activeOrders = Array.isArray(orders)
    ? orders.filter(
        (o) =>
          (o.status === "preparing" || o.status === "ready") &&
          o.tableNumber === tableInfo?.number
      )
    : [];

  const deliveredOrders = Array.isArray(orders)
    ? orders.filter(
        (o) => o.status === "delivered" && o.tableNumber === tableInfo?.number
      )
    : [];

  const hasPendingOrders = Array.isArray(orders)
    ? orders.some(
        (o) =>
          o.tableNumber === tableInfo?.number &&
          o.status !== "delivered" &&
          (o.recipes?.length ?? 0) > 0
      )
    : false;

  const deliveredTotal = Array.isArray(orders)
    ? orders
        .filter((o) => o.tableNumber === tableInfo?.number && o.status === "delivered")
        .reduce((acc, o) => acc + (o.total ?? 0), 0)
    : 0;

  const canRequestTicket = !hasPendingOrders && deliveredTotal > 0;

  return (
    <div className="bg-white text-black rounded-lg w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="text-black text-center font-semibold">
          Mesa {tableInfo?.number} {tableInfo?.status?.toUpperCase?.()}
        </div>
        <button
          onClick={onClose}
          className="bg-gray-200 text-black px-3 py-1 rounded hover:bg-gray-300"
        >
          Cerrar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        <div className="shadow-xl bg-white p-4 rounded-xl">
          <h2 className="font-bold">Info de la mesa</h2>
          <p>Estado: {tableInfo?.status}</p>
          <p>Capacidad: {tableInfo?.capacity}</p>

          {tableInfo?.status === "disponible" && (
            <button
              onClick={occupyTable}
              disabled={occupying}
              className="mt-2 bg-gray-300 text-black px-3 py-1 rounded disabled:opacity-60"
            >
              {occupying ? "Ocupando…" : "Ocupar mesa"}
            </button>
          )}

          {tableInfo?.status === "ocupada" && (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 bg-[#14144f] px-3 py-1 rounded block w-full text-white font-semibold"
              >
                + Agregar orden
              </button>

              <button
                onClick={async () => {
                  try {
                    const s = await getUnpaidSaleByTable(tableId);
                    if (!s?.id) return alert("No hay venta abierta para esta mesa.");
                    await requestTicket(s.id);
                    alert("Ticket solicitado al cajero.");
                  } catch (e) {
                    console.error(e);
                    alert("No se pudo solicitar el ticket.");
                  }
                }}
                disabled={!canRequestTicket}
                title={
                  canRequestTicket
                    ? "Solicitar impresión del ticket"
                    : hasPendingOrders
                    ? "No puedes solicitar impresión: hay órdenes pendientes"
                    : "No hay consumo entregado para imprimir"
                }
                className={`mt-2 px-3 py-1 rounded block w-full font-semibold transition
                  ${
                    canRequestTicket
                      ? "bg-[#646cffaa] text-black shadow-[0_0_10px_#646cffaa] hover:shadow-[0_0_15px_#646cff]"
                      : "bg-gray-500 text-white cursor-not-allowed"
                  }`}
              >
                Solicitar ticket
              </button>

              {!canRequestTicket && (
                <p className="mt-1 text-xs text-red-600">
                  {hasPendingOrders
                    ? "Hay órdenes sin entregar. Entrega todo antes de solicitar el ticket."
                    : "Aún no hay consumo entregado para imprimir."}
                </p>
              )}
            </>
          )}
        </div>

        <div className="col-span-2 shadow-xl bg-white p-4 rounded-xl overflow-y-auto max-h-[60vh]">
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
                  <div className="grid grid-cols-2 gap-2 p-2">
                    {order.recipes.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded">
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

        <div className="shadow-xl bg-white p-4 rounded-xl">
          <h2 className="font-bold mb-2">Órdenes entregadas</h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {deliveredOrders.map((order) => (
              <div key={order.id} className="bg-white shadow p-2 rounded-md">
                {order.recipes.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 mb-1">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
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
      </div>

       {showChargeModal && tableId && (
        <ChargeModal
          tableId={tableId}
          onClose={() => setShowChargeModal(false)}
          onPaid={() => {
            setShowChargeModal(false);
            getTableById(tableId).then(setTableInfo);
          }}
        />
      )}

      {showAddModal && tableId && (
        <AddOrderModal
          tableId={tableId}
          onClose={() => setShowAddModal(false)}
          onRefresh={() => getOrdersByTable(tableId).then(setOrders)}
        />
      )}

      {selectedOrder && (
        <EditOrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => {
            if (tableId) getOrdersByTable(tableId).then(setOrders);
          }}
        />
      )}
    </div>
  );
}
