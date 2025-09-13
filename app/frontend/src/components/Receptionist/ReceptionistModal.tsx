import { useState } from "react";
import type {Props} from '../../types/Receptionist/receptionist.types'
import { createReservation, localToUTCISO } from "../../services/ReservationService";

export default function ReservationModal({ table,tables, onClose, onCreated }: Props) {
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
  const [selectedTableId, setSelectedTableId] = useState<string>(table?.id ?? ""); // 👈
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>("");

  const save = async () => {
    if (!startLocal) { setErr("Selecciona fecha y hora"); return; }
    if (!partySize || partySize < 1) { setErr("Número de personas inválido"); return; }
    setErr(""); setSaving(true);
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
    } catch (e) {
      alert(e || "Error al crear la reservación");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white text-black rounded-xl p-4 w-full max-w-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold">Reservar — Mesa {table?.number}</h3>
          <button onClick={onClose} className="text-xl font-bold">&times;</button>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm">
          {!table && (
            <label>
              <span className="block text-gray-700 mb-1">Mesa</span>
              <select
                className="w-full border rounded px-3 py-2"
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
              >
                <option value="">— Selecciona una mesa —</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.number} — {t.status} (cap: {t.capacity})
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span className="block text-gray-700 mb-1">Nombre del cliente</span>
            <input className="w-full border rounded px-3 py-2"
                   value={customerName} onChange={e=>setCustomerName(e.target.value)} />
          </label>

          <label>
            <span className="block text-gray-700 mb-1">Teléfono</span>
            <input className="w-full border rounded px-3 py-2"
                   value={phone} onChange={e=>setPhone(e.target.value)} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="block text-gray-700 mb-1">Personas</span>
              <input type="number" min={1}
                     className="w-full border rounded px-3 py-2"
                     value={partySize} onChange={e=>setPartySize(Number(e.target.value))} />
            </label>
            <label>
              <span className="block text-gray-700 mb-1">Duración (min)</span>
              <input type="number" min={15} step={15}
                     className="w-full border rounded px-3 py-2"
                     value={duration} onChange={e=>setDuration(Number(e.target.value))} />
            </label>
          </div>

          <label>
            <span className="block text-gray-700 mb-1">Fecha y hora (local)</span>
            <input type="datetime-local"
                   className="w-full border rounded px-3 py-2"
                   value={startLocal} onChange={e=>setStartLocal(e.target.value)} />
          </label>

          <label>
            <span className="block text-gray-700 mb-1">Notas</span>
            <textarea className="w-full border rounded px-3 py-2 resize-none" rows={3}
                      value={notes} onChange={e=>setNotes(e.target.value)} />
          </label>

          {err && <div className="text-red-600">{err}</div>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded border">Cancelar</button>
          <button disabled={saving} onClick={save}
                  className="px-3 py-1 rounded bg-[#14144f] text-white">
            {saving ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
