'use client';

import React, { useState, useEffect } from 'react';
import { AppIcon } from '@/components/icons';
import { getAuditLogs } from '@/services/EmployeeService';
import type { AuditLogItem } from '@/types';

interface AuditLogModalProps {
  restaurantId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditLogModal({
  restaurantId,
  isOpen,
  onClose,
}: AuditLogModalProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, restaurantId]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuditLogs({ limit: 100 });
      setLogs(res.logs || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar registros de auditoría');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== 'all' && !log.action.toLowerCase().includes(selectedAction.toLowerCase())) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchUser = log.userName?.toLowerCase().includes(term);
      const matchAction = log.action?.toLowerCase().includes(term);
      const matchDetails = JSON.stringify(log.details || {}).toLowerCase().includes(term);
      return matchUser || matchAction || matchDetails;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('created') || action.includes('create')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
          Creación
        </span>
      );
    }
    if (action.includes('login')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
          Acceso / Login
        </span>
      );
    }
    if (action.includes('revoked') || action.includes('blocked') || action.includes('deactivated')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
          Restricción / Bloqueo
        </span>
      );
    }
    if (action.includes('schedule')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
          Horarios
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
        {action}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <AppIcon name="history" size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Historial de Auditoría</h2>
              <p className="text-xs text-indigo-200">
                Registro inmutable de acciones administrativas, cambios de acceso y sesiones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <AppIcon name="close" size={16} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuario o detalle..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <div className="absolute left-3 top-2.5 text-slate-400">
              <AppIcon name="search" size={14} />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full sm:w-auto"
            >
              <option value="all">Todas las acciones</option>
              <option value="create">Creaciones</option>
              <option value="login">Inicios de sesión</option>
              <option value="revoked">Sesiones revocadas</option>
              <option value="schedule">Cambios de horario</option>
              <option value="update">Modificaciones</option>
            </select>

            <button
              onClick={loadLogs}
              className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 transition-all shrink-0"
              title="Recargar registros"
            >
              <AppIcon name="refresh" size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AppIcon name="error" size={16} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Cargando eventos de auditoría...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No se encontraron registros de auditoría que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Fecha y Hora</th>
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Acción</th>
                    <th className="py-2.5 px-3">Destino</th>
                    <th className="py-2.5 px-3">Detalles</th>
                    <th className="py-2.5 px-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const dateStr = log.createdAt
                      ? new Date(log.createdAt).toLocaleString('es-MX', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })
                      : '—';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-all">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                          {dateStr}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {log.userName || log.userId || 'Sistema'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="font-medium text-slate-700">{log.targetType || '—'}</span>
                          {log.targetId && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {log.targetId}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                          {log.details ? (
                            <span title={JSON.stringify(log.details, null, 2)}>
                              {typeof log.details === 'string'
                                ? log.details
                                : Object.entries(log.details)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(', ')}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                          {log.ipAddress || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="text-xs text-slate-500">
            Total de registros: <span className="font-bold text-slate-700">{filteredLogs.length}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-all shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

