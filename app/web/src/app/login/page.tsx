'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppIcon } from '@/components/icons';

export default function LoginPage() {
  const router = useRouter();
  const { adminUser, loginAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (adminUser) {
      router.push('/');
    }
  }, [adminUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginAdmin(username.trim(), password);
      router.push('/');
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 mb-3 shadow-inner">
            <AppIcon name="utensils" size={28} className="text-indigo-200" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">POS Restaurante</h1>
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
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AppIcon name="error" size={15} className="text-rose-600 shrink-0" />
              <span>{error}</span>
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
                placeholder="root"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
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
                placeholder="root"
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

            {/* Quick Test Button */}
            <button
              type="button"
              onClick={() => {
                setUsername('root');
                setPassword('root');
              }}
              className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition flex items-center justify-center gap-1.5"
            >
              <AppIcon name="zap" size={14} className="text-amber-700" />
              <span>Rellenar credenciales de prueba (root / root)</span>
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <Link
              href="/worker"
              className="text-emerald-600 hover:text-emerald-800 font-bold transition flex items-center gap-1"
            >
              <AppIcon name="users" size={13} />
              <span>¿Es trabajador? Estación Tablet</span>
            </Link>
            <Link
              href="/root-admin"
              className="text-slate-500 hover:text-indigo-600 font-medium transition flex items-center gap-1.5"
              title="Panel protegido de alta"
            >
              <AppIcon name="settings" size={13} />
              <span>Administrador Root</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
