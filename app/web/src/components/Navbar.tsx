'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import ManagerUnlockModal from '@/components/Manager/ManagerUnlockModal';
import { AppIcon } from '@/components/icons';

export default function Navbar() {
  const pathname = usePathname();
  const {
    adminUser,
    workerUser,
    logoutAdmin,
    logoutWorker,
    isManagerUnlocked,
    loading,
  } = useAuth();
  const [showManagerModal, setShowManagerModal] = useState(false);

  // Determinar si la ruta actual pertenece al flujo operativo del trabajador
  const isWorkerRoute = Boolean(
    pathname &&
      (pathname.startsWith('/worker') ||
        pathname.startsWith('/waiter') ||
        pathname.startsWith('/cook') ||
        pathname.startsWith('/cashier') ||
        pathname.startsWith('/receptionist'))
  );

  // 1. FLUJO DE TRABAJADOR OPERATIVO
  if (isWorkerRoute) {
    // Si está en la pantalla de login o aún no hay sesión activa de trabajador, no mostrar el navbar
    if (loading || !workerUser || pathname === '/worker/login') {
      return null;
    }

    return (
      <header className="bg-[#0f1035] text-white shadow-md sticky top-0 z-40 border-b border-indigo-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Marca de la Estación de Trabajo */}
            <div className="flex items-center gap-3">
              <Link
                href="/worker"
                className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-2"
                title="Ir a Estación de Trabajo"
              >
                <span className="bg-emerald-600 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-black shadow-sm">
                  POS
                </span>
                <span className="hidden sm:inline">Restaurante</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Tablet
                </span>
              </Link>

              {/* Botón obligatorio para regresar a la pantalla principal del trabajador */}
              <Link
                href="/worker"
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all shadow-sm ${
                  pathname === '/worker'
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : 'bg-emerald-700/80 hover:bg-emerald-600 text-white active:scale-95'
                }`}
                title="Volver a la pantalla principal de los 4 accesos operativos"
              >
                <AppIcon name="arrow-left" size={14} />
                <span>Volver al inicio de trabajador</span>
              </Link>
            </div>

            {/* Módulos Operativos Exclusivos del Trabajador */}
            <nav className="hidden lg:flex items-center gap-1 overflow-x-auto">
              <Link
                href="/waiter"
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                  pathname.startsWith('/waiter')
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-200 hover:bg-[#1a1b4b] hover:text-white'
                }`}
              >
                <AppIcon name="waiter" size={15} />
                <span>Mesero</span>
              </Link>
              <Link
                href="/cook"
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                  pathname.startsWith('/cook')
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-200 hover:bg-[#1a1b4b] hover:text-white'
                }`}
              >
                <AppIcon name="cooking" size={15} />
                <span>Cocina</span>
              </Link>
              <Link
                href="/cashier"
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                  pathname.startsWith('/cashier')
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-200 hover:bg-[#1a1b4b] hover:text-white'
                }`}
              >
                <AppIcon name="cashier" size={15} />
                <span>Cajero</span>
              </Link>
              <Link
                href="/receptionist"
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                  pathname.startsWith('/receptionist')
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-200 hover:bg-[#1a1b4b] hover:text-white'
                }`}
              >
                <AppIcon name="orders" size={15} />
                <span>Recepción</span>
              </Link>
            </nav>

            {/* Identidad del trabajador y Cerrar Turno */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{workerUser.name}</span>
                </div>
                <div className="text-[10px] text-emerald-300 font-medium">
                  Trabajador Operativo
                </div>
              </div>

              <button
                onClick={logoutWorker}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-950/50 hover:bg-rose-700 text-rose-200 hover:text-white border border-rose-800/50 transition flex items-center gap-1.5 active:scale-95"
                title="Cerrar turno e invalidar la sesión del trabajador"
              >
                <AppIcon name="logout" size={14} />
                <span>Cerrar Turno</span>
              </button>
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

  const handleManagerClick = (e: React.MouseEvent) => {
    if (!isManagerUnlocked && adminUser?.role !== 'manager') {
      e.preventDefault();
      setShowManagerModal(true);
    }
  };

  return (
    <header className="bg-[#14144f] text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="font-extrabold text-xl tracking-tight text-white flex items-center gap-2"
            >
              <span className="bg-indigo-600 px-2.5 py-1 rounded-lg text-sm font-black shadow-sm">
                POS
              </span>
              <span className="hidden sm:inline">Restaurante</span>
            </Link>

            {/* Navegación Administrativa */}
            <nav className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4 overflow-x-auto">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                  pathname === '/'
                    ? 'bg-indigo-700 text-white font-bold'
                    : 'text-indigo-200 hover:bg-[#1f1f6d] hover:text-white'
                }`}
              >
                Principal
              </Link>

              <Link
                href="/manager"
                onClick={handleManagerClick}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1 ${
                  pathname.startsWith('/manager')
                    ? 'bg-indigo-700 text-white font-bold'
                    : 'text-indigo-200 hover:bg-[#1f1f6d] hover:text-white'
                }`}
              >
                <span>Monitoreo y Operativa</span>
                {!isManagerUnlocked && adminUser?.role !== 'manager' && (
                  <AppIcon
                    name="lock"
                    size={12}
                    className="text-amber-300 ml-0.5"
                    ariaLabel="Requiere desbloqueo"
                  />
                )}
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
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-900/60 hover:bg-rose-900/70 text-indigo-200 hover:text-white border border-indigo-700/50 transition flex items-center gap-1"
                title="Cerrar Sesión Administrativa"
              >
                <AppIcon name="logout" size={13} />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ManagerUnlockModal
        isOpen={showManagerModal}
        onClose={() => setShowManagerModal(false)}
        onSuccess={() => {
          setShowManagerModal(false);
          window.location.href = '/manager';
        }}
      />
    </header>
  );
}
