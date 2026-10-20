'use client';

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TableCard from "@/components/Waiter/TableCard";
import { getAllTables } from "@/services/TableService";
import { getTablesSocket } from "@/gateways/tableSocket";
import type { Table } from "@/types";
import Modal from "@/components/UI/Modal";
import TableDetailPanel from "@/components/Waiter/TableDetailPanel";
import type { TableStatus, TableStatusLoad } from "@/types/Waiter/waiter.types";
import { useAuth } from "@/context/AuthContext";
import { AppIcon } from "@/components/icons";

export default function WaiterPage() {
  const router = useRouter();
  const { hasWorkerAccess, loading: authLoading } = useAuth();
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
    getAllTables().then((rows: any[]) => setTables(normalizeRows(rows)));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const s = getTablesSocket();

    const onConnect = () => {
      s.emit("joinReception");
    };

    const onChange = (load: TableStatusLoad) => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mesas del Restaurante</h1>
          <p className="text-sm text-slate-500">Módulo de mesero para gestión de mesas, órdenes y solicitudes de tickets</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/worker"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-slate-700 rounded-lg transition"
            title="Volver a los 4 módulos operativos"
          >
            <AppIcon name="arrow-left" size={13} />
            <span>Volver al inicio de trabajador</span>
          </Link>
          <button
            onClick={refresh}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onOpen={() => setSelectedTableId(table.id)}
          />
        ))}
      </div>

      <Modal
        open={!!selectedTableId}
        onClose={() => setSelectedTableId(null)}
        title={selectedTableId ? `Detalle de mesa` : undefined}
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
