'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppIcon } from '@/components/icons';

function NavbarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    adminUser,
    workerUser,
    logoutAdmin,
    logoutWorker,
    loading,
  } = useAuth();

  // Determinar si la ruta actual pertenece al flujo operativo del trabajador
  const isWorkerRoute = Boolean(
    pathname &&
      (pathname.startsWith('/worker') ||
        pathname.startsWith('/waiter') ||
        pathname.startsWith('/cook') ||
        pathname.startsWith('/cashier') ||
        pathname.startsWith('/receptionist'))
  );

  // Operador activo en rutas operativas: trabajador o admin con permisos operacionales
  const activeOperator =
    workerUser ||
    (adminUser && (adminUser.role === 'owner' || adminUser.role === 'manager')
      ? adminUser
      : null);

  // 1. FLUJO DE TRABAJADOR OPERATIVO
  if (isWorkerRoute) {
    // Si no hay operador activo o está en la pantalla de login sin sesión, no mostrar el navbar
    if (loading || !activeOperator || pathname === '/worker/login') {
      return null;
    }

    const isElevatedUser = activeOperator.role === 'owner' || activeOperator.role === 'manager';

    // El botón "Volver a Estación" solo debe mostrarse dentro de una estación específica:
    // Mesero, Cocina, Cajero, Recepción. NO en la pantalla principal de selección (/worker).
    const isInsideSpecificStation = Boolean(
      pathname &&
        (pathname.startsWith('/waiter') ||
          pathname.startsWith('/cook') ||
          pathname.startsWith('/cashier') ||
          pathname.startsWith('/receptionist'))
    );

    return (
      <header className="bg-slate-900 text-white shadow-soft-sm sticky top-0 z-40 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Marca de la Estación de Trabajo y accesos de retorno */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Link
                href="/worker"
                className="flex items-center gap-2 py-1 transition-opacity hover:opacity-90"
                title="Ir a Estación de Trabajo"
              >
                <img
                  src="/logo.png"
                  alt="Restaurante"
                  className="h-8 sm:h-9 w-auto max-w-[140px] sm:max-w-[180px] object-contain drop-shadow-sm"
                />
              </Link>

              {/* Botón para regresar a la selección de estaciones (solo visible dentro de una estación específica) */}
              {isInsideSpecificStation && (
                <Link
                  href="/worker"
                  className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shadow-soft-xs bg-slate-800 hover:bg-slate-700 text-white active:scale-95"
                  title="Volver a la selección de estaciones"
                >
                  <AppIcon name="arrow-left" size={14} />
                  <span className="hidden md:inline">Volver a Estación</span>
                  <span className="md:hidden">Inicio</span>
                </Link>
              )}

              {/* Si es un Administrador o Gerente operando en la vista de trabajador, permitir regresar al panel de gestión */}
              {isElevatedUser && (
                <Link
                  href="/manager"
                  className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600/80 hover:bg-indigo-600 text-white flex items-center gap-1.5 transition-all shadow-soft-xs border border-indigo-400/30 active:scale-95"
                  title="Volver al panel administrativo y de monitoreo"
                >
                  <AppIcon name="manager" size={14} />
                  <span className="hidden sm:inline">Panel Gestión</span>
                </Link>
              )}
            </div>

            {/* Módulos Operativos Exclusivos del Trabajador */}
            <nav className="hidden lg:flex items-center gap-1.5 overflow-x-auto">
              <Link
                href="/waiter"
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-1.5 ${
                  pathname.startsWith('/waiter')
                    ? 'bg-indigo-600 text-white shadow-soft-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <AppIcon name="waiter" size={15} />
                <span>Mesero</span>
              </Link>
              <Link
                href="/cook"
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-1.5 ${
                  pathname.startsWith('/cook')
                    ? 'bg-indigo-600 text-white shadow-soft-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <AppIcon name="cooking" size={15} />
                <span>Cocina</span>
              </Link>
              <Link
                href="/cashier"
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-1.5 ${
                  pathname.startsWith('/cashier')
                    ? 'bg-indigo-600 text-white shadow-soft-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <AppIcon name="cashier" size={15} />
                <span>Cajero</span>
              </Link>
              <Link
                href="/receptionist"
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-1.5 ${
                  pathname.startsWith('/receptionist')
                    ? 'bg-indigo-600 text-white shadow-soft-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <AppIcon name="orders" size={15} />
                <span>Recepción</span>
              </Link>
            </nav>

            {/* Identidad del operador activo y Cerrar Turno / Salir */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-black text-white flex items-center gap-1.5 justify-end">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeOperator.role === 'owner'
                        ? 'bg-amber-400'
                        : activeOperator.role === 'manager'
                        ? 'bg-sky-400'
                        : 'bg-emerald-400 animate-pulse'
                    }`}
                  ></span>
                  <span>{activeOperator.name}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {activeOperator.role === 'owner'
                    ? 'Dueño / Administrador'
                    : activeOperator.role === 'manager'
                    ? 'Gerente en Operativa'
                    : 'Trabajador Operativo'}
                </div>
              </div>

              {workerUser ? (
                <button
                  onClick={logoutWorker}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-950/60 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-800/60 transition flex items-center gap-1.5 active:scale-95 shadow-soft-xs"
                  title="Cerrar turno e invalidar la sesión del trabajador"
                >
                  <AppIcon name="logout" size={14} />
                  <span>Cerrar Turno</span>
                </button>
              ) : (
                <button
                  onClick={logoutAdmin}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-black bg-slate-800 hover:bg-rose-900 text-slate-200 hover:text-white border border-slate-700 transition flex items-center gap-1.5 active:scale-95"
                  title="Cerrar sesión administrativa"
                >
                  <AppIcon name="logout" size={14} />
                  <span>Salir</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  // 2. FLUJO ADMINISTRATIVO (Gerente / Dueño)
  if (loading || !adminUser || pathname === '/login' || pathname === '/root-admin') {
    return null;
  }

  const isWorkdayView = pathname.startsWith('/manager') && searchParams?.get('view') === 'workday';
  const isMonitoringView = pathname.startsWith('/manager') && !isWorkdayView;

  return (
    <header className="bg-[#14144f] text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <Link
              href="/manager"
              className="flex items-center gap-2 py-1 transition-opacity hover:opacity-90"
              title="Panel Administrativo"
            >
              <img
                src="/logo.png"
                alt="Restaurante"
                className="h-8 sm:h-9 w-auto max-w-[140px] sm:max-w-[180px] object-contain drop-shadow-sm"
              />
            </Link>

            {/* Nueva Navegación Administrativa: Monitoreo y Operativa / Día de Trabajo */}
            <nav className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4 overflow-x-auto">
              <Link
                href="/manager"
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5 ${
                  isMonitoringView
                    ? 'bg-indigo-700 text-white font-bold shadow-sm'
                    : 'text-indigo-200 hover:bg-[#1f1f6d] hover:text-white'
                }`}
              >
                <AppIcon name="manager" size={15} />
                <span>Monitoreo y Operativa</span>
              </Link>

              <Link
                href="/manager?view=workday"
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5 ${
                  isWorkdayView
                    ? 'bg-indigo-700 text-white font-bold shadow-sm'
                    : 'text-indigo-200 hover:bg-[#1f1f6d] hover:text-white'
                }`}
              >
                <AppIcon name="clock" size={15} />
                <span>Día de Trabajo</span>
              </Link>
            </nav>
          </div>

          {/* User badge & Cerrar Sesión Administrativa */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
                  <AppIcon
                    name={adminUser.role === 'owner' ? 'owner' : 'manager'}
                    size={14}
                    className={
                      adminUser.role === 'owner' ? 'text-amber-400' : 'text-blue-300'
                    }
                  />
                  <span>{adminUser.name}</span>
                </div>
                <div className="text-[10px] text-indigo-300">
                  {adminUser.role === 'owner' ? 'Dueño con permisos' : 'Gerente'}
                </div>
              </div>

              <button
                onClick={logoutAdmin}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-900/60 hover:bg-rose-900/70 text-indigo-200 hover:text-white border border-indigo-700/50 transition flex items-center gap-1 active:scale-95"
                title="Cerrar Sesión Administrativa"
              >
                <AppIcon name="logout" size={13} />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={<header className="bg-[#14144f] h-16" />}>
      <NavbarContent />
    </Suspense>
  );
}
