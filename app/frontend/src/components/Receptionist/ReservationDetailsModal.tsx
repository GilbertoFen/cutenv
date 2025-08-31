import type { Reservation, Table } from "../../types";
import { seatReservation, cancelReservation, noShowReservation } from "../../services/ReservationService";

type Props = {
  reservation: Reservation;
  table: Table;
  onClose: () => void;
  onChanged: () => void;
};



function fmt(dtIso?: string) {
  if (!dtIso) return "—";
  const d = new Date(dtIso);
  return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export default function ReservationDetailsModal({ reservation, table, onClose, onChanged }: Props) {
  const seat = async () => {
    try {
      await seatReservation(reservation.id);
      onChanged();
      onClose();
    } catch (e) {
      alert(e || "Error al sentar");
    }
  };

  const cancel = async () => {
    if (!confirm("¿Cancelar esta reservación?")) return;
    try {
      await cancelReservation(reservation.id);
      onChanged();
      onClose();
    } catch (e) {
      alert(e|| "Error al cancelar");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white text-black rounded-xl p-4 w-full max-w-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold">Reservación — Mesa {table.number}</h3>
          <button onClick={onClose} className="text-xl font-bold">&times;</button>
        </div>

        <div className="space-y-2 text-sm">
          <div><span className="text-gray-600">Cliente:</span> {reservation.customerName || "—"}</div>
          <div><span className="text-gray-600">Tel:</span> {reservation.phone || "—"}</div>
          <div><span className="text-gray-600">Personas:</span> {reservation.partySize ?? "—"}</div>
          <div><span className="text-gray-600">Inicio:</span> {fmt(reservation.startTime)}</div>
          <div><span className="text-gray-600">Fin:</span> {fmt(reservation.endTime)}</div>
          <div><span className="text-gray-600">Estado:</span> {reservation.status}</div>
          {reservation.notes && <div><span className="text-gray-600">Notas:</span> {reservation.notes}</div>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {reservation.status === "programada" && (
            <>
              <button onClick={cancel} className="px-3 py-1 rounded border">Cancelar</button>
              <button onClick={seat} className="px-3 py-1 rounded bg-green-600 text-white">Ya llegó (Sentar)</button>
               <button onClick={async () => { await noShowReservation(reservation.id); onChanged(); onClose(); }}
            className="px-3 py-1 rounded border text-red-700">
      No asistió
    </button>
            </>
          )}

          {reservation.status === "sentada" && (
            <span className="text-sm text-green-700">Cliente sentado. Venta abierta.</span>
          )}
        </div>
      </div>
    </div>
  );
}
