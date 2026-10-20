'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppIcon } from '@/components/icons';
import WorkerLoginForm from '@/components/Worker/WorkerLoginForm';

export default function WorkerPage() {
  const router = useRouter();
  const { adminUser, workerUser, loading, logoutWorker, logoutAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center text-slate-400 text-sm">
          <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Cargando estación de trabajo…
        </div>
      </div>
    );
  }

  // El administrador o gerente logueado tiene autorización completa para operar la estación
  const currentUser =
    workerUser ||
    (adminUser && (adminUser.role === 'owner' || adminUser.role === 'manager')
      ? adminUser
      : null);

  if (!currentUser) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <WorkerLoginForm />
      </div>
    );
  }

  const isOperatorAdmin = Boolean(
    adminUser &&
      (adminUser.role === 'owner' || adminUser.role === 'manager') &&
      (!workerUser || workerUser.role !== 'worker')
  );

  const modules = [
    {
      id: 'waiter',
      title: 'Mesero y Comandas',
      subtitle: 'Toma de pedidos, gestión de mesas activas y entrega de platillos',
      href: '/waiter',
      icon: 'waiter' as const,
      color: 'from-blue-600 to-indigo-700',
      badge: 'Servicio en Sala',
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'cook',
      title: 'Cocina y Preparación',
      subtitle: 'Comandas en cola, tiempos de preparación y pase de platillos listos',
      href: '/cook',
      icon: 'chef' as const,
      color: 'from-amber-600 to-orange-700',
      badge: 'Área de Cocina',
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      id: 'cashier',
      title: 'Caja y Cobro',
      subtitle: 'Emisión de tickets, promociones 2x1 y registro de cobros',
      href: '/cashier',
      icon: 'cashier' as const,
      color: 'from-emerald-600 to-teal-700',
      badge: 'Cobros y Cuentas',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'receptionist',
      title: 'Recepción y Host',
      subtitle: 'Asignación de mesas a comensales y control de reservaciones',
      href: '/receptionist',
      icon: 'reception' as const,
      color: 'from-purple-600 to-indigo-800',
      badge: 'Llegadas y Agenda',
      badgeColor: 'bg-purple-100 text-purple-800',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn px-2 sm:px-4 py-2">
      {/* Header Operativo para Tablet */}
      <header className="bg-white rounded-3xl p-6 sm:p-8 shadow-soft-xs border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              {isOperatorAdmin ? 'Modo Operativo (Administrador)' : 'Estación Operativa • Modo Táctil'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Hola, {currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Selecciona tu módulo de atención o preparación para comenzar tu jornada
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {isOperatorAdmin && (
            <Link
              href="/manager"
              className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs sm:text-sm font-black transition flex items-center gap-2 shadow-soft-xs"
            >
              <AppIcon name="manager" size={16} />
              <span>Panel Gerente</span>
            </Link>
          )}

          <button
            onClick={workerUser ? logoutWorker : logoutAdmin}
            className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 active:scale-95 shadow-soft-xs"
          >
            <AppIcon name="logout" size={16} className="text-rose-600" />
            <span>Cerrar Turno / Salir</span>
          </button>
        </div>
      </header>

      {/* Grid de 4 Grandes Tarjetas Táctiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
        {modules.map((m) => (
          <Link
            key={m.id}
            href={m.href}
            className="group relative bg-white rounded-3xl p-6 sm:p-8 shadow-soft-xs hover:shadow-soft-lg border border-slate-200/90 hover:border-indigo-400 transition-all duration-200 flex flex-col justify-between min-h-[210px] sm:min-h-[230px] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${m.badgeColor}`}>
                  {m.badge}
                </span>
                <span className="text-xs text-indigo-600 font-black group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  <span>Abrir módulo</span>
                  <span>→</span>
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${m.color} text-white flex items-center justify-center shrink-0 shadow-soft-sm group-hover:scale-105 transition-transform`}
                >
                  <AppIcon name={m.icon} size={30} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">
                    {m.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {m.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1">
                <span>📱 Optimizado para pantalla táctil</span>
              </span>
              <span className="text-indigo-600 font-black">Tocar para ingresar</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
