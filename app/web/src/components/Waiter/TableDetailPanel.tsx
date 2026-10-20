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
    <div className="bg-white text-slate-900 rounded-3xl w-full">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xl shrink-0">
            {tableInfo?.number ?? "—"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Mesa {tableInfo?.number}
              </h2>
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  tableInfo?.status === "ocupada"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : tableInfo?.status === "reservada"
                    ? "bg-purple-50 text-purple-800 border border-purple-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    tableInfo?.status === "ocupada"
                      ? "bg-amber-500"
                      : tableInfo?.status === "reservada"
                      ? "bg-purple-500"
                      : "bg-emerald-500"
                  }`}
                ></span>
                <span>{tableInfo?.status}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Capacidad: {tableInfo?.capacity} comensales • Control de órdenes y entrega
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95 self-start sm:self-auto"
        >
          ✕ Cerrar panel
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Table Actions & Info (3-4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="border border-slate-200/90 bg-slate-50/70 p-5 rounded-2xl shadow-soft-xs space-y-3.5">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
              Acciones de Mesa
            </h3>

            {tableInfo?.status === "disponible" && (
              <button
                onClick={occupyTable}
                disabled={occupying}
                className="w-full min-h-[46px] bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-soft-xs transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
              >
                {occupying ? (
                  <span>Ocupando mesa…</span>
                ) : (
                  <>
                    <AppIcon name="users" size={16} />
                    <span>Ocupar mesa</span>
                  </>
                )}
              </button>
            )}

            {tableInfo?.status === "ocupada" && (
              <div className="space-y-2.5">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl font-extrabold text-sm shadow-soft-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <span className="text-lg font-black">+</span>
                  <span>Agregar Nueva Comanda</span>
                </button>

                <button
                  onClick={async () => {
                    try {
                      const s = await getUnpaidSaleByTable(tableId);
                      if (!s?.id) return alert("No hay venta abierta para esta mesa.");
                      await requestTicket(s.id);
                      alert("Ticket solicitado al cajero exitosamente.");
                    } catch (e) {
                      console.error(e);
                      alert("No se pudo solicitar el ticket.");
                    }
                  }}
                  disabled={!canRequestTicket}
                  title={
                    canRequestTicket
                      ? "Solicitar impresión del ticket al cajero"
                      : hasPendingOrders
                      ? "Hay órdenes pendientes de entrega en cocina"
                      : "No hay consumo entregado para imprimir"
                  }
                  className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                    canRequestTicket
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-soft-xs active:scale-95"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <AppIcon name="print" size={16} />
                  <span>Solicitar Ticket al Cajero</span>
                </button>

                {!canRequestTicket && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                    {hasPendingOrders
                      ? "⚠️ Entrega todos los platillos pendientes antes de solicitar la cuenta."
                      : "Aún no se ha entregado consumo a esta mesa."}
                  </p>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Consumo Entregado:</span>
                <span className="font-bold text-slate-900">${deliveredTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Comandas en cola:</span>
                <span className="font-bold text-slate-900">{activeOrders.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Pending Orders (5 cols) */}
        <div className="lg:col-span-5 border border-slate-200/90 bg-white p-5 rounded-2xl shadow-soft-xs overflow-y-auto max-h-[65vh]">
          <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <span>Órdenes en Cocina</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-black px-2 py-0.5 rounded-full border border-indigo-100">
                {activeOrders.length}
              </span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Tiempo real</span>
          </div>

          {activeOrders.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
              <AppIcon name="chef" size={32} className="mx-auto text-slate-300 mb-1.5" />
              <p className="text-xs font-bold text-slate-600">No hay órdenes pendientes</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Todas las comandas han sido entregadas o la mesa está libre.</p>
            </div>
          ) : (
            activeOrders.map((order) => {
              const isReady = order.status === "ready";
              return (
                <div
                  key={order.id}
                  className={`relative rounded-2xl p-4 mb-3.5 border transition-all ${
                    isReady
                      ? "bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-400/40"
                      : "bg-white border-slate-200/90 shadow-soft-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-black text-slate-900">
                      Total: ${Number(order.total || 0).toFixed(2)}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isReady
                          ? "bg-emerald-600 text-white animate-pulse"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isReady ? "¡Lista en cocina!" : "En preparación"}
                    </span>
                  </div>

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
                            className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-all ${
                              isItemDelivered
                                ? "bg-slate-50 border-slate-200 opacity-60"
                                : isItemReady
                                ? "bg-emerald-50 border-emerald-300 shadow-soft-xs"
                                : "bg-white border-slate-200/80"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <RecipeIcon
                                imageUrl={item.imageUrl}
                                name={item.name}
                                size={22}
                                containerClassName="w-10 h-10 rounded-xl shrink-0 border border-slate-100"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-slate-900 truncate">{item.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-slate-500 font-medium">Cant: {item.quantity}</span>
                                  <span
                                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                      isItemDelivered
                                        ? "bg-slate-200 text-slate-700"
                                        : isItemReady
                                        ? "bg-emerald-600 text-white"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {isItemDelivered ? "✓ Entregado" : isItemReady ? "Listo para servir" : "Preparando"}
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
                                  className={`text-xs font-bold px-3 py-2 rounded-xl shadow-soft-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                                    isItemReady
                                      ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300"
                                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                  }`}
                                  title="Marcar este platillo como entregado a la mesa"
                                >
                                  <AppIcon name="check" size={13} />
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

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    {order.recipes.length > 0 && (
                      <button
                        onClick={() => handleDeliver(order.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 font-bold text-white rounded-xl text-xs transition-all shadow-soft-xs flex items-center gap-1.5 active:scale-95"
                      >
                        <AppIcon name="check" size={13} />
                        <span>Entregar toda la orden</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 text-xs rounded-xl transition-all"
                    >
                      Modificar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Delivered Orders (3 cols) */}
        <div className="lg:col-span-3 border border-slate-200/90 bg-slate-50/60 p-4 rounded-2xl shadow-soft-xs">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Órdenes Entregadas</span>
            <span className="text-[11px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              {deliveredOrders.length}
            </span>
          </h3>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {deliveredOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No hay órdenes entregadas aún</p>
            ) : (
              deliveredOrders.map((order) => (
                <div key={order.id} className="bg-white border border-slate-200/90 p-3 rounded-xl text-xs shadow-soft-xs space-y-2">
                  {order.recipes.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <RecipeIcon
                        imageUrl={item.imageUrl}
                        name={item.name}
                        size={16}
                        containerClassName="w-7 h-7 rounded-lg shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-500">Cant: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-slate-900 text-xs">
                    <span>Total comanda:</span>
                    <span>${Number(order.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
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
