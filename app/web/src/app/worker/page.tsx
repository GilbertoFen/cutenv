'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppIcon } from '@/components/icons';
import WorkerLoginForm from '@/components/Worker/WorkerLoginForm';

export default function WorkerPage() {
  const router = useRouter();
  const { workerUser, loading, logoutWorker } = useAuth();

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

  if (!workerUser || workerUser.role !== 'worker') {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <WorkerLoginForm />
      </div>
    );
  }

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
      <header className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Estación Operativa Tablet
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Hola, {workerUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Selecciona tu módulo de atención o preparación para comenzar
          </p>
        </div>

        <button
          onClick={logoutWorker}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 active:scale-95 shadow-sm"
        >
          <AppIcon name="logout" size={18} className="text-rose-600" />
          <span>Cerrar Turno / Salir</span>
        </button>
      </header>

      {/* Grid de 4 Grandes Tarjetas Táctiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {modules.map((m) => (
          <Link
            key={m.id}
            href={m.href}
            className="group relative bg-white rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl border-2 border-slate-200 hover:border-indigo-500 transition-all duration-200 flex flex-col justify-between min-h-[190px] sm:min-h-[220px] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${m.badgeColor}`}>
                  {m.badge}
                </span>
                <span className="text-xs text-indigo-600 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  <span>Abrir</span>
                  <span>→</span>
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${m.color} text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform`}
                >
                  <AppIcon name={m.icon} size={30} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-indigo-900 transition-colors">
                    {m.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {m.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-600">Toque para ingresar</span>
              <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-indigo-600 transition-colors"></span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
