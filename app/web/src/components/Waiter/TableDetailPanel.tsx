'use client';

import { useEffect, useState } from "react";
import { useTableRealtime } from "@/hooks/useRealTimeTable";
import { getTableById, updateTableStatus } from "@/services/TableService";
import { getWaiterSocket } from "@/gateways/socketWaiter";
import { getTablesSocket } from "@/gateways/tableSocket";
import { getOrdersByTable, updateOrderStatus, updateOrderItemStatus, dismissWaiterCall } from "@/services/OrderService";
import { getUnpaidSaleByTable, requestTicket } from "@/services/SaleService";

import AddOrderModal from "./AddOrderModal";
import ChargeModal from "./ChargeModal";
import EditOrderModal from "./EditOrderModal";
import type { Order, Table } from "@/types";
import { AppIcon, RecipeIcon } from "@/components/icons";
import { useNotification } from "@/context/NotificationContext";

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
  const { notify, confirm } = useNotification();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tableInfo, setTableInfo] = useState<Table | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [occupying, setOccupying] = useState(false);
  const [deliveringAll, setDeliveringAll] = useState(false);
  const [ticketRequested, setTicketRequested] = useState(false);
  const [requestingTicket, setRequestingTicket] = useState(false);
  const [showAllDelivered, setShowAllDelivered] = useState(false);

  useEffect(() => {
    if (!tableId || !tableInfo?.number) return;

    const socket = getWaiterSocket();

    const onOrderUpdated = (o: Order) => {
      if (o.tableId && tableId && String(o.tableId) !== String(tableId)) return;
      if (o.tableNumber && tableInfo?.number && Number(o.tableNumber) !== Number(tableInfo.number)) return;
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

    const onWaiterCall = () => {
      getOrdersByTable(tableId).then(setOrders);
    };

    socket.on("order.updated", onOrderUpdated);
    socket.on("order.status.changed", onStatusChanged);
    socket.on("order.deleted", onOrderDeleted);
    socket.on("waiter.call", onWaiterCall);
    socket.on("waiter.call.dismissed", onWaiterCall);

    return () => {
      socket.off("order.updated", onOrderUpdated);
      socket.off("order.status.changed", onStatusChanged);
      socket.off("order.deleted", onOrderDeleted);
      socket.off("waiter.call", onWaiterCall);
      socket.off("waiter.call.dismissed", onWaiterCall);
    };
  }, [tableId, tableInfo?.number]);

  useEffect(() => {
    if (tableId) {
      setOrders([]);
      setSelectedOrder(null);
      setTableInfo(null);
      getTableById(tableId).then(setTableInfo);
      getOrdersByTable(tableId).then(setOrders);
      getUnpaidSaleByTable(tableId).then((s) => {
        if (s?.ticketStatus === 'requested' || s?.ticketStatus === 'printed') {
          setTicketRequested(true);
        } else {
          setTicketRequested(false);
        }
      }).catch(() => setTicketRequested(false));
    } else {
      setOrders([]);
      setSelectedOrder(null);
      setTableInfo(null);
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
        onClose();
      }
    };

    if (s.connected) {
      s.emit("joinTable", { tableId });
    }

    s.on("connect", onConnect);
    s.on("table.status.changed", onChange);

    return () => {
      try {
        s.emit("leaveTable", { tableId });
      } catch { }
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
    if (deliveringOrderId || deliveringAll) return;
    try {
      setDeliveringOrderId(orderId);
      await updateOrderStatus(orderId, "delivered");
      if (tableId) {
        const updated = await getOrdersByTable(tableId);
        setOrders(updated);
      }
      notify.success('Orden entregada a la mesa exitosamente.');
    } catch (e: any) {
      console.error('Error al entregar la orden:', e);
      notify.error(e?.message || 'No se pudo entregar la orden.');
    } finally {
      setDeliveringOrderId(null);
    }
  };

  const handleDeliverAllOrders = async () => {
    if (deliveringAll || deliveringOrderId || activeOrders.length === 0) return;
    try {
      setDeliveringAll(true);
      for (const ord of activeOrders) {
        if (ord.status !== 'delivered' && ord.status !== 'cancelled') {
          await updateOrderStatus(ord.id, "delivered");
        }
      }
      if (tableId) {
        const updated = await getOrdersByTable(tableId);
        setOrders(updated);
      }
      notify.success(`Se entregaron ${activeOrders.length} comanda(s) a la mesa.`);
    } catch (e: any) {
      console.error('Error al entregar todas las órdenes:', e);
      notify.error(e?.message || 'No se pudieron entregar todas las órdenes.');
    } finally {
      setDeliveringAll(false);
    }
  };

  const handleDeliverItem = async (orderId: string, itemId: string) => {
    if (deliveringItemId) return;
    try {
      setDeliveringItemId(itemId);
      await updateOrderItemStatus(orderId, itemId, 'delivered');
      if (tableId) {
        const updated = await getOrdersByTable(tableId);
        setOrders(updated);
      }
      notify.success('Platillo entregado a la mesa.');
    } catch (e: any) {
      console.error('Error al entregar platillo:', e);
      notify.error(e?.message || 'No se pudo marcar el platillo como entregado.');
    } finally {
      setDeliveringItemId(null);
    }
  };

  const handleCancelItem = async (orderId: string, itemId: string, itemName: string) => {
    const ok = await confirm({
      title: `Cancelar platillo "${itemName}"`,
      message: `¿Deseas cancelar este platillo de la comanda? Su importe se descontará automáticamente del total de la comanda y de la venta activa, y sus insumos se reintegrarán al stock.`,
      confirmText: 'Sí, cancelar platillo',
      cancelText: 'Volver',
      type: 'warning',
    });
    if (!ok) return;

    try {
      await updateOrderItemStatus(orderId, itemId, 'cancelled');
      notify.success(`Platillo "${itemName}" cancelado. Cuenta recalculada.`);
      if (tableId) {
        const updated = await getOrdersByTable(tableId);
        setOrders(updated);
      }
    } catch (e: any) {
      console.error('Error al cancelar platillo:', e);
      notify.error(e?.message || 'No se pudo cancelar el platillo.');
    }
  };

  const handleDismissCall = async (orderId: string, itemId: string) => {
    try {
      await dismissWaiterCall(orderId, itemId);
      if (tableId) {
        const updated = await getOrdersByTable(tableId);
        setOrders(updated);
      }
      notify.info('Aviso descartado.');
    } catch (e: any) {
      notify.error(e?.message || 'Error al descartar aviso.');
    }
  };

  const occupyTable = async () => {
    if (!tableId) return;
    try {
      setOccupying(true);
      await updateTableStatus(tableId, "ocupada");
      const updated = await getTableById(tableId);
      setTableInfo(updated);
      setOrders([]);
      notify.success("Mesa ocupada correctamente.");
    } catch (error: any) {
      console.error("Error al ocupar la mesa:", error);
      notify.error(error?.message || "No se pudo ocupar la mesa");
    } finally {
      setOccupying(false);
    }
  };

  const activeOrders = Array.isArray(orders)
    ? orders.filter(
      (o) =>
        o.status !== "delivered" &&
        o.status !== "cancelled" &&
        (!tableInfo?.number || !o.tableNumber || Number(o.tableNumber) === Number(tableInfo?.number)) &&
        (o.recipes?.length ?? 0) > 0
    )
    : [];

  const deliveredOrders = Array.isArray(orders)
    ? orders.filter(
      (o) =>
        o.status === "delivered" &&
        (!tableInfo?.number || !o.tableNumber || Number(o.tableNumber) === Number(tableInfo?.number))
    )
    : [];

  const hasPendingOrders = Array.isArray(orders)
    ? orders.some(
      (o) =>
        (!tableInfo?.number || !o.tableNumber || Number(o.tableNumber) === Number(tableInfo?.number)) &&
        o.status !== "delivered" &&
        o.status !== "cancelled" &&
        (o.recipes?.length ?? 0) > 0
    )
    : false;

  const deliveredTotal = Array.isArray(orders)
    ? orders
      .filter((o) => (!tableInfo?.number || !o.tableNumber || Number(o.tableNumber) === Number(tableInfo?.number)) && o.status === "delivered")
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
                className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 ${tableInfo?.status === "ocupada"
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : tableInfo?.status === "reservada"
                    ? "bg-purple-50 text-purple-800 border border-purple-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${tableInfo?.status === "ocupada"
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
                    if (requestingTicket) return;
                    try {
                      setRequestingTicket(true);
                      const s = await getUnpaidSaleByTable(tableId);
                      if (!s?.id) {
                        notify.warning("No hay venta abierta para esta mesa.");
                        return;
                      }
                      await requestTicket(s.id);
                      setTicketRequested(true);
                      notify.success("Ticket solicitado correctamente.");
                    } catch (e: any) {
                      console.error(e);
                      notify.error(e?.message || "No fue posible solicitar el ticket.");
                    } finally {
                      setRequestingTicket(false);
                    }
                  }}
                  disabled={!canRequestTicket || requestingTicket}
                  title={
                    ticketRequested
                      ? "El ticket ya fue solicitado al cajero"
                      : canRequestTicket
                        ? "Solicitar impresión del ticket al cajero"
                        : hasPendingOrders
                          ? "Hay órdenes pendientes de entrega en cocina"
                          : "No hay consumo entregado para imprimir"
                  }
                  className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${ticketRequested
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft-xs"
                      : canRequestTicket
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-soft-xs active:scale-95"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                >
                  <AppIcon name={ticketRequested ? "check" : "print"} size={16} />
                  <span>
                    {requestingTicket
                      ? "Solicitando..."
                      : ticketRequested
                        ? "✓ Ticket Solicitado"
                        : "Solicitar Ticket al Cajero"}
                  </span>
                </button>

                {!canRequestTicket && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                    {hasPendingOrders
                      ? "Entrega todos los platillos pendientes antes de solicitar la cuenta."
                      : "Aún no se ha entregado consumo a esta mesa."}
                  </p>
                )}

                {activeOrders.length === 0 && deliveredTotal === 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Liberar mesa",
                        message: "Esta mesa no tiene comandas registradas. ¿Deseas liberarla y marcarla como disponible?",
                        confirmText: "Sí, liberar",
                        cancelText: "Cancelar",
                        type: "warning",
                      });
                      if (!ok) return;
                      try {
                        await updateTableStatus(tableId, "disponible");
                        notify.success("Mesa liberada correctamente y marcada como disponible.");
                        onClose();
                      } catch (err: any) {
                        notify.error(err?.message || "No se pudo liberar la mesa.");
                      }
                    }}
                    className="w-full min-h-[42px] bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>↺ Liberar mesa vacía</span>
                  </button>
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
            {activeOrders.length > 1 ? (
              <button
                type="button"
                onClick={handleDeliverAllOrders}
                disabled={deliveringAll || Boolean(deliveringOrderId)}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl transition-all shadow-soft-xs flex items-center gap-1.5 active:scale-95"
                title="Entregar todas las órdenes de la mesa"
              >
                <AppIcon name="check" size={13} />
                <span>{deliveringAll ? 'Entregando todas…' : 'Entregar todas las órdenes'}</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">Tiempo real</span>
            )}
          </div>

          {activeOrders.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
              <AppIcon name="chef" size={32} className="mx-auto text-slate-300 mb-1.5" />
              <p className="text-xs font-bold text-slate-600">No hay órdenes pendientes</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Todas las comandas han sido entregadas o la mesa está libre.</p>
            </div>
          ) : (
            activeOrders.map((order) => {
              const activeRecipes = (order.recipes || []).filter((r: any) => r.status !== 'cancelled');
              const isAllReady = activeRecipes.length > 0 && activeRecipes.every((r: any) => r.status === 'ready' || r.status === 'delivered');
              const isReady = order.status === "ready" || isAllReady;

              return (
                <div
                  key={order.id}
                  className={`relative rounded-2xl p-4 mb-3.5 border transition-all ${isReady
                    ? "bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-400/40"
                    : "bg-white border-slate-200/90 shadow-soft-xs"
                    }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">
                        Total: ${Number(order.total || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {activeRecipes.filter((r: any) => r.status === 'ready' || r.status === 'delivered').length} de {activeRecipes.length} platillos listos
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${isReady
                        ? "bg-emerald-600 text-white animate-pulse"
                        : "bg-amber-100 text-amber-800"
                        }`}
                    >
                      {isReady ? "¡Lista para entregar!" : "En preparación"}
                    </span>
                  </div>

                  {order.recipes && order.recipes.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {order.recipes.map((item, index) => {
                        const isItemReady = item.status === "ready";
                        const isItemDelivered = item.status === "delivered";
                        const isItemCancelled = item.status === "cancelled";
                        const targetItemId = item.itemId || item.id || (item as any)._id;
                        const isDelivering = deliveringItemId === targetItemId;
                        const isExplicitCall =
                          Boolean(item.callWaiter?.requested) &&
                          (
                            Boolean((item.callWaiter as any)?.isExplicitCall) ||
                            item.callWaiter?.reason !== 'ready' ||
                            (Boolean(item.callWaiter?.message) && item.callWaiter.message !== 'Platillo listo para entregar')
                          );
                        const hasCall = isExplicitCall;

                        return (
                          <div
                            key={index}
                            className={`flex flex-col gap-2 p-2.5 rounded-xl border transition-all ${isItemCancelled
                                ? "bg-slate-50 border-slate-200 opacity-50"
                                : isItemDelivered
                                  ? "bg-slate-50 border-slate-200 opacity-60"
                                  : isItemReady
                                    ? "bg-emerald-50 border-emerald-300 shadow-soft-xs"
                                    : hasCall
                                      ? "bg-orange-50 border-orange-300 shadow-soft-xs"
                                      : "bg-white border-slate-200/80"
                              }`}
                          >
                            <div className="flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <RecipeIcon
                                  imageUrl={item.imageUrl}
                                  name={item.name}
                                  size={22}
                                  containerClassName="w-10 h-10 rounded-xl shrink-0 border border-slate-100"
                                />
                                <div className="min-w-0">
                                  <p className={`font-bold text-xs truncate ${isItemCancelled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                    {item.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] text-slate-500 font-medium">Cant: {item.quantity}</span>
                                    <span
                                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isItemCancelled
                                          ? "bg-rose-100 text-rose-800"
                                          : isItemDelivered
                                            ? "bg-slate-200 text-slate-700"
                                            : isItemReady
                                              ? "bg-emerald-600 text-white"
                                              : item.status === 'pending'
                                                ? "bg-sky-100 text-sky-800"
                                                : "bg-amber-100 text-amber-800"
                                        }`}
                                    >
                                      {isItemCancelled
                                        ? "Cancelado"
                                        : isItemDelivered
                                          ? "✓ Entregado"
                                          : isItemReady
                                            ? "Listo"
                                            : item.status === 'pending'
                                              ? "Pendiente"
                                              : "Preparando"}
                                    </span>
                                  </div>
                                  {item.notes && (
                                    <p className="text-[10px] text-slate-500 italic mt-0.5 truncate">Nota: {item.notes}</p>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-1.5">
                                {isItemDelivered ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-1 rounded-lg">
                                    <AppIcon name="check" size={12} />
                                    <span>Entregado</span>
                                  </span>
                                ) : isItemCancelled ? (
                                  <span className="inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                                    Cancelado
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => targetItemId && handleDeliverItem(order.id, targetItemId)}
                                      disabled={isDelivering || !targetItemId}
                                      className={`text-xs font-bold px-3 py-1.5 rounded-xl shadow-soft-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${isItemReady
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400 shadow-sm"
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                        }`}
                                      title="Marcar este platillo individual como entregado a la mesa"
                                    >
                                      <AppIcon name="check" size={13} />
                                      <span>
                                        {isDelivering
                                          ? "Entregando…"
                                          : "Entregar platillo"}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => targetItemId && handleCancelItem(order.id, targetItemId, item.name)}
                                      className="text-[11px] font-bold px-2 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition active:scale-95"
                                      title="Cancelar platillo de la comanda (recalcula total y devuelve inventario)"
                                    >
                                      <AppIcon name="close" size={12} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Alerta de Cocina en el Platillo */}
                            {hasCall && item.callWaiter && (
                              <div className="mt-1 p-2.5 rounded-xl bg-orange-100/90 border border-orange-300 text-orange-950 text-xs space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="font-extrabold flex items-center gap-1.5 text-orange-900">
                                      <AppIcon name={item.callWaiter.reason === 'ready' ? 'check' : 'warning'} size={13} className="text-orange-700" />
                                      <span>
                                        {item.callWaiter.reason === 'ready' && 'Aviso de cocina: Platillo listo para recoger'}
                                        {item.callWaiter.reason === 'unavailable' && 'Aviso de cocina: Platillo no disponible'}
                                        {item.callWaiter.reason === 'issue' && 'Alerta de cocina: Problema en preparación'}
                                        {item.callWaiter.reason === 'other' && 'Aviso de cocina: Observación'}
                                      </span>
                                    </span>
                                    {item.callWaiter.message && (
                                      <p className="text-[11px] text-orange-900 mt-0.5 italic">&ldquo;{item.callWaiter.message}&rdquo;</p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => targetItemId && handleDismissCall(order.id, targetItemId)}
                                    className="text-[10px] font-bold text-orange-800 hover:text-orange-950 underline shrink-0"
                                  >
                                    Descartar aviso
                                  </button>
                                </div>

                                {item.callWaiter.reason === 'unavailable' && !isItemCancelled && (
                                  <div className="pt-1.5 border-t border-orange-200/80 flex items-center justify-between">
                                    <span className="text-[11px] text-orange-900 font-medium">
                                      Consulta con el comensal si desea cancelar o sustituir:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => targetItemId && handleCancelItem(order.id, targetItemId, item.name)}
                                      className="px-2.5 py-1 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition active:scale-95 shadow-soft-xs"
                                    >
                                      Cancelar platillo de la cuenta
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
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
                        type="button"
                        onClick={() => handleDeliver(order.id)}
                        disabled={deliveringOrderId === order.id || deliveringAll}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed px-3.5 py-2 font-bold text-white rounded-xl text-xs transition-all shadow-soft-xs flex items-center gap-1.5 active:scale-95"
                      >
                        <AppIcon name="check" size={13} />
                        <span>{deliveringOrderId === order.id ? 'Entregando…' : 'Entregar orden'}</span>
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

          {deliveredOrders.length > 2 && (
            <div className="mb-2.5 flex items-center justify-between text-[11px] text-slate-500 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
              <span>{showAllDelivered ? 'Mostrando todas las órdenes' : 'Pila compacta (últimas 2)'}</span>
              <button
                type="button"
                onClick={() => setShowAllDelivered(!showAllDelivered)}
                className="font-bold text-indigo-600 hover:text-indigo-800 underline text-[11px]"
              >
                {showAllDelivered ? 'Contraer' : `Ver todas (${deliveredOrders.length})`}
              </button>
            </div>
          )}

          <div className={`space-y-2.5 overflow-y-auto pr-1 transition-all ${showAllDelivered ? 'max-h-[75vh]' : 'max-h-[360px]'}`}>
            {deliveredOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No hay órdenes entregadas aún</p>
            ) : (
              (showAllDelivered ? deliveredOrders : deliveredOrders.slice(-2)).map((order, idx) => (
                <div
                  key={order.id}
                  className={`bg-white border border-slate-200/90 p-3 rounded-xl text-xs shadow-soft-xs space-y-2 transition-all ${!showAllDelivered && deliveredOrders.length > 2 && idx === 0
                      ? 'border-indigo-100 ring-1 ring-indigo-50/50'
                      : ''
                    }`}
                >
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

          {deliveredOrders.length > 2 && (
            <button
              type="button"
              onClick={() => setShowAllDelivered(!showAllDelivered)}
              className="w-full mt-3 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 shadow-soft-xs active:scale-95"
            >
              <AppIcon name={showAllDelivered ? 'view' : 'orders'} size={14} />
              <span>{showAllDelivered ? 'Contraer (mostrar últimas 2)' : `Ver todas las órdenes (${deliveredOrders.length})`}</span>
            </button>
          )}
        </div>
      </div>

      {showChargeModal && tableId && (
        <ChargeModal
          tableId={tableId}
          onClose={() => setShowChargeModal(false)}
          onPaid={() => {
            setShowChargeModal(false);
            setOrders([]);
            setSelectedOrder(null);
            getTableById(tableId).then(setTableInfo);
            onClose();
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
