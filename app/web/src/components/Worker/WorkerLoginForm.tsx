'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppIcon } from '@/components/icons';

interface WorkerLoginFormProps {
  onSuccess?: () => void;
}

export default function WorkerLoginForm({ onSuccess }: WorkerLoginFormProps) {
  const { loginWorker } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginWorker(username.trim(), password);
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = '/worker';
      }
    } catch (err: any) {
      setError(
        err.message ||
          'Usuario o contraseña incorrectos. Verifique sus credenciales con el Gerente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-xl border-2 border-indigo-100 overflow-hidden">
        {/* Banner Operativo Tablet */}
        <div className="bg-gradient-to-r from-[#14144f] to-indigo-800 p-6 sm:p-8 text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-3 shadow-inner">
            <AppIcon name="users" size={32} className="text-indigo-200" />
          </div>
          <div className="inline-block bg-indigo-500/30 text-indigo-200 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full mb-1">
            Estación Operativa Tablet
          </div>
          <h1 className="text-2xl font-black tracking-tight">Acceso de Trabajador</h1>
          <p className="text-indigo-200 text-xs mt-1">
            Mesero · Cocina · Cajero · Recepción
          </p>
        </div>

        {/* Formulario */}
        <div className="p-6 sm:p-8">
          <div className="mb-5 text-center">
            <h2 className="text-base font-bold text-slate-800">Inicie su turno de trabajo</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingrese su usuario y contraseña asignados por la administración.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2.5">
              <AppIcon name="error" size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuario de Trabajador
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. carlos_waiter"
                autoComplete="username"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-base focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-base focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              <AppIcon name="lock" size={16} />
              <span>{loading ? 'Validando turno…' : 'Iniciar Turno de Trabajo'}</span>
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>¿Es Administrador o Gerente?</span>
            <Link
              href="/login"
              className="text-indigo-600 hover:text-indigo-800 font-bold transition flex items-center gap-1"
            >
              <span>Acceso Administrativo</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
