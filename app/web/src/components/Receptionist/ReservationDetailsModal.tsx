'use client';

import type { Reservation, Table } from "@/types";
import { seatReservation, cancelReservation, noShowReservation } from "@/services/ReservationService";
import { fmt } from "@/utils/Receptionist/receptionist.functions";
import { AppIcon } from "@/components/icons";

type Props = {
  reservation: Reservation;
  table: Table;
  onClose: () => void;
  onChanged: () => void;
};

export default function ReservationDetailsModal({
  reservation,
  table,
  onClose,
  onChanged,
}: Props) {
  const seat = async () => {
    try {
      await seatReservation(reservation.id);
      onChanged();
      onClose();
    } catch (e: any) {
      alert(e?.message || e || "Error al sentar");
    }
  };

  const cancel = async () => {
    if (!confirm("¿Cancelar esta reservación?")) return;
    try {
      await cancelReservation(reservation.id);
      onChanged();
      onClose();
    } catch (e: any) {
      alert(e?.message || e || "Error al cancelar");
    }
  };

  const noShow = async () => {
    try {
      await noShowReservation(reservation.id);
      onChanged();
      onClose();
    } catch (e: any) {
      alert(e?.message || e || "Error al marcar inasistencia");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-3 pb-2 border-b">
          <h3 className="text-lg font-bold text-slate-900">Reservación — Mesa {table.number}</h3>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600 inline-flex items-center justify-center" aria-label="Cerrar">
            <AppIcon name="close" size={18} />
          </button>
        </div>

        <div className="space-y-2.5 text-xs text-slate-700">
          <div><span className="font-semibold text-slate-500">Cliente:</span> <strong className="text-slate-900 text-sm">{reservation.customerName || "—"}</strong></div>
          <div><span className="font-semibold text-slate-500">Teléfono:</span> {reservation.phone || "—"}</div>
          <div><span className="font-semibold text-slate-500">Personas:</span> {reservation.partySize ?? "—"}</div>
          <div><span className="font-semibold text-slate-500">Hora inicio:</span> {fmt(reservation.startTime)}</div>
          <div><span className="font-semibold text-slate-500">Hora fin:</span> {fmt(reservation.endTime)}</div>
          <div>
            <span className="font-semibold text-slate-500">Estado:</span>{" "}
            <span className="font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800">
              {reservation.status}
            </span>
          </div>
          {reservation.notes && (
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-500">Notas:</span> {reservation.notes}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2 pt-3 border-t">
          {reservation.status === "programada" && (
            <>
              <button
                onClick={cancel}
                className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={noShow}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
              >
                No asistió
              </button>
              <button
                onClick={seat}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <AppIcon name="check" size={14} />
                <span>Ya llegó (Sentar)</span>
              </button>
            </>
          )}
          {reservation.status !== "programada" && (
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
