'use client';

import React, { useState } from 'react';
import WaiterPage from '@/app/waiter/page';
import CookPage from '@/app/cook/page';
import CashierPage from '@/app/cashier/page';
import ReceptionistPage from '@/app/receptionist/page';

import { AppIcon } from '@/components/icons';
import type { IconName } from '@/lib/icons/iconRegistry';

export type WorkdayTab = 'waiter' | 'kitchen' | 'cashier' | 'reception';

interface Props {
  initialTab?: WorkdayTab;
}

export default function WorkdayModule({ initialTab = 'waiter' }: Props) {
  const [activeTab, setActiveTab] = useState<WorkdayTab>(initialTab);

  const tabs: { id: WorkdayTab; label: string; icon: IconName; desc: string }[] = [
    { id: 'waiter', label: 'Mesero', icon: 'waiter', desc: 'Mesas, órdenes y comandas' },
    { id: 'kitchen', label: 'Cocina', icon: 'kitchen', desc: 'Órdenes en preparación' },
    { id: 'cashier', label: 'Cajero', icon: 'cashier', desc: 'Cuentas en formato ticket' },
    { id: 'reception', label: 'Recepción', icon: 'reception', desc: 'Reservaciones y asignación' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Navbar del Día de Trabajo */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">Módulo Operativo: Día de Trabajo</h2>
            <span className="text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Turno Activo
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Navegación directa entre estaciones operativas del restaurante
          </p>
        </div>

        {/* Tabs de navegación */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-[#14144f] text-white border-[#14144f] shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-white/10 text-white' : 'bg-white text-indigo-900 shadow-xs'}`}>
                  <AppIcon name={t.icon} size={22} />
                </div>
                <div className="min-w-0">
                  <div className={`font-bold text-xs sm:text-sm truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                    {t.label}
                  </div>
                  <div className={`text-[10px] truncate ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {t.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido de la sección seleccionada */}
      <div className="transition-all duration-200">
        {activeTab === 'waiter' && <WaiterPage />}
        {activeTab === 'kitchen' && <CookPage />}
        {activeTab === 'cashier' && <CashierPage />}
        {activeTab === 'reception' && <ReceptionistPage />}
      </div>
    </div>
  );
}
