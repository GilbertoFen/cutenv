'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  validateInvitation,
  acceptInvitation,
  validatePasswordReset,
  confirmPasswordReset,
} from '@/services/AuthService';
import { AppIcon } from '@/components/icons';

function SetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token') || '';
  const isResetMode = searchParams.get('mode') === 'reset';

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [targetUser, setTargetUser] = useState<{
    name: string;
    email: string;
    role?: string;
    restaurantName?: string;
  } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Enlace inválido o sin token de autorización.');
      setValidating(false);
      return;
    }

    const checkToken = async () => {
      try {
        if (isResetMode) {
          const res = await validatePasswordReset(token);
          setTargetUser(res);
        } else {
          const res = await validateInvitation(token);
          setTargetUser(res);
        }
      } catch (err: any) {
        setError(err.message || 'El enlace ha expirado o ya fue utilizado.');
      } finally {
        setValidating(false);
      }
    };

    checkToken();
  }, [token, isResetMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Verifique ambos campos.');
      return;
    }

    setSubmitting(true);
    try {
      if (isResetMode) {
        const res = await confirmPasswordReset(token, password);
        setSuccess(res.message || 'Contraseña actualizada con éxito.');
      } else {
        const res = await acceptInvitation(token, password);
        setSuccess(res.message || 'Contraseña establecida exitosamente.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTargetLoginRoute = () => {
    if (targetUser?.role === 'worker') return '/worker/login';
    return '/login';
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-soft-xl border border-slate-200/90 max-w-md w-full text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-lg font-bold text-slate-800">Verificando enlace de acceso seguro…</h2>
          <p className="text-xs text-slate-500 mt-1">Validando token criptográfico con el servidor</p>
        </div>
      </div>
    );
  }

  if (error && !targetUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-soft-xl border border-rose-200 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-600 mx-auto mb-4 shadow-soft-xs">
            <AppIcon name="lock" size={28} />
          </div>
          <h2 className="text-xl font-black text-slate-900">Enlace No Válido o Expirado</h2>
          <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">{error}</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow-soft-xs"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-soft-xl border border-slate-200/90 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-3 shadow-soft-xs">
            <AppIcon name="security" size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            {isResetMode ? 'Restablecimiento de Contraseña' : 'Bienvenida al POS'}
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-2">
            {isResetMode ? 'Nueva Contraseña de Acceso' : 'Configura tu Contraseña'}
          </h1>
          {targetUser && (
            <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-800">{targetUser.name}</p>
              <p className="text-[11px] text-slate-600 mt-0.5">{targetUser.email}</p>
              {targetUser.restaurantName && (
                <p className="text-[10px] text-indigo-600 font-bold mt-1">
                  Restaurante: {targetUser.restaurantName}
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-3">
              <AppIcon name="check" size={24} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 mb-1">¡Operación Exitosa!</h3>
            <p className="text-xs text-slate-500 mb-6">{success}</p>
            <button
              onClick={() => router.push(getTargetLoginRoute())}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition active:scale-95 shadow-soft-xs"
            >
              Iniciar Sesión en el POS
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nueva Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs transition active:scale-95 shadow-soft-xs mt-2"
            >
              {submitting ? 'Guardando contraseña…' : 'Establecer Contraseña e Ingresar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}

