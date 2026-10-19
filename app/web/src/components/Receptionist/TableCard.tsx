'use client';

import type { Table, Reservation } from "@/types";
import { useEffect, useState } from "react";
import { getReservationInfoForTable } from "@/services/ReservationService";
import type { CardProps } from "@/types/Receptionist/receptionist.types";
import { dateFormat } from "@/utils/Receptionist/receptionist.functions";
import { AppIcon } from "@/components/icons";

export default function ReceptionistTableCard({
  table,
  onChanged,
  onReserve,
  onViewReservation,
  onOpen,
  resvVersion = 0,
}: CardProps & { onOpen?: (table: Table) => void }) {
  const [activeRes, setActiveRes] = useState<Reservation | null>(null);
  const [inLead, setInLead] = useState(false);
  const [mins, setMins] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await getReservationInfoForTable(table.id, dateFormat());
        if (!cancelled) {
          setActiveRes(info.reservation);
          setInLead(!!info.inLeadWindow);
          setMins(info.minutesToStart);
        }
      } catch {
        if (!cancelled) {
          setActiveRes(null);
          setInLead(false);
          setMins(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [table.id, resvVersion]);

  const isOcupada = table.status === "ocupada";
  const isReservada = table.status === "reservada";
  const canViewRes =
    !!activeRes &&
    (activeRes.status === "programada" ||
      (activeRes.status === "sentada" && table.status !== "disponible"));

  const handleCardClick = () => {
    if (onOpen) {
      onOpen(table);
    } else if (canViewRes && activeRes) {
      onViewReservation(activeRes, table);
    } else {
      onReserve(table);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="p-5 rounded-2xl shadow-sm border border-slate-200 bg-white transition hover:shadow-lg hover:scale-[1.02] cursor-pointer flex flex-col justify-between"
    >
      <div>
        <h2 className="text-xl font-bold text-center text-slate-800">MESA {table.number}</h2>

        <div
          className={`font-bold text-center mt-2.5 rounded-lg p-2 ${
            isOcupada
              ? "bg-amber-100 text-amber-800 border border-amber-300"
              : isReservada
              ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
              : "border border-emerald-300 bg-emerald-50 text-emerald-800"
          }`}
        >
          <p className="text-xs font-bold tracking-wider">{table.status.toUpperCase()}</p>
        </div>

        {canViewRes && activeRes && (
          <div className="text-xs text-center mt-2.5 p-2 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-100 font-medium">
            <span className="font-bold">{activeRes.customerName || "Reserva"}</span> —{" "}
            {new Date(activeRes.startTime).toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {inLead && typeof mins === "number" ? ` (bloquea en ~${Math.max(mins, 0)} min)` : ""}
          </div>
        )}

        <p className="text-center font-medium text-slate-600 text-xs mt-3">
          Capacidad: {table.capacity} personas
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1 justify-center">
          {Array.from({ length: table.capacity }).map((_, i) => (
            <span key={i} className="p-0.5 rounded bg-slate-50 text-slate-400" title="Persona">
              <AppIcon name="users" size={13} />
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span>Click para detalles</span>
        <span className="text-indigo-600 font-semibold">Gestionar →</span>
      </div>
    </div>
  );
}
