'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ManagerUnlockModal from '@/components/Manager/ManagerUnlockModal';
import WorkdayModule from '@/components/Workday/WorkdayModule';
import { AppIcon } from '@/components/icons';
import LoginPage from './login/page';

export default function DashboardPage() {
  const router = useRouter();
  const { adminUser, workerUser, loading, isManagerUnlocked } = useAuth();
  const [activeSection, setActiveSection] = useState<'overview' | 'workday'>('overview');
  const [showManagerModal, setShowManagerModal] = useState(false);

  useEffect(() => {
    // Si la sesión activa corresponde únicamente a un trabajador operativo, dirigir a su estación
    if (!loading && workerUser && !adminUser) {
      router.replace('/worker');
    }
  }, [workerUser, adminUser, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Comprobando sesión del restaurante…
        </div>
      </div>
    );
  }

  // Regla 1: La ruta / debe mostrar el login cuando no exista una sesión administrativa válida
  if (!adminUser) {
    if (workerUser) {
      return null; // Redirigiendo a /worker vía useEffect
    }
    return <LoginPage />;
  }

  const handleOpenManagerSection = () => {
    if (isManagerUnlocked || adminUser.role === 'manager' || adminUser.role === 'owner') {
      router.push('/manager');
    } else {
      setShowManagerModal(true);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Saludo y datos del usuario */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-soft-xs border border-slate-200/90 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                adminUser.role === 'owner'
                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
              }`}
            >
              <AppIcon
                name={adminUser.role === 'owner' ? 'owner' : 'manager'}
                size={14}
                className={adminUser.role === 'owner' ? 'text-purple-700' : 'text-indigo-700'}
              />
              <span>{adminUser.role === 'owner' ? 'Dueño / Administrador' : 'Gerente'}</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">• Sesión Activa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Hola, {adminUser.name}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Seleccione una de las dos secciones principales para comenzar la gestión de hoy
          </p>
        </div>

        {/* Selector de vista rápida */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/90 shadow-soft-xs">
          <button
            onClick={() => setActiveSection('overview')}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-black transition ${
              activeSection === 'overview'
                ? 'bg-slate-900 text-white shadow-soft-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Vista Principal
          </button>
          <button
            onClick={() => setActiveSection('workday')}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-black transition ${
              activeSection === 'workday'
                ? 'bg-indigo-600 text-white shadow-soft-xs shadow-indigo-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Día de Trabajo
          </button>
        </div>
      </div>

      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Tarjetas de las 2 Secciones Principales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SECCIÓN 1: Monitoreo y Operativa */}
            <div className="bg-white rounded-3xl shadow-soft-xs border border-slate-200/90 p-6 sm:p-7 flex flex-col justify-between hover:shadow-soft-md transition-all border-l-4 border-l-purple-600">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black shadow-soft-xs border border-purple-100">
                    <AppIcon name="kpis" size={24} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                    Módulo Estratégico
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  1. Monitoreo y Operativa
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5">
                  Supervisión gerencial estratégica, control de inventario, recetas y auditoría de cuentas
                </p>

                <div className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  <div className="flex items-start gap-2.5">
                    <AppIcon name="check" size={15} className="text-purple-600 mt-0.5 shrink-0" />
                    <span><strong>Métricas y KPIs:</strong> Analíticas de ventas reales, ticket promedio y balances.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <AppIcon name="check" size={15} className="text-purple-600 mt-0.5 shrink-0" />
                    <span><strong>Control de Inventario:</strong> Existencias actuales, ajustes manuales y reporte oficial.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <AppIcon name="check" size={15} className="text-purple-600 mt-0.5 shrink-0" />
                    <span><strong>Recetas y Menú:</strong> Gestionar, añadir, modificar o eliminar platillos a la venta.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <AppIcon name="check" size={15} className="text-purple-600 mt-0.5 shrink-0" />
                    <span><strong>Auditoría de Cuentas:</strong> Cuentas activas, pagadas y cancelaciones auditadas.</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                  <AppIcon name={isManagerUnlocked ? 'unlock' : 'lock'} size={13} />
                  <span>Estado: {isManagerUnlocked || adminUser.role === 'owner' ? 'Autorizado' : 'Requiere Clave'}</span>
                </span>
                <button
                  onClick={handleOpenManagerSection}
                  className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs sm:text-sm transition shadow-soft-xs flex items-center gap-2 active:scale-95"
                >
                  <span>Entrar a Monitoreo</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 2: Día de Trabajo */}
            <div className="bg-white rounded-3xl shadow-soft-xs border border-slate-200/90 p-6 sm:p-7 flex flex-col justify-between hover:shadow-soft-md transition-all border-l-4 border-l-indigo-600">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black shadow-soft-xs border border-indigo-100">
                    <AppIcon name="clock" size={24} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                    Punto de Venta
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  2. Día de Trabajo y Estaciones
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5">
                  Estación operativa central con acceso directo a todos los módulos de servicio en sala y cocina
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-soft-xs">
                    <div className="font-black text-slate-800 flex items-center gap-1.5 mb-1">
                      <AppIcon name="waiter" size={16} className="text-indigo-600" />
                      <span>Mesero</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Mesas, comensales y entrega de platillos.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-soft-xs">
                    <div className="font-black text-slate-800 flex items-center gap-1.5 mb-1">
                      <AppIcon name="cooking" size={16} className="text-amber-600" />
                      <span>Cocina</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Órdenes en preparación y pase de platillos.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-soft-xs">
                    <div className="font-black text-slate-800 flex items-center gap-1.5 mb-1">
                      <AppIcon name="cashier" size={16} className="text-emerald-600" />
                      <span>Cajero</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tickets, cobros y promociones.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-soft-xs">
                    <div className="font-black text-slate-800 flex items-center gap-1.5 mb-1">
                      <AppIcon name="orders" size={16} className="text-purple-600" />
                      <span>Recepción</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Reservaciones y asignación de mesas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">4 estaciones táctiles</span>
                <button
                  onClick={() => setActiveSection('workday')}
                  className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm transition shadow-soft-xs flex items-center gap-2 active:scale-95"
                >
                  <span>Abrir Día de Trabajo</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista de Día de Trabajo integrada */}
      {activeSection === 'workday' && (
        <WorkdayModule initialTab="waiter" />
      )}

      {/* Modal para validar credenciales de gerente antes de entrar a Monitoreo y Operativa */}
      <ManagerUnlockModal
        isOpen={showManagerModal}
        onClose={() => setShowManagerModal(false)}
        onSuccess={() => {
          setShowManagerModal(false);
          router.push('/manager');
        }}
      />
    </div>
  );
}
