'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AppIcon } from '@/components/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManagerUnlockModal({ isOpen, onClose, onSuccess }: Props) {
  const { unlockManager } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await unlockManager(username.trim(), password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Credenciales de gerente incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-[#14144f] p-6 text-white text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/40 border border-indigo-400/30 mb-2">
            <AppIcon name="manager" size={24} className="text-indigo-200" />
          </div>
          <h3 className="text-lg font-bold">Autorización Gerencial Requerida</h3>
          <p className="text-xs text-indigo-200 mt-1">
            Para acceder a la sección de Monitoreo y Operativa, ingrese las credenciales de un usuario Gerente previamente dado de alta.
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-1.5">
              <AppIcon name="warning" size={15} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Usuario del Gerente
              </label>
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nombre de usuario gerente..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña del gerente..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-[#14144f] hover:bg-[#1f1f6d] text-white text-xs font-bold transition shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                <AppIcon name="lock" size={13} />
                <span>{loading ? 'Verificando…' : 'Validar y Entrar'}</span>
              </button>
            </div>

            {/* Quick Test Button */}
            <button
              type="button"
              onClick={() => {
                setUsername('root');
                setPassword('root');
              }}
              className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition flex items-center justify-center gap-1.5"
            >
              <AppIcon name="zap" size={13} className="text-amber-700" />
              <span>Rellenar credenciales de prueba (root / root)</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
