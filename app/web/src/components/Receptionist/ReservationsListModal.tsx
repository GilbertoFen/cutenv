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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-soft-xl max-w-5xl w-full border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-fadeIn">
        {/* Encabezado */}
        <header className="px-6 py-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">
              <AppIcon name="orders" size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Agenda de Reservaciones
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Control de asistencia, asignación de mesas y estado de visitas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                onClose();
                onOpenNewReservation();
              }}
              className="min-h-[42px] px-4 py-2 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-soft-xs active:scale-95"
            >
              <span>+ Nueva Reservación</span>
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition active:scale-95"
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Barra de Filtros */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50/60 shrink-0">
          <div className="inline-flex rounded-2xl p-1 bg-white border border-slate-200/90 shadow-soft-xs">
            <button
              onClick={() => setMode('hoy')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                mode === 'hoy'
                  ? 'bg-slate-900 text-white shadow-soft-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setMode('proximas')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                mode === 'proximas'
                  ? 'bg-slate-900 text-white shadow-soft-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Próximas 48 h
            </button>
          </div>

          <select
            className="min-h-[42px] border border-slate-200/90 rounded-2xl px-3.5 py-2 text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-soft-xs"
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
            className="min-h-[42px] border border-slate-200/90 rounded-2xl px-4 py-2 text-xs flex-1 min-w-[200px] bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-soft-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            onClick={fetchReservations}
            className="min-h-[42px] px-4 py-2 rounded-2xl border border-slate-200/90 hover:bg-slate-100 text-xs text-slate-700 font-bold transition shadow-soft-xs active:scale-95 bg-white"
          >
            ↻ Actualizar
          </button>
        </div>

        {/* Tabla con scroll interno */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-20 text-slate-400 text-xs">Cargando reservaciones…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 px-4 bg-slate-50/60 rounded-3xl border border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-600">No hay reservaciones registradas</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No se encontraron reservaciones con los criterios de búsqueda actuales.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/90 overflow-x-auto bg-white shadow-soft-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3.5">Horario</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Personas</th>
                    <th className="p-3.5">Mesa Asignada</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5">Notas</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 whitespace-nowrap font-bold text-slate-800">
                        {fmt(r.startTime)} — {fmt(r.endTime)}
                      </td>
                      <td className="p-3.5">
                        <div className="font-black text-slate-900 text-xs">{r.customerName || '—'}</div>
                        <div className="text-slate-400 text-[11px] font-medium">{r.phone || ''}</div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">{r.partySize ?? '—'}</td>
                      <td className="p-3.5">
                        <span className="font-extrabold text-slate-900 block">
                          {typeof r.table === 'object' && r.table
                            ? `Mesa #${(r.table as Table).number}`
                            : 'Sin mesa'}
                        </span>
                        {assigningId === r.id ? (
                          <div className="mt-1 flex items-center gap-1.5">
                            <select
                              className="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white"
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
                            className="text-[11px] text-purple-700 hover:underline font-bold"
                            onClick={() => setAssigningId(r.id)}
                          >
                            Cambiar mesa
                          </button>
                        ) : null}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            r.status === 'sentada'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : r.status === 'programada'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : r.status === 'cancelada'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 max-w-[180px] truncate" title={r.notes}>
                        {r.notes || '—'}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5">
                          {r.status === 'programada' && (
                            <>
                              <button
                                onClick={() => onSeat(r.id)}
                                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] transition shadow-soft-xs active:scale-95"
                              >
                                Sentar
                              </button>
                              <button
                                onClick={() => onNoShow(r.id)}
                                className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-[11px] font-bold transition active:scale-95"
                              >
                                No Asistió
                              </button>
                              <button
                                onClick={() => onCancel(r.id)}
                                className="min-h-[36px] px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-bold transition active:scale-95"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {r.status === 'sentada' && (
                            <span className="text-xs text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                              ✓ En mesa
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

        {/* Footer */}
        <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition border border-slate-200/90 shadow-soft-xs"
          >
            Cerrar Agenda
          </button>
        </footer>
      </div>
    </div>
  );
}
