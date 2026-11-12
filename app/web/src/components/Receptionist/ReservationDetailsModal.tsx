'use client';

import { useEffect } from "react";
import type { Reservation, Table } from "@/types";
import { seatReservation, cancelReservation, noShowReservation } from "@/services/ReservationService";
import { fmt } from "@/utils/Receptionist/receptionist.functions";
import { AppIcon } from "@/components/icons";
import { useNotification } from "@/context/NotificationContext";

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
  const { notify, confirm } = useNotification();
  const seat = async () => {
    try {
      await seatReservation(reservation.id);
      notify.success("Comensales sentados en la mesa");
      onChanged();
      onClose();
    } catch (e: any) {
      notify.error(e?.message || e || "Error al sentar");
    }
  };

  const cancel = async () => {
    const ok = await confirm({
      title: "Cancelar reservación",
      message: "¿Confirmas que deseas cancelar esta reservación? La mesa quedará liberada.",
      confirmText: "Sí, cancelar",
      cancelText: "Volver",
      type: "danger",
    });
    if (!ok) return;
    try {
      await cancelReservation(reservation.id);
      notify.success("Reservación cancelada");
      onChanged();
      onClose();
    } catch (e: any) {
      notify.error(e?.message || e || "Error al cancelar");
    }
  };

  const noShow = async () => {
    const ok = await confirm({
      title: "Registrar inasistencia",
      message: "¿Confirmas que el cliente no se presentó a la reservación?",
      confirmText: "Confirmar inasistencia",
      cancelText: "Volver",
      type: "warning",
    });
    if (!ok) return;
    try {
      await noShowReservation(reservation.id);
      notify.success("Inasistencia registrada");
      onChanged();
      onClose();
    } catch (e: any) {
      notify.error(e?.message || e || "Error al marcar inasistencia");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white text-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-soft-xl border border-slate-200/90 my-auto animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Reservación — Mesa {table.number}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center transition active:scale-95"
            aria-label="Cerrar"
          >
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
