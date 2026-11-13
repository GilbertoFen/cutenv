'use client';

import React, { useState, useEffect } from 'react';
import {
  ConnectionStatus,
  ConnectionStateDetail,
  reconnectAllSockets,
  getGlobalConnectionState,
} from '@/gateways/socketManager';

export default function ConnectionStatusBanner() {
  const [status, setStatus] = useState<ConnectionStatus>('connected');
  const [attempt, setAttempt] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(25);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    // Inicializar con el estado global actual
    const initial = getGlobalConnectionState();
    if (initial.status !== 'connected') {
      setStatus(initial.status);
      setAttempt(initial.attempt);
    }

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ConnectionStateDetail>;
      const detail = customEvent.detail;
      if (!detail) return;

      setStatus((prevStatus) => {
        if ((prevStatus === 'reconnecting' || prevStatus === 'disconnected') && detail.status === 'connected') {
          // Mostrar notificación de conexión recuperada temporalmente
          setShowRestored(true);
          setTimeout(() => setShowRestored(false), 2500);
        }
        return detail.status;
      });

      setAttempt(detail.attempt || 0);
      if (detail.maxAttempts) setMaxAttempts(detail.maxAttempts);
    };

    window.addEventListener('pos:connection-status', handler);
    return () => {
      window.removeEventListener('pos:connection-status', handler);
    };
  }, []);

  // Si está conectado y no hay aviso de recuperado, no mostrar nada
  if (status === 'connected' && !showRestored) {
    return null;
  }

  // Si se acaba de recuperar la conexión
  if (showRestored) {
    return (
      <aside
        aria-label="Notificaciones de conectividad"
        className="fixed bottom-4 right-4 z-50 pointer-events-none transition-all duration-300 animate-fadeIn"
      >
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/95 text-white shadow-soft-lg text-xs font-bold border border-emerald-500 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-white"></span>
          <span>Conexión restaurada con el servidor</span>
        </div>
      </aside>
    );
  }

  // Estado reconectando
  if (status === 'reconnecting') {
    return (
      <aside
        aria-label="Notificaciones de conectividad"
        className="fixed bottom-4 right-4 z-50 transition-all duration-300 animate-fadeIn"
      >
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-600/95 text-white shadow-soft-lg text-xs font-semibold border border-amber-500 backdrop-blur-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
          <span>
            Reconectando con el servidor
            {attempt > 0 ? ` (intento ${attempt}${maxAttempts ? `/${maxAttempts}` : ''})` : '...'}
          </span>
        </div>
      </aside>
    );
  }

  // Estado desconectado
  if (status === 'disconnected') {
    return (
      <aside
        aria-label="Notificaciones de conectividad"
        className="fixed bottom-4 right-4 z-50 transition-all duration-300 animate-fadeIn"
      >
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-rose-600/95 text-white shadow-soft-xl text-xs font-semibold border border-rose-500 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white/90"></span>
            <span>Sin conexión con el servidor</span>
          </div>
          <button
            type="button"
            onClick={() => reconnectAllSockets()}
            className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold transition active:scale-95 text-[11px]"
          >
            Reintentar ahora
          </button>
        </div>
      </aside>
    );
  }

  return null;
}

