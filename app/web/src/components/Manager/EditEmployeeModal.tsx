'use client';

import React, { useState, useEffect } from 'react';
import { AppIcon } from '@/components/icons';
import { updateEmployee } from '@/services/EmployeeService';
import type { OperationalRole, DaySchedule, EmployeeItem } from '@/types';

interface EditEmployeeModalProps {
  employee: EmployeeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedEmployee: EmployeeItem) => void;
  currentUserRole?: 'owner' | 'manager' | 'root-admin';
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 1, dayName: 'Lunes', openTime: '09:00', closeTime: '17:00', enabled: true },
  { dayOfWeek: 2, dayName: 'Martes', openTime: '09:00', closeTime: '17:00', enabled: true },
  { dayOfWeek: 3, dayName: 'Miércoles', openTime: '09:00', closeTime: '17:00', enabled: true },
  { dayOfWeek: 4, dayName: 'Jueves', openTime: '09:00', closeTime: '17:00', enabled: true },
  { dayOfWeek: 5, dayName: 'Viernes', openTime: '09:00', closeTime: '17:00', enabled: true },
  { dayOfWeek: 6, dayName: 'Sábado', openTime: '09:00', closeTime: '17:00', enabled: true },
  { dayOfWeek: 0, dayName: 'Domingo', openTime: '09:00', closeTime: '17:00', enabled: false },
];

const DAYS_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export default function EditEmployeeModal({
  employee,
  isOpen,
  onClose,
  onUpdated,
  currentUserRole = 'manager',
}: EditEmployeeModalProps) {
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [operationalRole, setOperationalRole] = useState<OperationalRole>('mesero');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Schedule
  const [useCustomSchedule, setUseCustomSchedule] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employee && isOpen) {
      setName(employee.name || '');
      setLastName(employee.lastName || '');
      setEmail(employee.email || '');
      setOperationalRole(employee.operationalRole || 'mesero');
      setStatus(employee.status || 'active');

      if (employee.individualSchedule && employee.individualSchedule.enabled) {
        setUseCustomSchedule(true);
        if (
          employee.individualSchedule.weeklySchedule &&
          employee.individualSchedule.weeklySchedule.length > 0
        ) {
          setWeeklySchedule(employee.individualSchedule.weeklySchedule);
        } else {
          setWeeklySchedule(DEFAULT_SCHEDULE);
        }
      } else {
        setUseCustomSchedule(false);
        setWeeklySchedule(DEFAULT_SCHEDULE);
      }
      setError(null);
    }
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const handleDayChange = (dayIdx: number, field: keyof DaySchedule, value: any) => {
    setWeeklySchedule((prev) =>
      prev.map((item) => (item.dayOfWeek === dayIdx ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        name: name.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        operationalRole,
        status,
        individualSchedule: useCustomSchedule
          ? {
              enabled: true,
              weeklySchedule,
            }
          : {
              enabled: false,
              weeklySchedule: [],
            },
      };

      const res = await updateEmployee(employee.id, payload);
      onUpdated(res.employee);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar información del empleado');
    } finally {
      setLoading(false);
    }
  };

  const orderedDays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <AppIcon name="edit" size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Editar Empleado</h2>
              <p className="text-xs text-indigo-200">
                Usuario: <span className="font-mono">{employee.username}</span> · Rol:{' '}
                <span className="font-semibold">{employee.role}</span>
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

        {/* Content */}
        <form onSubmit={handleSubmit} id="edit-employee-form" className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-700">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AppIcon name="error" size={16} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Apellidos
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Estado de la Cuenta
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="active">Activo (Permitir acceso)</option>
                <option value="inactive">Inactivo / Suspendido</option>
              </select>
            </div>
          </div>

          {/* Individual Schedule Configuration */}
          <div className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useCustomSchedule}
                    onChange={(e) => setUseCustomSchedule(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Horario de Acceso Personalizado</span>
                </label>
                <p className="text-[11px] text-slate-500 ml-6">
                  {useCustomSchedule
                    ? 'El empleado solo podrá ingresar en los turnos aquí definidos dentro de la disponibilidad del restaurante.'
                    : 'Actualmente hereda el horario de apertura y cierre del restaurante.'}
                </p>
              </div>
            </div>

            {useCustomSchedule && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                {orderedDays.map((dayIdx) => {
                  const dayConfig = weeklySchedule.find((s) => s.dayOfWeek === dayIdx) || {
                    dayOfWeek: dayIdx,
                    dayName: DAYS_ES[dayIdx],
                    openTime: '09:00',
                    closeTime: '17:00',
                    enabled: true,
                  };

                  return (
                    <div
                      key={dayIdx}
                      className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white border border-slate-200"
                    >
                      <label className="flex items-center gap-2 font-medium w-28 text-slate-700">
                        <input
                          type="checkbox"
                          checked={dayConfig.enabled}
                          onChange={(e) => handleDayChange(dayIdx, 'enabled', e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>{DAYS_ES[dayIdx]}</span>
                      </label>

                      {dayConfig.enabled ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            value={dayConfig.openTime}
                            onChange={(e) =>
                              handleDayChange(dayIdx, 'openTime', e.target.value)
                            }
                            className="px-2 py-0.5 rounded border border-slate-300 font-mono text-[11px]"
                          />
                          <span className="text-slate-400 text-[10px]">a</span>
                          <input
                            type="time"
                            value={dayConfig.closeTime}
                            onChange={(e) =>
                              handleDayChange(dayIdx, 'closeTime', e.target.value)
                            }
                            className="px-2 py-0.5 rounded border border-slate-300 font-mono text-[11px]"
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Descanso / Sin acceso</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-employee-form"
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>Guardar Cambios</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

