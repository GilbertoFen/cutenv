'use client';

import { useState } from "react";
import type { Props } from "@/types/Receptionist/receptionist.types";
import { createReservation, localToUTCISO } from "@/services/ReservationService";

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
      setErr("Selecciona fecha y hora");
      return;
    }
    if (!partySize || partySize < 1) {
      setErr("Número de personas inválido");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      await createReservation({
        table: selectedTableId || undefined,
        customerName,
        phone,
        partySize,
        startTime: localToUTCISO(startLocal),
        durationMinutes: duration,
        notes,
      });
      onCreated();
      onClose();
    } catch (e: any) {
      alert(e?.message || e || "Error al crear la reservación");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Reservar — {table ? `Mesa ${table.number}` : "Nueva Reservación"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
            &times;
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm">
          {!table && (
            <label>
              <span className="block text-slate-700 font-medium mb-1 text-xs">Mesa asignada</span>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
              >
                <option value="">(Sin asignar o asignar después)</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Mesa {t.number} ({t.capacity} personas) - {t.status}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label>
              <span className="block text-slate-700 font-medium mb-1 text-xs">Nombre del cliente</span>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                placeholder="Ej. Juan Pérez"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </label>
            <label>
              <span className="block text-slate-700 font-medium mb-1 text-xs">Teléfono</span>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                placeholder="Ej. 555-1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label>
              <span className="block text-slate-700 font-medium mb-1 text-xs">Personas</span>
              <input
                type="number"
                min="1"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="block text-slate-700 font-medium mb-1 text-xs">Fecha y hora</span>
              <input
                type="datetime-local"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </label>
          </div>

          <label>
            <span className="block text-slate-700 font-medium mb-1 text-xs">Duración (minutos)</span>
            <input
              type="number"
              step="15"
              min="30"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>

          <label>
            <span className="block text-slate-700 font-medium mb-1 text-xs">Notas</span>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs resize-none"
              rows={2}
              placeholder="Ej. Aniversario, mesa tranquila"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {err && <div className="text-xs text-rose-600 font-medium">{err}</div>}
        </div>

        <div className="mt-5 flex justify-end gap-2.5 pt-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#14144f] hover:bg-[#1f1f6d] text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Confirmar Reservación"}
          </button>
        </div>
      </div>
    </div>
  );
}
