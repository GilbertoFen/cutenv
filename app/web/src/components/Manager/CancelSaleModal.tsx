'use client';

import React, { useState } from 'react';
import { cancelSale } from '@/services/SaleService';
import type { SaleData } from '@/types';
import { currency } from '@/utils/Manager/manager.functions';
import { AppIcon } from '@/components/icons';

interface Props {
  sale: SaleData | null;
  onClose: () => void;
  onCancelled: () => void;
}

export default function CancelSaleModal({ sale, onClose, onCancelled }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sale) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Debe detallar el motivo de la cancelación (mínimo 5 caracteres).');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await cancelSale(sale.id, {
        username: username.trim(),
        password,
        reason: reason.trim(),
      });
      alert('La cuenta ha sido cancelada exitosamente y la mesa ha sido liberada.');
      onCancelled();
      onClose();
    } catch (err: any) {
      setError(err.message || 'No se pudo cancelar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-rose-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AppIcon name="warning" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Cancelar Cuenta Manualmente</h3>
              <p className="text-xs text-rose-100">
                Acción administrativa sensible. Requiere credenciales de gerente y nota explicativa obligatoria.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Info de la cuenta */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
            <div>
              <p className="text-slate-500">Folio: <strong className="text-slate-900 font-mono">{sale.folio}</strong></p>
              <p className="text-slate-500 mt-0.5">
                Mesa: <strong className="text-slate-900">{typeof sale.table === 'object' && sale.table?.number ? sale.table.number : 'S/N'}</strong>
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500">Importe total:</p>
              <p className="text-base font-black text-rose-700">{currency(sale.totalAmount || 0)}</p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Usuario Gerente
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="root"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
                  placeholder="root"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setUsername('root');
                setPassword('root');
              }}
              className="py-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 transition inline-flex items-center gap-1.5"
            >
              <AppIcon name="zap" size={12} className="text-amber-600" />
              <span>Rellenar credenciales de prueba (root / root)</span>
            </button>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Motivo / Justificación de la Cancelación <span className="text-rose-600">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explique detalladamente por qué se cancela esta cuenta (ej: mesa se retiró sin consumir, error en duplicidad de ticket, cortesía gerencial, etc.)..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Esta nota quedará registrada permanentemente y se mostrará visible al lado de la cuenta cancelada.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Volver sin cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-60"
              >
                {loading ? 'Cancelando cuenta…' : 'Confirmar Cancelación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
