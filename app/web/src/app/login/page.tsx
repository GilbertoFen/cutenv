'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppIcon } from '@/components/icons';
import { requestPasswordResetSubmission } from '@/services/AuthService';

export default function LoginPage() {
  const router = useRouter();
  const { adminUser, loginAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal para solicitar restablecimiento
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleRequestResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSubmitting(true);
    setResetFeedback(null);
    try {
      const res = await requestPasswordResetSubmission(resetIdentifier, resetReason);
      setResetFeedback({
        type: 'success',
        message: res.message || 'Solicitud enviada a Gerencia. Su Gerente o Dueño debe autorizarla.',
      });
      setResetIdentifier('');
      setResetReason('');
    } catch (err: any) {
      setResetFeedback({
        type: 'error',
        message: err.message || 'Error al enviar la solicitud',
      });
    } finally {
      setResetSubmitting(false);
    }
  };

  useEffect(() => {
    if (adminUser) {
      router.push('/manager');
    }
  }, [adminUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginAdmin(username.trim(), password);
      router.push('/manager');
    } catch (err: any) {
      setError(err.message || 'Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header decoration */}
        <div className="bg-[#14144f] p-8 text-center text-white relative">
          <div className="flex items-center justify-center mb-3">
            <img
              src="/logo.png"
              alt="Logo Restaurante"
              className="h-14 sm:h-16 w-auto max-w-[220px] object-contain drop-shadow-md mx-auto"
            />
          </div>
          <h1 className="text-xl font-black tracking-tight">Acceso Administrativo</h1>
          <p className="text-indigo-200 text-xs mt-1">
            Sistema Comercial y Operativo Local-First
          </p>
        </div>

        {/* Login form */}
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Iniciar Sesión</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingrese sus credenciales de usuario para acceder al sistema.
            </p>
          </div>

          {error && (
            <div
              className={`mb-4 p-3 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
                error.toLowerCase().includes('horario')
                  ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <AppIcon
                name={error.toLowerCase().includes('horario') ? 'clock' : 'error'}
                size={16}
                className={`shrink-0 mt-0.5 ${
                  error.toLowerCase().includes('horario') ? 'text-amber-600' : 'text-rose-600'
                }`}
              />
              <div className="leading-relaxed">
                {error.toLowerCase().includes('horario') && (
                  <strong className="block font-bold text-amber-950 mb-0.5">
                    Acceso Restringido por Horario:
                  </strong>
                )}
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetModalOpen(true);
                    setResetFeedback(null);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <AppIcon name="lock" size={15} />
              <span>{loading ? 'Iniciando sesión…' : 'Ingresar al Sistema'}</span>
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center text-xs text-slate-400">
            <Link
              href="/worker"
              className="text-emerald-600 hover:text-emerald-800 font-bold transition flex items-center gap-1.5"
            >
              <AppIcon name="users" size={14} />
              <span>¿Es trabajador operativo? Iniciar sesión aquí</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Modal: Solicitar Restablecimiento de Contraseña */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <AppIcon name="lock" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Solicitud de Restablecimiento
                  </h3>
                  <p className="text-xs text-slate-500">
                    Autorización explícita por Gerencia
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
              >
                <AppIcon name="close" size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Por políticas de seguridad, no se emiten enlaces desatendidos. Tu solicitud será enviada al panel del Gerente o Dueño para que la revise y autorice explícitamente antes de generar tu enlace de acceso.
            </p>

            {resetFeedback && (
              <div
                className={`p-3 rounded-2xl text-xs font-semibold ${
                  resetFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {resetFeedback.message}
              </div>
            )}

            <form onSubmit={handleRequestResetSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Usuario o Correo Electrónico *
                </label>
                <input
                  type="text"
                  required
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="Ej. usuario o correo@ejemplo.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Motivo (Opcional)
                </label>
                <input
                  type="text"
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="Ej. Olvidé mi clave / cambio periódico"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {resetSubmitting ? 'Enviando…' : 'Enviar a Gerencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
