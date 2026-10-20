'use client';

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Table, Reservation } from "@/types";
import { getAllTables } from "@/services/TableService";
import ReceptionistTableCard from "@/components/Receptionist/TableCard";
import ReservationModal from "@/components/Receptionist/ReceptionistModal";
import ReservationDetailsModal from "@/components/Receptionist/ReservationDetailsModal";
import { getTablesSocket } from "@/gateways/tableSocket";
import type { TableStatusLoad } from "@/types/Receptionist/receptionist.types";
import Modal from "@/components/UI/Modal";
import TableDetailPanel from "@/components/Waiter/TableDetailPanel";
import ReservationsListModal from "@/components/Receptionist/ReservationsListModal";
import { useAuth } from "@/context/AuthContext";
import { AppIcon } from "@/components/icons";

export default function ReceptionistPage() {
  const router = useRouter();
  const { hasWorkerAccess, loading: authLoading } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserveFor, setReserveFor] = useState<Table | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [viewRes, setViewRes] = useState<{ reservation: Reservation; table: Table } | null>(null);
  const [resvVersion, setResvVersion] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && !hasWorkerAccess) {
      router.replace('/worker');
    }
  }, [hasWorkerAccess, authLoading, router]);

  const refresh = useCallback(() => {
    setLoading(true);
    getAllTables()
      .then((rows) =>
        setTables(
          (rows ?? []).map((t: any) => ({
            id: t.id ?? t._id,
            number: t.number,
            capacity: t.capacity,
            status: t.status,
          }))
        )
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => {
      refresh();
      setResvVersion((v) => v + 1);
    }, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const s = getTablesSocket();

    const onConnect = () => {
      s.emit("joinReception");
    };

    const onChange = (load: TableStatusLoad) => {
      setTables((prev) => {
        let idx = prev.findIndex(
          (t) => (t as any).id === load.tableId || (t as any)._id === load.tableId
        );

        if (idx === -1) idx = prev.findIndex((t) => Number(t.number) === Number(load.number));

        if (idx === -1) {
          const stub = { id: load.tableId, number: load.number, status: load.status } as any;
          const next = [stub, ...prev];
          getAllTables()
            .then((rows) => {
              setTables(
                (rows ?? []).map((table: any) => ({
                  id: table.id ?? table._id,
                  number: table.number,
                  capacity: table.capacity,
                  status: table.status,
                }))
              );
            })
            .catch(() => {});
          return next;
        }
        const next = prev.slice();
        next[idx] = { ...next[idx], status: load.status };
        return next;
      });
    };

    if (s.connected) {
      s.emit("joinReception");
    }

    s.on("connect", onConnect);
    s.on("table.status.changed", onChange);

    return () => {
      s.off("connect", onConnect);
      s.off("table.status.changed", onChange);
    };
  }, [refresh]);

  const bumpReservations = () => setResvVersion((v) => v + 1);

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Validando credenciales de recepción…
        </div>
      </div>
    );
  }

  if (!hasWorkerAccess) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Módulo de Recepción</h1>
          <p className="text-sm text-slate-500">Asignación de comensales, disponibilidad de mesas y reservaciones</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/worker"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-slate-700 rounded-lg transition"
            title="Volver a los 4 módulos operativos"
          >
            <AppIcon name="arrow-left" size={13} />
            <span>Volver al inicio de trabajador</span>
          </Link>
          <Link
            href="/receptionist"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              pathname === "/receptionist"
                ? "bg-[#14144f] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Vista de Mesas
          </Link>
          <button
            onClick={() => setShowListModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            Lista de Reservaciones
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            + Nueva Reservación
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Cargando estado de mesas…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map((table) => (
                <ReceptionistTableCard
                  key={table.id}
                  table={table}
                  onChanged={refresh}
                  onReserve={(table) => setReserveFor(table)}
                  onViewReservation={(reservation, tab) => setViewRes({ reservation, table: tab })}
                  onOpen={(table) => setSelectedTableId(table.id)}
                  resvVersion={resvVersion}
                />
              ))}
            </div>

            {showNew && (
              <ReservationModal
                table={null}
                tables={tables}
                onClose={() => setShowNew(false)}
                onCreated={() => {
                  setShowNew(false);
                  refresh();
                  bumpReservations();
                }}
              />
            )}

            {reserveFor && (
              <ReservationModal
                table={reserveFor}
                tables={tables}
                onClose={() => setReserveFor(null)}
                onCreated={() => {
                  setReserveFor(null);
                  refresh();
                  bumpReservations();
                }}
              />
            )}

            {viewRes && (
              <ReservationDetailsModal
                reservation={viewRes.reservation}
                table={viewRes.table}
                onClose={() => setViewRes(null)}
                onChanged={() => {
                  refresh();
                  bumpReservations();
                }}
              />
            )}

            <Modal
              open={!!selectedTableId}
              onClose={() => {
                setSelectedTableId(null);
                refresh();
              }}
              title={selectedTableId ? `Detalle de Mesa` : undefined}
              maxWidthClass="max-w-6xl"
            >
              {selectedTableId && (
                <TableDetailPanel
                  tableId={selectedTableId}
                  onClose={() => {
                    setSelectedTableId(null);
                    refresh();
                  }}
                />
              )}
            </Modal>

            <ReservationsListModal
              isOpen={showListModal}
              onClose={() => setShowListModal(false)}
              tables={tables}
              onRefresh={() => {
                refresh();
                bumpReservations();
              }}
              onOpenNewReservation={() => setShowNew(true)}
            />
          </>
        )}
      </div>
    </div>
  );
}
