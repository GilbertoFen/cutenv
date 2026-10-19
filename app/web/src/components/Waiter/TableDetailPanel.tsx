'use client';

import { useEffect, useState } from "react";
import { useTableRealtime } from "@/hooks/useRealTimeTable";
import { getTableById, updateTableStatus } from "@/services/TableService";
import { getWaiterSocket } from "@/gateways/socketWaiter";
import { getTablesSocket } from "@/gateways/tableSocket";
import { getOrdersByTable, updateOrderStatus, updateOrderItemStatus } from "@/services/OrderService";
import { getUnpaidSaleByTable, requestTicket } from "@/services/SaleService";

import AddOrderModal from "./AddOrderModal";
import ChargeModal from "./ChargeModal";
import EditOrderModal from "./EditOrderModal";
import type { Order, Table } from "@/types";
import { AppIcon, RecipeIcon } from "@/components/icons";

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

  useEffect(() => {
    if (!tableId || !tableInfo?.number) return;

    const socket = getWaiterSocket();

    const onOrderUpdated = (o: Order) => {
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
      setOrders((prev) => {
        const i = prev.findIndex((x) => x.id === p.id);
        if (i === -1) return prev;
        const next = prev.slice();
        next[i] = { ...next[i], status: p.status };
        return next;
      });
    };

    const onOrderDeleted = (p: { id: string }) => {
      setOrders((prev) => prev.filter((x) => x.id !== p.id));
    };

    socket.on("order.updated", onOrderUpdated);
    socket.on("order.status.changed", onStatusChanged);
    socket.on("order.deleted", onOrderDeleted);

    return () => {
      socket.off("order.updated", onOrderUpdated);
      socket.off("order.status.changed", onStatusChanged);
      socket.off("order.deleted", onOrderDeleted);
    };
  }, [tableId, tableInfo?.number]);

  useEffect(() => {
    if (tableId) {
      getTableById(tableId).then(setTableInfo);
      getOrdersByTable(tableId).then(setOrders);
    }
  }, [tableId]);

  useEffect(() => {
    if (!tableId) return;
    const s = getTablesSocket();

    const onConnect = () => {
      s.emit("joinTable", { tableId });
    };
    const onChange = (p: TableStatusPayload) => {
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

  const [deliveringItemId, setDeliveringItemId] = useState<string | null>(null);
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);

  const handleDeliver = async (orderId: string) => {
    try {
      setDeliveringOrderId(orderId);
      await updateOrderStatus(orderId, "delivered");
      if (tableId) {
        const updated = await getOrdersByTable(tableId);
        setOrders(updated);
      }
    } catch (e) {
      console.error('Error al entregar toda la orden:', e);
      alert('No se pudo entregar la orden completa.');
    } finally {
      setDeliveringOrderId(null);
    }
  };

  const handleDeliverItem = async (orderId: string, itemId: string) => {
    try {
      setDeliveringItemId(itemId);
      await updateOrderItemStatus(orderId, itemId, 'delivered');
      if (tableId) {
        const updated = await getOrdersByTable(tableId);
        setOrders(updated);
      }
    } catch (e) {
      console.error('Error al entregar platillo:', e);
      alert('No se pudo marcar el platillo como entregado.');
    } finally {
      setDeliveringItemId(null);
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
          o.status !== "delivered" &&
          o.status !== "cancelled" &&
          (!tableInfo?.number || o.tableNumber === tableInfo?.number) &&
          (o.recipes?.length ?? 0) > 0
      )
    : [];

  const deliveredOrders = Array.isArray(orders)
    ? orders.filter(
        (o) =>
          o.status === "delivered" &&
          (!tableInfo?.number || o.tableNumber === tableInfo?.number)
      )
    : [];

  const hasPendingOrders = Array.isArray(orders)
    ? orders.some(
        (o) =>
          (!tableInfo?.number || o.tableNumber === tableInfo?.number) &&
          o.status !== "delivered" &&
          o.status !== "cancelled" &&
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
    <div className="bg-white text-slate-900 rounded-xl w-full">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
        <div className="text-slate-900 font-bold text-lg flex items-center gap-2">
          <span>Mesa {tableInfo?.number}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
            tableInfo?.status === 'ocupada'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            {tableInfo?.status}
          </span>
        </div>
        <button
          onClick={onClose}
          className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-slate-200"
        >
          Cerrar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        <div className="border border-slate-200 bg-slate-50 p-4 rounded-xl shadow-sm">
          <h2 className="font-bold text-sm text-slate-800 mb-2">Info de la mesa</h2>
          <p className="text-xs text-slate-600 mb-1">Estado: <strong className="text-slate-800">{tableInfo?.status}</strong></p>
          <p className="text-xs text-slate-600 mb-3">Capacidad: <strong className="text-slate-800">{tableInfo?.capacity} personas</strong></p>

          {tableInfo?.status === "disponible" && (
            <button
              onClick={occupyTable}
              disabled={occupying}
              className="mt-2 bg-[#14144f] hover:bg-[#1f1f6d] text-white px-3 py-2 rounded-lg text-xs font-semibold w-full disabled:opacity-60 transition-colors"
            >
              {occupying ? "Ocupando…" : "Ocupar mesa"}
            </button>
          )}

          {tableInfo?.status === "ocupada" && (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-2 bg-[#14144f] hover:bg-indigo-700 px-3 py-2 rounded-lg block w-full text-white font-semibold text-xs transition-colors"
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
                className={`mt-2 px-3 py-2 rounded-lg block w-full font-semibold text-xs transition ${
                  canRequestTicket
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                }`}
              >
                Solicitar ticket
              </button>

              {!canRequestTicket && (
                <p className="mt-2 text-[11px] text-amber-700">
                  {hasPendingOrders
                    ? "Hay órdenes sin entregar. Entrega todo antes de solicitar el ticket."
                    : "Aún no hay consumo entregado para imprimir."}
                </p>
              )}
            </>
          )}
        </div>

        <div className="col-span-2 border border-slate-200 bg-white p-4 rounded-xl shadow-sm overflow-y-auto max-h-[60vh]">
          <h2 className="font-bold text-sm text-slate-800 mb-3 flex items-center justify-between">
            <span>Órdenes pendientes</span>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{activeOrders.length}</span>
          </h2>

          {activeOrders.length === 0 && (
            <p className="text-xs text-slate-400 py-6 text-center">No hay órdenes pendientes en preparación</p>
          )}

          {activeOrders.map((order) => {
            const isReady = order.status === "ready";
            return (
              <div
                key={order.id}
                className={`relative rounded-xl p-3 mb-3 border ${
                  isReady
                    ? "bg-emerald-50 border-emerald-300"
                    : "bg-white border-slate-200"
                } shadow-sm`}
              >
                {isReady && (
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-1 rounded-bl-lg rounded-tr-xl">
                    ¡ORDEN LISTA!
                  </div>
                )}

                <p className="font-bold text-xs text-slate-800 mb-2">Total: ${order.total}</p>

                {order.recipes && order.recipes.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {order.recipes.map((item, index) => {
                      const isItemReady = item.status === "ready";
                      const isItemDelivered = item.status === "delivered";
                      const targetItemId = item.itemId || item.id || (item as any)._id;
                      const isDelivering = deliveringItemId === targetItemId;

                      return (
                        <div
                          key={index}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                            isItemDelivered
                              ? "bg-slate-50 border-slate-200 opacity-60"
                              : isItemReady
                              ? "bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <RecipeIcon
                              imageUrl={item.imageUrl}
                              name={item.name}
                              size={22}
                              containerClassName="w-9 h-9 rounded-lg shrink-0 border border-slate-100"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-slate-900 truncate">{item.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-slate-500 font-medium">Cant: {item.quantity}</span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isItemDelivered
                                      ? "bg-slate-200 text-slate-700"
                                      : isItemReady
                                      ? "bg-emerald-600 text-white animate-pulse"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {isItemDelivered ? "✓ Entregado" : isItemReady ? "¡Listo para servir!" : "En cocina"}
                                </span>
                              </div>
                              {item.notes && (
                                <p className="text-[10px] text-slate-500 italic mt-0.5 truncate">Nota: {item.notes}</p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center">
                            {isItemDelivered ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-1 rounded-lg">
                                <AppIcon name="check" size={12} />
                                <span>Entregado</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => targetItemId && handleDeliverItem(order.id, targetItemId)}
                                disabled={isDelivering || !targetItemId}
                                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 ${
                                  isItemReady
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                }`}
                                title="Marcar este platillo como entregado a la mesa"
                              >
                                <AppIcon name="check" size={12} />
                                <span>
                                  {isDelivering
                                    ? "Entregando…"
                                    : isItemReady
                                    ? "Entregar platillo"
                                    : "Entregar"}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Sin recetas</p>
                )}

                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  {order.recipes.length > 0 && (
                    <button
                      onClick={() => handleDeliver(order.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 font-bold text-white rounded-lg text-xs transition-colors flex items-center gap-1"
                    >
                      <AppIcon name="check" size={13} />
                      <span>Entregar toda la orden</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-3 py-1.5 text-xs rounded-lg transition-colors"
                  >
                    Modificar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border border-slate-200 bg-white p-4 rounded-xl shadow-sm">
          <h2 className="font-bold text-sm text-slate-800 mb-3">Órdenes entregadas</h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {deliveredOrders.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center">No hay órdenes entregadas aún</p>
            )}
            {deliveredOrders.map((order) => (
              <div key={order.id} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs">
                {order.recipes.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 mb-1">
                    <RecipeIcon
                      imageUrl={item.imageUrl}
                      name={item.name}
                      size={16}
                      containerClassName="w-8 h-8 rounded shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-500">Cant: {item.quantity}</p>
                    </div>
                  </div>
                ))}
                <p className="mt-1 font-bold text-slate-900 border-t pt-1">Total: ${order.total}</p>
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
