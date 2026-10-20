'use client';

import { useState } from "react";
import type { Props } from "@/types/Receptionist/receptionist.types";
import { createReservation, localToUTCISO } from "@/services/ReservationService";
import { AppIcon } from "@/components/icons";

export default function ReservationModal({ table, tables, onClose, onCreated }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState<number>(table?.capacity || 2);
  const [startLocal, setStartLocal] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return iso;
  });
  const [duration, setDuration] = useState<number>(120);
  const [notes, setNotes] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string>(table?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>("");

  const save = async () => {
    if (!startLocal) {
      setErr("Selecciona fecha y hora para la reservación.");
      return;
    }
    if (!partySize || partySize < 1) {
      setErr("El número de personas debe ser al menos 1.");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      await createReservation({
        table: selectedTableId || undefined,
        customerName: customerName.trim(),
        phone: phone.trim(),
        partySize,
        startTime: localToUTCISO(startLocal),
        durationMinutes: duration,
        notes: notes.trim(),
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e?.message || e || "Error al registrar la reservación");
    } finally {
      setSaving(false);
    }
  };

  const assignedTable = tables.find((t) => t.id === selectedTableId) || table;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-3xl w-full max-w-2xl shadow-soft-xl border border-slate-200/90 overflow-hidden my-auto animate-fadeIn">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">
              <AppIcon name="orders" size={22} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {table ? `Reservar Mesa ${table.number}` : "Nueva Reservación de Mesa"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresa los datos del cliente y programa el horario de visita
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 inline-flex items-center justify-center transition active:scale-95"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Validation Error Alert */}
          {err && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-soft-xs">
              <span className="text-rose-600 font-bold">⚠️</span>
              <span>{err}</span>
            </div>
          )}

          {/* Section 1: Client Information */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>1. Información del Cliente</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition shadow-soft-xs"
                  placeholder="Ej. Sofia Martínez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono de contacto
                </label>
                <input
                  type="text"
                  className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition shadow-soft-xs"
                  placeholder="Ej. (55) 1234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Date, Time & Table */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>2. Fecha, Horario y Capacidad</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha y hora de llegada
                </label>
                <input
                  type="datetime-local"
                  className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition shadow-soft-xs"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Comensales
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition shadow-soft-xs font-bold"
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mesa asignada
                </label>
                <select
                  disabled={Boolean(table)}
                  className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition shadow-soft-xs disabled:bg-slate-100"
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                >
                  <option value="">(Sin asignar por ahora)</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Mesa {t.number} ({t.capacity} personas) • {t.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Duración estimada
                </label>
                <select
                  className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition shadow-soft-xs"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  <option value={60}>1 hora (60 min)</option>
                  <option value={90}>1 hora y media (90 min)</option>
                  <option value={120}>2 horas (120 min)</option>
                  <option value={180}>3 horas (180 min)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Notes & Special Requests */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Notas u observaciones especiales (opcional)
            </label>
            <textarea
              className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition resize-none shadow-soft-xs"
              rows={2}
              placeholder="Ej. Celebración de cumpleaños, requiere silla para bebé o mesa junto a la terraza..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Live Preview Summary Card */}
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-purple-900 font-bold">
              <span>📋 Resumen:</span>
              <span className="font-black text-slate-900">
                {customerName ? customerName : "Cliente sin registrar"}
              </span>
              <span>•</span>
              <span>{partySize} comensales</span>
            </div>
            <div className="text-purple-800 font-semibold">
              {assignedTable ? `Mesa ${assignedTable.number}` : "Mesa pendiente"} • {duration} min
            </div>
          </div>
        </div>

        {/* Modal Footer with 44px+ Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-700 hover:bg-white transition active:scale-95 shadow-soft-xs"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs sm:text-sm font-black transition shadow-soft-sm hover:shadow-soft-md disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
          >
            {saving ? (
              <span>Registrando reservación…</span>
            ) : (
              <>
                <AppIcon name="check" size={16} />
                <span>Confirmar y Agendar Reservación</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
