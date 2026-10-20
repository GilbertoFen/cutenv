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
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                adminUser.role === 'owner'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
              }`}
            >
              <AppIcon
                name={adminUser.role === 'owner' ? 'owner' : 'manager'}
                size={13}
                className={adminUser.role === 'owner' ? 'text-purple-700' : 'text-indigo-700'}
              />
              <span>{adminUser.role === 'owner' ? 'Dueño / Administrador' : 'Gerente'}</span>
            </span>
            <span className="text-xs text-slate-400">Sesión iniciada</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Hola, {adminUser.name}
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Seleccione una de las dos secciones principales para comenzar la gestión de hoy.
          </p>
        </div>

        {/* Selector de vista rápida */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSection('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSection === 'overview'
                ? 'bg-[#14144f] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Vista Principal
          </button>
          <button
            onClick={() => setActiveSection('workday')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSection === 'workday'
                ? 'bg-[#14144f] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg transition-all border-l-4 border-l-purple-600">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black">
                    <AppIcon name="kpis" size={24} />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-slate-900">1. Monitoreo y Operativa</h2>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Supervisión gerencial estratégica, control de inventario, recetas y auditoría de cuentas.
                </p>

                <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-start gap-2">
                    <AppIcon name="check" size={14} className="text-purple-600 mt-0.5 shrink-0" />
                    <span><strong>Métricas y KPIs:</strong> Analíticas de ventas reales, ticket promedio y balances.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AppIcon name="check" size={14} className="text-purple-600 mt-0.5 shrink-0" />
                    <span><strong>Control de Inventario:</strong> Existencias actuales, ajustes manuales y reporte oficial.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AppIcon name="check" size={14} className="text-purple-600 mt-0.5 shrink-0" />
                    <span><strong>Recetas y Menú:</strong> Gestionar, añadir, modificar o eliminar platillos a la venta.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AppIcon name="check" size={14} className="text-purple-600 mt-0.5 shrink-0" />
                    <span><strong>Auditoría de Cuentas:</strong> Cuentas activas, pagadas y cancelaciones auditadas.</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <AppIcon name={isManagerUnlocked ? 'unlock' : 'lock'} size={13} />
                  <span>Estado: {isManagerUnlocked || adminUser.role === 'owner' ? 'Autorizado' : 'Requiere Clave'}</span>
                </span>
                <button
                  onClick={handleOpenManagerSection}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5"
                >
                  <span>Entrar a Monitoreo y Operativa</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 2: Día de Trabajo */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg transition-all border-l-4 border-l-indigo-600">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                    <AppIcon name="clock" size={24} />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-slate-900">2. Día de Trabajo y Estaciones</h2>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Estación operativa central con acceso directo a todos los módulos de servicio en sala y cocina.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                      <AppIcon name="waiter" size={16} className="text-indigo-600" />
                      <span>Mesero</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Mesas, comensales y entrega de platillos.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                      <AppIcon name="cooking" size={16} className="text-amber-600" />
                      <span>Cocina</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Órdenes en preparación y pase de platillos listos.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                      <AppIcon name="cashier" size={16} className="text-emerald-600" />
                      <span>Cajero</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tickets, cobros y promociones.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                      <AppIcon name="orders" size={16} className="text-blue-600" />
                      <span>Recepción</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Reservaciones y asignación de mesas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">4 estaciones disponibles</span>
                <button
                  onClick={() => setActiveSection('workday')}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5"
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
