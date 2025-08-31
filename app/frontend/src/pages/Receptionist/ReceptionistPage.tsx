import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Table, Reservation } from "../../types";
import { getAllTables } from "../../services/TableService";
import ReceptionistTableCard from "../../components/Receptionist/TableCard";
import ReservationModal from "../../components/Receptionist/ReceptionistModal";
import ReservationDetailsModal from "../../components/Receptionist/ReservationDetailsModal";

export default function ReceptionistPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserveFor, setReserveFor] = useState<Table | null>(null);
  const [viewRes, setViewRes] = useState<{ reservation: Reservation; table: Table } | null>(null);
  const [resvVersion, setResvVersion] = useState(0);
   
const [showNew, setShowNew] = useState(false);
  const location = useLocation();

<button onClick={() => setShowNew(true)} className="...">Nueva reservación</button>

  // ✅ useCallback para evitar warnings de dependencia y re-renders
  const refresh = useCallback(() => {
    setLoading(true);
    getAllTables()
      .then(setTables)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ⏱️ auto-refresh liviano cada 60s (relee mesas y fuerza reconsulta de reservaciones en las tarjetas)
  useEffect(() => {
    const id = setInterval(() => {
      refresh();
      setResvVersion((v) => v + 1);
    }, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const bumpReservations = () => setResvVersion((v) => v + 1);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-white">
      {/* 🧭 Navbar con links a Mesas / Reservaciones */}
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
                    onReserve={(t) => setReserveFor(t)}
                    onViewReservation={(reservation, t) => setViewRes({ reservation, table: t })}
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
