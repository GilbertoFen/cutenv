'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from '@/components/icons';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'primary';
}

interface NotificationContextValue {
  toasts: ToastItem[];
  notify: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
  };
  removeToast: (id: string) => void;
  confirm: (options: ConfirmDialogOptions | string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    options: ConfirmDialogOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevenir duplicados idénticos en un corto periodo
  const recentMessagesRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: NotificationType, message: string, title?: string, duration: number = 4000) => {
      const now = Date.now();
      const key = `${type}:${message}`;
      const lastShown = recentMessagesRef.current.get(key) || 0;

      // Si el mismo mensaje se disparó hace menos de 2.5 segundos, evitar duplicado
      if (now - lastShown < 2500) {
        return;
      }
      recentMessagesRef.current.set(key, now);

      const id = `${now}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const notify = {
    success: (msg: string, title?: string, duration?: number) => addToast('success', msg, title, duration),
    error: (msg: string, title?: string, duration?: number) => addToast('error', msg, title ?? 'Error', duration ?? 5000),
    warning: (msg: string, title?: string, duration?: number) => addToast('warning', msg, title ?? 'Advertencia', duration ?? 4500),
    info: (msg: string, title?: string, duration?: number) => addToast('info', msg, title, duration),
  };

  const confirm = useCallback((options: ConfirmDialogOptions | string): Promise<boolean> => {
    const opts: ConfirmDialogOptions =
      typeof options === 'string'
        ? { message: options, title: 'Confirmar acción' }
        : {
            title: options.title || 'Confirmar acción',
            message: options.message,
            confirmText: options.confirmText || 'Confirmar',
            cancelText: options.cancelText || 'Cancelar',
            type: options.type || 'primary',
          };

    return new Promise<boolean>((resolve) => {
      setConfirmDialog({
        isOpen: true,
        options: opts,
        resolve: (val: boolean) => {
          setConfirmDialog(null);
          resolve(val);
        },
      });
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ toasts, notify, removeToast, confirm }}>
      {children}

      {/* Portal de Notificaciones Toast flotantes montado en document.body con z-index superior a modales */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <div
          aria-live="polite"
          id="pos-toasts-portal"
          className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0"
          style={{ zIndex: 99999 }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto w-full rounded-2xl p-4 shadow-2xl border flex items-start gap-3 transition-all duration-300 transform translate-y-0 opacity-100 animate-slideIn ${
                toast.type === 'success'
                  ? 'bg-emerald-950/95 text-white border-emerald-500/50 shadow-emerald-950/50'
                  : toast.type === 'error'
                  ? 'bg-rose-950/95 text-white border-rose-500/50 shadow-rose-950/50'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/95 text-amber-50 border-amber-500/50 shadow-amber-950/50'
                  : 'bg-slate-900/95 text-white border-slate-700 shadow-slate-950/50'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <AppIcon name="check" size={20} className="text-emerald-300" />}
                {toast.type === 'error' && <AppIcon name="error" size={20} className="text-rose-300" />}
                {toast.type === 'warning' && <AppIcon name="warning" size={20} className="text-amber-300" />}
                {toast.type === 'info' && <AppIcon name="clock" size={20} className="text-sky-300" />}
              </div>

              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="text-xs font-black uppercase tracking-wider mb-0.5 opacity-90">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs sm:text-sm font-semibold leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-white/60 hover:text-white transition p-1 rounded-lg hover:bg-white/10 active:scale-95 cursor-pointer"
                title="Cerrar notificación"
                aria-label="Cerrar notificación"
              >
                <span className="text-base font-bold leading-none">✕</span>
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Modal de Confirmación Nativo del POS en portal directo con z-index máximo */}
      {mounted && typeof document !== 'undefined' && confirmDialog && confirmDialog.isOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
          style={{ zIndex: 100000 }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 transform transition-all animate-scaleIn">
            <div className="flex items-center gap-3.5 mb-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 ${
                  confirmDialog.options.type === 'danger'
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : confirmDialog.options.type === 'warning'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                {confirmDialog.options.type === 'danger' ? (
                  <AppIcon name="delete" size={22} />
                ) : confirmDialog.options.type === 'warning' ? (
                  <AppIcon name="warning" size={22} />
                ) : (
                  <AppIcon name="check" size={22} />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {confirmDialog.options.title}
                </h3>
                <span className="text-[11px] font-bold text-slate-400">
                  Confirmación de operación
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              {confirmDialog.options.message}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => confirmDialog.resolve(false)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition active:scale-95"
              >
                {confirmDialog.options.cancelText || 'Cancelar'}
              </button>

              <button
                type="button"
                autoFocus
                onClick={() => confirmDialog.resolve(true)}
                className={`min-h-[44px] px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm text-white transition active:scale-95 shadow-soft-xs ${
                  confirmDialog.options.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmDialog.options.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmDialog.options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return ctx;
}
