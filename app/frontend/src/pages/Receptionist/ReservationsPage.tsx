import { useEffect, useMemo, useState, useCallback } from "react";
import type { Reservation, Table } from "../../types";
import {
  getReservationsByDate,
  getUpcomingReservations,
  seatReservation,
  cancelReservation,
  noShowReservation,
  assignReservationTable,
  createReservation,
  localToUTCISO,
} from "../../services/ReservationService";
import { getAllTables } from "../../services/TableService";

function getTableNumberStr(t: Reservation["table"]): string {
  if (t && typeof t === "object" && "number" in t) {
    return String((t as Table).number);
  }
  return "";
}
function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmt(dtIso?: string) {
  if (!dtIso) return "—";
  const d = new Date(dtIso);
  return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

type Mode = "hoy" | "proximas";
type StatusFilter = "todas" | "programada" | "sentada";

export default function ReservationsPage() {
  const [mode, setMode] = useState<Mode>("hoy");
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Reservation[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const [tables, setTables] = useState<Table[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
  setLoading(true);
  try {
    let rows: Reservation[] = [];

    if (mode === "proximas") {
      // 🔹 Próximas 48 h: pedimos al backend ya filtrado por estado (si no es "todas")
      const state = statusFilter !== "todas" ? (statusFilter as 'programada' | 'sentada') : undefined;
      rows = await getUpcomingReservations(48, state);
      console.debug("[ReservationsPage] /reservations/upcoming ->", rows?.length, { state });
    } else {
      // 🔹 Hoy: 1) por ?date=YYYY-MM-DD
      const yyyyMmDd = todayYYYYMMDD();
      rows = await getReservationsByDate(yyyyMmDd);
      console.debug("[ReservationsPage] /reservations?date=", yyyyMmDd, "->", rows?.length);

      // 2) Fallback por rango horario del día local (from/to) si vino vacío
      if (!Array.isArray(rows) || rows.length === 0) {
        const startLocal = new Date(); startLocal.setHours(0, 0, 0, 0);
        const endLocal = new Date();   endLocal.setHours(23, 59, 59, 999);

        const from = startLocal.toISOString();
        const to   = endLocal.toISOString();

        const alt = await fetch(
          `/api/reservations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        );
        if (alt.ok) {
          rows = await alt.json();
          console.debug("[ReservationsPage] fallback from/to ->", rows?.length, { from, to });
        } else {
          console.warn("[ReservationsPage] fallback from/to error", alt.status, await alt.text());
        }
      }

      // Nota: el filtro de estado en "hoy" lo seguimos aplicando en el cliente (tu useMemo).
    }

    setList(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("[ReservationsPage] refresh error:", err);
    setList([]);
  } finally {
    setLoading(false);
  }
}, [mode, statusFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    getAllTables()
      .then(setTables)
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return list
      .filter((r) =>
        statusFilter === "todas" ? true : r.status === statusFilter
      )
      .filter((r) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const tableNum = getTableNumberStr(r.table);
        return (
          (r.customerName || "").toLowerCase().includes(q) ||
          (r.phone || "").toLowerCase().includes(q) ||
          tableNum.includes(q) // 👈 aquí usamos el helper
        );
      })
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
  }, [list, search, statusFilter]);

  const onSeat = async (id: string) => {
    await seatReservation(id);
    await refresh();
  };
  const onCancel = async (id: string) => {
    if (!confirm("¿Cancelar reservación?")) return;
    await cancelReservation(id);
    await refresh();
  };
  const onNoShow = async (id: string) => {
    if (!confirm("¿Marcar no asistencia?")) return;
    await noShowReservation(id);
    await refresh();
  };

  const onAssign = async (id: string, tableId: string) => {
    await assignReservationTable(id, tableId);
    setAssigningId(null);
    await refresh();
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <nav className="bg-[#14144f] p-4 rounded-lg text-center text-xl font-bold">
        Recepción — Reservaciones
      </nav>

      <div className="p-4 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="inline-flex rounded overflow-hidden border">
            <button
              onClick={() => setMode("hoy")}
              className={`px-3 py-1 ${mode === "hoy" ? "bg-[#14144f] text-white" : "bg-white"}`}
            >
              Hoy
            </button>
            <button
              onClick={() => setMode("proximas")}
              className={`px-3 py-1 ${mode === "proximas" ? "bg-[#14144f] text-white" : "bg-white"}`}
            >
              Próximas 48 h
            </button>
          </div>

          <select
            className="border rounded px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="todas">Todas</option>
            <option value="programada">Programadas</option>
            <option value="sentada">Sentadas</option>
          </select>

          <input
            placeholder="Buscar (nombre / tel / mesa)"
            className="border rounded px-3 py-1 flex-1 min-w-[220px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            onClick={() => setCreating(true)}
            className="ml-auto px-3 py-1 rounded bg-[#14144f] text-white"
          >
            Nueva reservación
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-600">
            Sin reservaciones.
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Hora</th>
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-left p-2">Personas</th>
                  <th className="text-left p-2">Mesa</th>
                  <th className="text-left p-2">Estado</th>
                  <th className="text-left p-2">Notas</th>
                  <th className="text-left p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">
                      {fmt(r.startTime)} — {fmt(r.endTime)}
                    </td>
                    <td className="p-2">
                      {r.customerName || "—"}{" "}
                      <span className="text-gray-500">{r.phone || ""}</span>
                    </td>
                    <td className="p-2">{r.partySize ?? "—"}</td>
                    <td className="p-2">
                      {typeof r.table === "object" && r.table
                        ? `#${(r.table as Table).number}`
                        : "—"}
                      {assigningId === r.id ? (
                        <div className="mt-1">
                          <select
                            className="border rounded px-2 py-1"
                            onChange={(e) => onAssign(r.id, e.target.value)}
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Elegir mesa…
                            </option>
                            {tables.map((t) => (
                              <option key={t.id} value={t.id}>
                                #{t.number} — {t.status}
                              </option>
                            ))}
                          </select>
                          <button
                            className="ml-2 text-sm underline"
                            onClick={() => setAssigningId(null)}
                          >
                            cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          className="ml-2 text-sm underline"
                          onClick={() => setAssigningId(r.id)}
                        >
                          {r.table ? "Cambiar" : "Asignar"}
                        </button>
                      )}
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          r.status === "programada"
                            ? "bg-amber-100 text-amber-800"
                            : r.status === "sentada"
                              ? "bg-green-100 text-green-800"
                              : r.status === "cancelada"
                                ? "bg-gray-200 text-gray-700"
                                : "bg-red-100 text-red-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td
                      className="p-2 max-w-[220px] truncate"
                      title={r.notes || ""}
                    >
                      {r.notes || "—"}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        {r.status === "programada" && (
                          <>
                            <button
                              className="px-2 py-1 border rounded"
                              onClick={() => onCancel(r.id)}
                            >
                              Cancelar
                            </button>
                            <button
                              className="px-2 py-1 border rounded"
                              onClick={() => onNoShow(r.id)}
                            >
                              No-show
                            </button>
                            <button
                              className="px-2 py-1 rounded bg-green-600 text-white"
                              onClick={() => onSeat(r.id)}
                            >
                              Sentar
                            </button>
                          </>
                        )}
                        {r.status === "sentada" && (
                          <span className="text-green-700">
                            Cliente sentado
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && (
        <CreateReservationModal
          tables={tables}
          onClose={() => setCreating(false)}
          onCreated={refresh}
        />
      )}
    </div>
  );
}

/** Modal minimalista para crear reservación desde esta vista (sin mesa obligatoria) */
function CreateReservationModal({
  onClose,
  onCreated,
  tables,
}: {
  onClose: () => void;
  onCreated: () => void;
  tables: Table[];
}) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState<number>(2);
  const [startLocal, setStartLocal] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    return isoLocal;
  });
  const [selectedTableId, setSelectedTableId] = useState<string>(""); // 👈 aquí vive el estado
  const [duration, setDuration] = useState<number>(120);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!startLocal) return setErr("Selecciona fecha y hora");
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
          <h3 className="text-lg font-bold">Nueva reservación</h3>
          <button onClick={onClose} className="text-xl font-bold">
            &times;
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm">
          {/* Selector de mesa (opcional) */}
          {tables.length > 0 ? (
            <label>
              <span className="block text-gray-700 mb-1">Mesa (opcional)</span>
              <select
                className="w-full border rounded px-3 py-2"
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
              >
                <option value="">— Sin mesa asignada —</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.number} — {t.status} (cap: {t.capacity})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="text-sm text-gray-500">Cargando mesas…</div>
          )}

          <label>
            <span className="block text-gray-700 mb-1">Nombre del cliente</span>
            <input
              className="w-full border rounded px-3 py-2"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </label>
          <label>
            <span className="block text-gray-700 mb-1">Teléfono</span>
            <input
              className="w-full border rounded px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="block text-gray-700 mb-1">Personas</span>
              <input
                type="number"
                min={1}
                className="w-full border rounded px-3 py-2"
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
              />
            </label>
            <label>
              <span className="block text-gray-700 mb-1">Duración (min)</span>
              <input
                type="number"
                min={15}
                step={15}
                className="w-full border rounded px-3 py-2"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </label>
          </div>
          <label>
            <span className="block text-gray-700 mb-1">
              Fecha y hora (local)
            </span>
            <input
              type="datetime-local"
              className="w-full border rounded px-3 py-2"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
            />
          </label>
          <label>
            <span className="block text-gray-700 mb-1">Notas</span>
            <textarea
              className="w-full border rounded px-3 py-2 resize-none"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {err && <div className="text-red-600">{err}</div>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded border">
            Cancelar
          </button>
          <button
            disabled={saving}
            onClick={save}
            className="px-3 py-1 rounded bg-[#14144f] text-white"
          >
            {saving ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
