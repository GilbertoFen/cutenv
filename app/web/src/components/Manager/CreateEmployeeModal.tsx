'use client';

import React, { useState } from 'react';
import { AppIcon } from '@/components/icons';
import { createEmployee } from '@/services/EmployeeService';
import type { OperationalRole, DaySchedule, EmployeeItem } from '@/types';

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newEmployee: EmployeeItem) => void;
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

export default function CreateEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserRole = 'manager',
}: CreateEmployeeModalProps) {
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'worker' | 'manager'>('worker');
  const [operationalRole] = useState<OperationalRole>('general');
  const [password, setPassword] = useState('');

  // Schedule
  const [useCustomSchedule, setUseCustomSchedule] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success view (when created with invitation token)
  const [createdResult, setCreatedResult] = useState<{
    employee: EmployeeItem;
    invitationUrl?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

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
        username: username.trim().toLowerCase(),
        role: currentUserRole === 'owner' ? role : 'worker',
        operationalRole,
        password: password.trim() || undefined,
      };

      if (useCustomSchedule) {
        payload.individualSchedule = {
          enabled: true,
          weeklySchedule,
        };
      }

      const res = await createEmployee(payload);
      const host = typeof window !== 'undefined' ? window.location.origin : '';
      const inviteUrl = res.invitationToken
        ? `${host}/set-password?token=${res.invitationToken}`
        : undefined;

      setCreatedResult({
        employee: res.employee,
        invitationUrl: inviteUrl,
      });

      onSuccess(res.employee);
    } catch (err: any) {
      setError(err.message || 'Error al dar de alta al empleado');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (createdResult?.invitationUrl) {
      navigator.clipboard.writeText(createdResult.invitationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setName('');
    setLastName('');
    setEmail('');
    setUsername('');
    setPassword('');
    setUseCustomSchedule(false);
    setCreatedResult(null);
    onClose();
  };

  const orderedDays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 to-indigo-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-indigo-200">
              <AppIcon name="users" size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {createdResult ? '¡Empleado Registrado!' : 'Registrar Nuevo Empleado'}
              </h2>
              <p className="text-xs text-indigo-200">
                {createdResult
                  ? 'La cuenta ha sido creada exitosamente en el sistema'
                  : 'Complete los datos del empleado y asigne sus permisos'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <AppIcon name="close" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700">
          {createdResult ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
                <AppIcon name="check" size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm mb-1">
                    Empleado registrado correctamente
                  </div>
                  <div>
                    <strong>{createdResult.employee.name} {createdResult.employee.lastName}</strong> ({createdResult.employee.username})
                  </div>
                </div>
              </div>

              {createdResult.invitationUrl ? (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <div className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                    <AppIcon name="security" size={16} className="text-indigo-600" />
                    <span>Enlace de Invitación de Seguridad (Válido por 72 horas)</span>
                  </div>
                  <p className="text-xs text-indigo-700">
                    Envíe este enlace de un solo uso al empleado para que establezca su contraseña de manera segura:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdResult.invitationUrl}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 bg-white font-mono text-slate-700 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shrink-0 transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <AppIcon name={copied ? 'check' : 'copy'} size={14} />
                      <span>{copied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  La contraseña inicial fue establecida. El empleado ya puede iniciar sesión con su usuario y contraseña.
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} id="create-employee-form" className="space-y-4">
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
                    placeholder="Carlos"
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
                    placeholder="Hernández"
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
                    placeholder="carlos@ejemplo.com"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nombre de Usuario *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="carlos_mesero"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Nivel de Sistema */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nivel de Sistema
                </label>
                {currentUserRole === 'owner' ? (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'worker' | 'manager')}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="worker">Trabajador Operativo (Sujeto a Horarios)</option>
                    <option value="manager">Gerente (Acceso 24/7 sin restricción)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value="Trabajador Operativo"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium"
                  />
                )}
              </div>

              {/* Contraseña Inicial Establecida por el Gerente */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contraseña Inicial del Empleado *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Defina la contraseña inicial (mínimo 4 caracteres)"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  El gerente define la contraseña inicial. Se almacena mediante un hash seguro en el backend. Posteriormente podrá compartir con el empleado el enlace seguro para actualizar su contraseña.
                </p>
              </div>

              {/* Custom Schedule Toggle */}
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
                      <span>Personalizar horario de este empleado</span>
                    </label>
                    <p className="text-[11px] text-slate-500 ml-6">
                      {useCustomSchedule
                        ? 'El empleado solo podrá ingresar en los turnos aquí definidos dentro del horario general.'
                        : 'Por defecto, el empleado hereda el horario de apertura y cierre del restaurante.'}
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
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
          {createdResult ? (
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"
            >
              Listo
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="create-employee-form"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Registrar Empleado</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

