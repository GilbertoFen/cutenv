import type { Table, Reservation } from "../../types";
import { updateTableStatus } from "../../services/TableService";
import { useEffect, useState } from "react";
import { getReservationInfoForTable } from "../../services/ReservationService";

export type CardProps = {
  table: Table;
  onChanged: () => void;
  onReserve: (table: Table) => void;
  onViewReservation: (reservation: Reservation, table: Table) => void;
  resvVersion?: number; // 👈 nuevo (de la respuesta anterior)
};

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ReceptionistTableCard({ table, onChanged, onReserve, onViewReservation, resvVersion = 0 }: CardProps) {
  const [busy, setBusy] = useState(false);
  const [activeRes, setActiveRes] = useState<Reservation | null>(null);
  const [inLead, setInLead] = useState(false);
  const [mins, setMins] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await getReservationInfoForTable(table.id, todayYYYYMMDD());
        if (!cancelled) {
          setActiveRes(info.reservation);
          setInLead(!!info.inLeadWindow);
          setMins(info.minutesToStart);
        }
      } catch {
        if (!cancelled) { setActiveRes(null); setInLead(false); setMins(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [table.id, resvVersion]);

  const setStatus = async (status: Table["status"]) => {
    try {
      setBusy(true);
      await updateTableStatus(table.id, status);
      onChanged();
    } catch (e) {
      alert("No se pudo actualizar la mesa " + e);
    } finally {
      setBusy(false);
    }
  };

  const isOcupada = table.status === "ocupada";
  const canView =
  !!activeRes &&
  (
    activeRes.status === 'programada' ||
    (activeRes.status === 'sentada' && table.status !== 'disponible')
  );

  return (
    <div className="p-6 rounded-xl shadow border bg-white transition hover:shadow-md">
      <h2 className="text-xl font-bold text-center text-black">MESA {table.number}</h2>

      <div className={`font-bold text-center mt-2 ${isOcupada ? 'bg-[#646cffaa]' :'border-2 border-[#646cffaa] bg-white'} rounded p-1`}>
        <p className="text-black text-sm">{table.status.toUpperCase()}</p>
      </div>

      {/* Badge con reserva del día */}
      {canView && (
  <div className="text-xs text-center mt-2 text-gray-700">
    {(activeRes.customerName || 'Reserva')} — {new Date(activeRes.startTime).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
    {inLead && typeof mins === 'number' ? ` (bloquea en ~${Math.max(mins,0)} min)` : ''}
  </div>
)}

      <p className="text-center font-bold text-black text-sm mt-1">Capacidad: {table.capacity}</p>

      <div className="mt-2 flex flex-wrap gap-1 justify-center">
        {Array.from({ length: table.capacity }).map((_, i) => <span key={i} className="text-xl">👤</span>)}
      </div>
      

      <div className="mt-4 grid grid-cols-3 gap-2 text-black">
        <button disabled={busy} onClick={() => setStatus("disponible")} className="px-2 py-1 rounded border hover:bg-gray-50 text-sm">Disponible</button>
        <button disabled={busy || table.status==='reservada'} onClick={() => setStatus("ocupada")} className="px-2 py-1 rounded border hover:bg-gray-50 text-sm">Ocupada</button>

        {!canView ? (
          <button
            disabled={busy || table.status !== "disponible"}
            onClick={() => onReserve(table)}
            className="px-2 py-1 rounded border hover:bg-gray-50 text-sm"
            title="Reservar"
          >
            Reservar
          </button>
        ) : (
          <button
            onClick={() => activeRes && onViewReservation(activeRes, table)}
            className="px-2 py-1 rounded border hover:bg-gray-50 text-sm"
            title="Ver reservación"
          >
            Ver reservación
          </button>
        )}
      </div>
    </div>
  );
}
