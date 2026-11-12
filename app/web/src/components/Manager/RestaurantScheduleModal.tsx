'use client';

import React, { useState, useEffect } from 'react';
import { AppIcon } from '@/components/icons';
import { getRestaurantSchedule, updateRestaurantSchedule } from '@/services/RestaurantService';
import type { DaySchedule } from '@/types';

interface RestaurantScheduleModalProps {
  restaurantId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const DAYS_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 1, dayName: 'Lunes', openTime: '08:00', closeTime: '23:00', enabled: true },
  { dayOfWeek: 2, dayName: 'Martes', openTime: '08:00', closeTime: '23:00', enabled: true },
  { dayOfWeek: 3, dayName: 'Miércoles', openTime: '08:00', closeTime: '23:00', enabled: true },
  { dayOfWeek: 4, dayName: 'Jueves', openTime: '08:00', closeTime: '23:00', enabled: true },
  { dayOfWeek: 5, dayName: 'Viernes', openTime: '08:00', closeTime: '23:00', enabled: true },
  { dayOfWeek: 6, dayName: 'Sábado', openTime: '08:00', closeTime: '23:00', enabled: true },
  { dayOfWeek: 0, dayName: 'Domingo', openTime: '08:00', closeTime: '23:00', enabled: true },
];

const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Centro de México (CDMX, Guadalajara, Monterrey) - UTC-6' },
  { value: 'America/Cancun', label: 'Sureste / Quintana Roo (Cancún) - UTC-5' },
  { value: 'America/Tijuana', label: 'Noroeste / Baja California (Tijuana) - UTC-8' },
  { value: 'America/Hermosillo', label: 'Pacífico / Sonora (Hermosillo) - UTC-7' },
  { value: 'America/Mazatlan', label: 'Pacífico / Sinaloa (Mazatlán) - UTC-7' },
];

export default function RestaurantScheduleModal({
  restaurantId,
  isOpen,
  onClose,
  onSaved,
}: RestaurantScheduleModalProps) {
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [timezone, setTimezone] = useState<string>('America/Mexico_City');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && restaurantId) {
      loadSchedule();
    }
  }, [isOpen, restaurantId]);

  const loadSchedule = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const data = await getRestaurantSchedule(restaurantId);
      if (data && data.weeklySchedule && data.weeklySchedule.length > 0) {
        // Ordenar del 1 (Lunes) al 6 (Sábado) y luego 0 (Domingo) para vista habitual
        setWeeklySchedule(data.weeklySchedule);
      }
      if (data && data.timezone) {
        setTimezone(data.timezone);
      }
    } catch (err: any) {
      console.warn('Could not load restaurant schedule, using defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDayChange = (dayIdx: number, field: keyof DaySchedule, value: any) => {
    setWeeklySchedule((prev) =>
      prev.map((item) => (item.dayOfWeek === dayIdx ? { ...item, [field]: value } : item))
    );
  };

  const handleApplyToAllDays = (sourceDayIdx: number) => {
    const source = weeklySchedule.find((s) => s.dayOfWeek === sourceDayIdx);
    if (!source) return;
    setWeeklySchedule((prev) =>
      prev.map((item) => ({
        ...item,
        openTime: source.openTime,
        closeTime: source.closeTime,
        enabled: source.enabled,
      }))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateRestaurantSchedule(restaurantId, {
        weeklySchedule,
        timezone,
      });
      setSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error al guardar horario de disponibilidad');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Lunes (1) primero, domingo (0) al final
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <AppIcon name="clock" size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Disponibilidad y Horarios del POS</h2>
              <p className="text-xs text-indigo-200">
                Horario general en el que los empleados operativos pueden ingresar al sistema
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AppIcon name="error" size={16} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-bold flex items-center gap-2">
              <AppIcon name="check" size={16} className="text-emerald-600 shrink-0" />
              <span>¡Horario guardado correctamente! Los cambios son efectivos de inmediato.</span>
            </div>
          )}

          {/* Timezone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Zona Horaria del Restaurante
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Todos los accesos de empleados se validarán estrictamente con base en esta zona horaria.
            </p>
          </div>

          {/* Schedule Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Horario por Día de la Semana
              </label>
              <button
                type="button"
                onClick={() => handleApplyToAllDays(1)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
              >
                Copiar horario de Lunes a todos los días
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Cargando horario...</div>
            ) : (
              <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                {orderedDays.map((dayIdx) => {
                  const dayConfig = weeklySchedule.find((s) => s.dayOfWeek === dayIdx) || {
                    dayOfWeek: dayIdx,
                    dayName: DAYS_ES[dayIdx],
                    openTime: '08:00',
                    closeTime: '23:00',
                    enabled: true,
                  };
                  const isCrossMidnight =
                    dayConfig.enabled && dayConfig.closeTime < dayConfig.openTime;

                  return (
                    <div
                      key={dayIdx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl transition-all ${
                        dayConfig.enabled ? 'bg-white border border-slate-200' : 'bg-slate-100/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 w-36">
                        <input
                          type="checkbox"
                          id={`day-${dayIdx}`}
                          checked={dayConfig.enabled}
                          onChange={(e) => handleDayChange(dayIdx, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <label
                          htmlFor={`day-${dayIdx}`}
                          className={`text-xs font-bold ${
                            dayConfig.enabled ? 'text-slate-800' : 'text-slate-400 line-through'
                          }`}
                        >
                          {DAYS_ES[dayIdx]}
                        </label>
                      </div>

                      {dayConfig.enabled ? (
                        <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-1 justify-end">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500">De:</span>
                            <input
                              type="time"
                              value={dayConfig.openTime}
                              onChange={(e) => handleDayChange(dayIdx, 'openTime', e.target.value)}
                              className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 font-mono focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <span className="text-slate-400 text-xs">a</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={dayConfig.closeTime}
                              onChange={(e) => handleDayChange(dayIdx, 'closeTime', e.target.value)}
                              className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 font-mono focus:border-indigo-500 focus:outline-none"
                            />
                            {isCrossMidnight && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-semibold"
                                title="Cruza la medianoche (cierra al día siguiente)"
                              >
                                +1 día
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium italic mt-2 sm:mt-0">
                          Acceso deshabilitado (cerrado)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
            <AppIcon name="clock" size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold">Regla de seguridad:</strong> El Dueño y el Gerente siempre
              tienen acceso continuo las 24 horas. Este horario solo aplica a los empleados operativos
              (meseros, cocineros, cajeros, etc.). Cualquier sesión activa fuera de horario se cerrará automáticamente.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>Guardar Horarios</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

