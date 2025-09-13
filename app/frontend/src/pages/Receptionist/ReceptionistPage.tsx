import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Table, Reservation } from "../../types";
import { getAllTables } from "../../services/TableService";
import ReceptionistTableCard from "../../components/Receptionist/TableCard";
import ReservationModal from "../../components/Receptionist/ReceptionistModal";
import ReservationDetailsModal from "../../components/Receptionist/ReservationDetailsModal";
import { getTablesSocket } from "../../gateways/tableSocket";
import type { TableStatusLoad } from "../../types/Receptionist/receptionist.types";

export default function ReceptionistPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserveFor, setReserveFor] = useState<Table | null>(null);
  const [viewRes, setViewRes] = useState<{ reservation: Reservation; table: Table } | null>(null);
  const [resvVersion, setResvVersion] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const location = useLocation();
  const refresh = useCallback(() => {
    setLoading(true);
    getAllTables()
      .then(rows => setTables((rows ?? []).map((t: any) => ({
        id: t.id ?? t._id,
        number: t.number,
        capacity: t.capacity,
        status: t.status,
      }))))
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
      console.log("[WS /tables] connected; joining reception");
      s.emit("joinReception");
    };

    const onChange = (load: TableStatusLoad) => {
      console.log("[Reception] table.status.changed", load);
      setTables(prev => {
        let idx = prev.findIndex(t => (t as any).id === load.tableId || (t as any)._id === load.tableId);

        if (idx === -1) idx = prev.findIndex(t => Number(t.number) === Number(load.number));

        if (idx === -1) {
          const stub = { id: load.tableId, number: load.number, status: load.status } as any;
          const next = [stub, ...prev];

          getAllTables().then(rows => {
            setTables((rows ?? []).map((table: any) => ({
              id: table.id ?? table._id,
              number: table.number,
              capacity: table.capacity,
              status: table.status,
            })));
          }).catch(() => { });
          return next;
        }
        const next = prev.slice();
        next[idx] = { ...next[idx], status: load.status };
        return next;
      });
    };


    s.on("connect", onConnect);
    s.on("table.status.changed", onChange);

    return () => {
      s.off("connect", onConnect);
      s.off("table.status.changed", onChange);
    };
  }, []);

  const bumpReservations = () => setResvVersion((v) => v + 1);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-[#14144f] p-4 rounded-lg text-center">
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/reception/tables"
            className={`px-3 py-1 rounded ${isActive("/reception/tables") ? "bg-white text-[#14144f] font-semibold" : "text-white underline"}`}
          >
            Mesas
          </Link>
          <Link
            to="/reception/reservations"
            className={`px-3 py-1 rounded ${isActive("/reception/reservations") ? "bg-white text-[#14144f] font-semibold" : "text-white underline"}`}
          >
            Reservaciones
          </Link>
        </div>
      </nav>

      <div className="p-4 flex justify-center">
        <div className="bg-white rounded-lg p-6 w-full max-w-6xl">
          {loading ? (
            <div className="text-center text-black">Cargando mesas…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {tables.map((table) => (
                  <ReceptionistTableCard
                    key={table.id}
                    table={table}
                    onChanged={refresh}
                    onReserve={(table) => setReserveFor(table)}
                    onViewReservation={(reservation, tab) => setViewRes({ reservation, table: tab })}
                    resvVersion={resvVersion}
                  />
                ))}
              </div>

              {showNew && (
                <ReservationModal
                  table={null}
                  tables={tables}
                  onClose={() => setShowNew(false)}
                  onCreated={() => { setShowNew(false); refresh(); setResvVersion(v => v + 1); }}
                />
              )}


              {reserveFor && (
                <ReservationModal
                  table={reserveFor}
                  tables={tables}
                  onClose={() => setReserveFor(null)}
                  onCreated={() => { setReserveFor(null); refresh(); setResvVersion(v => v + 1); }}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
