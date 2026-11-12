'use client';

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TableCard, { type TableAlert } from "@/components/Waiter/TableCard";
import { getAllTables } from "@/services/TableService";
import { getAllOrders } from "@/services/OrderService";
import { getTablesSocket } from "@/gateways/tableSocket";
import { getWaiterSocket } from "@/gateways/socketWaiter";
import type { Table } from "@/types";
import Modal from "@/components/UI/Modal";
import TableDetailPanel from "@/components/Waiter/TableDetailPanel";
import type { TableStatus, TableStatusLoad } from "@/types/Waiter/waiter.types";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { AppIcon } from "@/components/icons";

export default function WaiterPage() {
  const router = useRouter();
  const { hasWorkerAccess, loading: authLoading } = useAuth();
  const { notify } = useNotification();
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !hasWorkerAccess) {
      router.replace('/worker');
    }
  }, [hasWorkerAccess, authLoading, router]);

  const normalizeRows = (rows: any[]): Table[] =>
    (rows ?? []).map((t: any) => ({
      id: t.id ?? t._id,
      number: Number(t.number),
      capacity: Number(t.capacity ?? 0),
      status: t.status as TableStatus,
    }));

  const refresh = useCallback(() => {
    if (authLoading || !hasWorkerAccess) return;
    getAllTables().then((rows: any[]) => setTables(normalizeRows(rows)));
  }, [authLoading, hasWorkerAccess]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (authLoading || !hasWorkerAccess) return;

    const s = getTablesSocket();

    const onConnect = () => {
      s.emit("joinReception");
    };

    if (s.connected) {
      s.emit("joinReception");
    }

    const onChange = (load: TableStatusLoad) => {
      if (load.status === 'disponible') {
        setAlertsByTable((prev) => {
          const next = { ...prev };
          if (load.tableId) delete next[load.tableId];
          if (load.number) delete next[String(load.number)];
          return next;
        });
      }

      setTables((prev) => {
        let index = prev.findIndex((t) => t.id === load.tableId);
        if (index === -1) index = prev.findIndex((t) => Number(t.number) === Number(load.number));

        if (index === -1) {
          const stub: Table = {
            id: load.tableId,
            number: load.number,
            capacity: 0,
            status: load.status,
          };
          const next = [stub, ...prev];
          refresh();
          return next;
        }

        const next = prev.slice();
        next[index] = { ...next[index], status: load.status };
        return next;
      });
    };

    s.on("connect", onConnect);
    s.on("table.status.changed", onChange);

    return () => {
      s.off("connect", onConnect);
      s.off("table.status.changed", onChange);
    };
  }, [refresh]);

  // Alertas activas de cocina por mesa
  const [alertsByTable, setAlertsByTable] = useState<Record<string, TableAlert[]>>({});

  const extractOrderAlerts = useCallback((order: any): TableAlert[] => {
    if (!order || order.status === 'delivered' || order.status === 'cancelled') return [];
    const alerts: TableAlert[] = [];
    const recipes = Array.isArray(order.recipes) ? order.recipes : [];

    recipes.forEach((r: any) => {
      if (r.status === 'delivered' || r.status === 'cancelled') return;

      if (r.callWaiter?.requested) {
        alerts.push({
          orderId: order.id,
          itemId: r.itemId || r.id,
          reason: r.callWaiter.reason || 'ready',
          message: r.callWaiter.message || '',
          itemName: r.name,
          requestedAt: r.callWaiter.requestedAt,
        });
      } else if (r.status === 'ready') {
        alerts.push({
          orderId: order.id,
          itemId: r.itemId || r.id,
          reason: 'ready',
          message: '¡Platillo listo para entregar!',
          itemName: r.name,
          requestedAt: new Date(),
        });
      }
    });

    if (alerts.length === 0 && order.status === 'ready') {
      alerts.push({
        orderId: order.id,
        itemId: order.id,
        reason: 'ready',
        message: '¡Comanda lista para entregar a la mesa!',
        itemName: 'Comanda lista',
        requestedAt: new Date(),
      });
    }

    return alerts;
  }, []);

  // Cargar órdenes activas iniciales para calcular alertas de platillos/órdenes listos
  useEffect(() => {
    if (authLoading || !hasWorkerAccess) return;

    getAllOrders()
      .then((allOrders) => {
        const initialAlerts: Record<string, TableAlert[]> = {};
        allOrders.forEach((ord: any) => {
          const ordAlerts = extractOrderAlerts(ord);
          if (ordAlerts.length > 0) {
            if (ord.tableId) {
              initialAlerts[ord.tableId] = [...(initialAlerts[ord.tableId] || []), ...ordAlerts];
            }
            if (ord.tableNumber) {
              initialAlerts[String(ord.tableNumber)] = [
                ...(initialAlerts[String(ord.tableNumber)] || []),
                ...ordAlerts,
              ];
            }
          }
        });
        setAlertsByTable(initialAlerts);
      })
      .catch((err) => console.warn('Error loading initial orders for alerts:', err));
  }, [authLoading, hasWorkerAccess, extractOrderAlerts]);

  useEffect(() => {
    if (authLoading || !hasWorkerAccess) return;

    const waiterWs = getWaiterSocket();

    const onItemReady = (data: { orderId: string; itemId: string; tableNumber?: number; itemName?: string }) => {
      notify.success(
        `¡${data.itemName || 'Platillo'} listo para servir!`,
        data.tableNumber ? `Mesa ${data.tableNumber}` : 'Cocina'
      );
    };

    const onWaiterCall = (data: TableAlert & { tableId?: string; tableNumber?: number; isExplicitCall?: boolean }) => {
      const keys = [data.tableId, data.tableNumber ? String(data.tableNumber) : null].filter(Boolean) as string[];
      if (keys.length === 0) return;

      setAlertsByTable((prev) => {
        const next = { ...prev };
        keys.forEach((k) => {
          const current = next[k] || [];
          const filtered = current.filter((a) => a.itemId !== data.itemId);
          next[k] = [data, ...filtered];
        });
        return next;
      });

      if (data.reason !== 'ready' || data.message) {
        notify.warning(
          data.message ? `"${data.message}"` : `Llamado de cocina para ${data.itemName}`,
          data.tableNumber ? `Mesa ${data.tableNumber}` : 'Cocina'
        );
      }
    };

    const onWaiterCallDismissed = (data: { orderId: string; itemId: string; tableId?: string; tableNumber?: number }) => {
      setAlertsByTable((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          next[k] = next[k].filter((a) => a.itemId !== data.itemId);
          if (next[k].length === 0) delete next[k];
        });
        return next;
      });
    };

    const onOrderUpdated = (orderLoad: any) => {
      const tKeyId = orderLoad.tableId ? String(orderLoad.tableId) : null;
      const tKeyNum = orderLoad.tableNumber ? String(orderLoad.tableNumber) : null;
      const orderAlerts = extractOrderAlerts(orderLoad);

      setAlertsByTable((prev) => {
        const next = { ...prev };
        const keysToUpdate = new Set<string>();
        if (tKeyId) keysToUpdate.add(tKeyId);
        if (tKeyNum) keysToUpdate.add(tKeyNum);

        Object.keys(next).forEach((k) => {
          if (next[k].some((a) => a.orderId === orderLoad.id)) {
            keysToUpdate.add(k);
          }
        });

        keysToUpdate.forEach((k) => {
          const remaining = (next[k] || []).filter((a) => a.orderId !== orderLoad.id);
          const isTargetTable = k === tKeyId || k === tKeyNum;
          const merged = isTargetTable ? [...orderAlerts, ...remaining] : remaining;
          if (merged.length > 0) {
            next[k] = merged;
          } else {
            delete next[k];
          }
        });

        return next;
      });
    };

    const onOrderStatusChanged = (data: { id: string; status: string; tableNumber?: number }) => {
      if (data.status === 'delivered' || data.status === 'cancelled') {
        setAlertsByTable((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((k) => {
            next[k] = next[k].filter((a) => a.orderId !== data.id);
            if (next[k].length === 0) delete next[k];
          });
          return next;
        });
      }
    };

    waiterWs.on("waiter.call", onWaiterCall);
    waiterWs.on("waiter.call.dismissed", onWaiterCallDismissed);
    waiterWs.on("order.updated", onOrderUpdated);
    waiterWs.on("order.status.changed", onOrderStatusChanged);
    waiterWs.on("item.ready", onItemReady);

    return () => {
      waiterWs.off("waiter.call", onWaiterCall);
      waiterWs.off("waiter.call.dismissed", onWaiterCallDismissed);
      waiterWs.off("order.updated", onOrderUpdated);
      waiterWs.off("order.status.changed", onOrderStatusChanged);
      waiterWs.off("item.ready", onItemReady);
    };
  }, [authLoading, hasWorkerAccess, extractOrderAlerts]);

  const [filterStatus, setFilterStatus] = useState<'all' | 'disponible' | 'ocupada' | 'reservada'>('all');

  const counts = {
    all: tables.length,
    disponible: tables.filter((t) => t.status === 'disponible').length,
    ocupada: tables.filter((t) => t.status === 'ocupada').length,
    reservada: tables.filter((t) => t.status === 'reservada').length,
  };

  const filteredTables = filterStatus === 'all' ? tables : tables.filter((t) => t.status === filterStatus);

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Validando credenciales de mesero…
        </div>
      </div>
    );
  }

  if (!hasWorkerAccess) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-soft-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Servicio en Sala • Módulo Mesero
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Mesas del Restaurante
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Toca una mesa para abrir comanda, consultar consumo o solicitar ticket al cajero
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/worker"
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-2xl transition active:scale-95 shadow-soft-xs"
            title="Volver a los 4 módulos operativos"
          >
            <AppIcon name="arrow-left" size={14} />
            <span>Inicio de trabajador</span>
          </Link>
          <button
            onClick={refresh}
            className="min-h-[44px] px-4 py-2.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl transition shadow-soft-xs active:scale-95 flex items-center gap-1.5"
          >
            <span>↻</span>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Quick Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => setFilterStatus('all')}
          className={`min-h-[42px] px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 active:scale-95 ${
            filterStatus === 'all'
              ? 'bg-slate-900 text-white shadow-soft-sm'
              : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          <span>Todas las mesas</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            filterStatus === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('disponible')}
          className={`min-h-[42px] px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 active:scale-95 ${
            filterStatus === 'disponible'
              ? 'bg-emerald-600 text-white shadow-soft-sm shadow-emerald-600/20'
              : 'bg-white text-emerald-800 border border-emerald-200/80 hover:bg-emerald-50/50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Disponibles</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            filterStatus === 'disponible' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {counts.disponible}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('ocupada')}
          className={`min-h-[42px] px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 active:scale-95 ${
            filterStatus === 'ocupada'
              ? 'bg-amber-600 text-white shadow-soft-sm shadow-amber-600/20'
              : 'bg-white text-amber-900 border border-amber-200/80 hover:bg-amber-50/50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Ocupadas</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            filterStatus === 'ocupada' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-800'
          }`}>
            {counts.ocupada}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('reservada')}
          className={`min-h-[42px] px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 active:scale-95 ${
            filterStatus === 'reservada'
              ? 'bg-purple-600 text-white shadow-soft-sm shadow-purple-600/20'
              : 'bg-white text-purple-900 border border-purple-200/80 hover:bg-purple-50/50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          <span>Reservadas</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            filterStatus === 'reservada' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-800'
          }`}>
            {counts.reservada}
          </span>
        </button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredTables.map((table) => {
          const tableAlerts = [
            ...(alertsByTable[table.id] || []),
            ...(alertsByTable[String(table.number)] || []),
          ];
          return (
            <TableCard
              key={table.id}
              table={table}
              alerts={tableAlerts}
              onOpen={() => setSelectedTableId(table.id)}
            />
          );
        })}
      </div>

      {/* Modal with Table Detail */}
      <Modal
        open={!!selectedTableId}
        onClose={() => setSelectedTableId(null)}
        title={selectedTableId ? `Mesa en Atención` : undefined}
        maxWidthClass="max-w-6xl"
      >
        {selectedTableId && (
          <TableDetailPanel
            tableId={selectedTableId}
            onClose={() => setSelectedTableId(null)}
          />
        )}
      </Modal>
    </div>
  );
}
