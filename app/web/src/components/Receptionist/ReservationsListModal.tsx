'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import type { Reservation, Table } from '@/types';
import {
  getReservationsByDate,
  getUpcomingReservations,
  seatReservation,
  cancelReservation,
  noShowReservation,
  assignReservationTable,
} from '@/services/ReservationService';
import { dateFormat, fmt, getTableNumberStr } from '@/utils/Receptionist/receptionist.functions';
import type { Mode, StatusFilter } from '@/types/Receptionist/receptionist.types';
import { AppIcon } from '@/components/icons';
import { apiFetch } from '@/lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  tables: Table[];
  onOpenNewReservation: () => void;
}

export default function ReservationsListModal({
  isOpen,
  onClose,
  onRefresh,
  tables,
  onOpenNewReservation,
}: Props) {
  const [mode, setMode] = useState<Mode>('hoy');
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Reservation[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      let rows: Reservation[] = [];

      if (mode === 'proximas') {
        const state = statusFilter !== 'todas' ? (statusFilter as 'programada' | 'sentada') : undefined;
        rows = await getUpcomingReservations(48, state);
      } else {
        const yyyyMmDd = dateFormat();
        rows = await getReservationsByDate(yyyyMmDd);

        if (!Array.isArray(rows) || rows.length === 0) {
          const startLocal = new Date();
          startLocal.setHours(0, 0, 0, 0);
          const endLocal = new Date();
          endLocal.setHours(23, 59, 59, 999);

          const from = startLocal.toISOString();
          const to = endLocal.toISOString();

          const alt = await apiFetch(
            `/reservations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
          );
          if (alt.ok) {
            rows = await alt.json();
          }
        }
      }

      setList(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error('[ReservationsListModal] refresh error:', err);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [mode, statusFilter]);

  useEffect(() => {
    if (isOpen) {
      fetchReservations();
    }
  }, [isOpen, fetchReservations]);

  const filtered = useMemo(() => {
    return list
      .filter((r) => (statusFilter === 'todas' ? true : r.status === statusFilter))
      .filter((r) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const tableNum = getTableNumberStr(r.table);
        return (
          (r.customerName || '').toLowerCase().includes(q) ||
          (r.phone || '').toLowerCase().includes(q) ||
          tableNum.includes(q)
        );
      })
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
  }, [list, search, statusFilter]);

  const onSeat = async (id: string) => {
    try {
      await seatReservation(id);
      await fetchReservations();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      alert(e.message || 'Error al sentar reservación');
    }
  };

  const onCancel = async (id: string) => {
    if (!confirm('¿Desea cancelar esta reservación? Se liberará la mesa.')) return;
    try {
      await cancelReservation(id);
      await fetchReservations();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      alert(e.message || 'Error al cancelar');
    }
  };

  const onNoShow = async (id: string) => {
    if (!confirm('¿Marcar como no asistencia (no se presentó)? Se liberará la mesa.')) return;
    try {
      await noShowReservation(id);
      await fetchReservations();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      alert(e.message || 'Error al actualizar');
    }
  };

  const onAssign = async (id: string, tableId: string) => {
    try {
      await assignReservationTable(id, tableId);
      setAssigningId(null);
      await fetchReservations();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      alert(e.message || 'Error al asignar mesa');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Encabezado */}
        <header className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <h2 className="text-base font-bold text-slate-900">Agenda y Lista de Reservaciones</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Control de asistencia, asignación de mesas y reglas operativas de disponibilidad
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenNewReservation();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>+ Nueva</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              aria-label="Cerrar modal"
            >
              <AppIcon name="close" size={16} />
            </button>
          </div>
        </header>

        {/* Barra de Filtros */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2.5 bg-white shrink-0">
          <div className="inline-flex rounded-xl overflow-hidden border border-slate-300">
            <button
              onClick={() => setMode('hoy')}
              className={`px-3.5 py-1.5 text-xs font-semibold transition ${
                mode === 'hoy' ? 'bg-[#14144f] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setMode('proximas')}
              className={`px-3.5 py-1.5 text-xs font-semibold transition ${
                mode === 'proximas' ? 'bg-[#14144f] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Próximas 48 h
            </button>
          </div>

          <select
            className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-800 focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="todas">Todos los estados</option>
            <option value="programada">Programadas</option>
            <option value="sentada">Sentadas</option>
            <option value="cancelada">Canceladas</option>
            <option value="no_asistencia">No se presentaron</option>
          </select>

          <input
            placeholder="Buscar por cliente, teléfono o # mesa…"
            className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            onClick={fetchReservations}
            className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs text-slate-700 font-semibold transition"
          >
            ↻ Actualizar
          </button>
        </div>

        {/* Tabla con scroll interno */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-xs">Cargando reservaciones…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              No hay reservaciones registradas para este criterio de búsqueda.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Horario</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Personas</th>
                    <th className="p-3">Mesa Asignada</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Notas</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 whitespace-nowrap font-medium text-slate-800">
                        {fmt(r.startTime)} — {fmt(r.endTime)}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{r.customerName || '—'}</div>
                        <div className="text-slate-400 text-[11px]">{r.phone || ''}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{r.partySize ?? '—'}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">
                          {typeof r.table === 'object' && r.table
                            ? `Mesa #${(r.table as Table).number}`
                            : 'Sin mesa'}
                        </span>
                        {assigningId === r.id ? (
                          <div className="mt-1 flex items-center gap-1.5">
                            <select
                              className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                              onChange={(e) => onAssign(r.id, e.target.value)}
                              defaultValue=""
                            >
                              <option value="" disabled>
                                Elegir mesa…
                              </option>
                              {tables.map((t) => (
                                <option key={t.id} value={t.id}>
                                  #{t.number} — {t.status} (Cap. {t.capacity})
                                </option>
                              ))}
                            </select>
                            <button
                              className="text-xs text-slate-500 hover:underline"
                              onClick={() => setAssigningId(null)}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : r.status === 'programada' ? (
                          <button
                            className="text-[11px] text-indigo-600 hover:underline font-semibold"
                            onClick={() => setAssigningId(r.id)}
                          >
                            Cambiar mesa
                          </button>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            r.status === 'sentada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'programada'
                              ? 'bg-amber-100 text-amber-800'
                              : r.status === 'cancelada'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 max-w-[180px] truncate" title={r.notes}>
                        {r.notes || '—'}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5">
                          {r.status === 'programada' && (
                            <>
                              <button
                                onClick={() => onSeat(r.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-sm"
                              >
                                Sentar
                              </button>
                              <button
                                onClick={() => onNoShow(r.id)}
                                className="px-2 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-[11px] font-semibold transition"
                              >
                                No Asistió
                              </button>
                              <button
                                onClick={() => onCancel(r.id)}
                                className="px-2 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {r.status === 'sentada' && (
                            <span className="text-[11px] text-emerald-700 font-bold">En mesa</span>
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

        {/* Footer */}
        <footer className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
