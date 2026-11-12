'use client';

import React from 'react';
import { AppIcon, IconName } from '@/components/icons';

export type ManagerTab = "employees" | "sales" | "cash-cut" | "analytics" | "summary" | "inventory" | "recipes" | "invoicing" | "promotions";

export default function Sidebar({
  active,
  onSelect,
}: {
  active: ManagerTab;
  onSelect: (t: ManagerTab) => void;
}) {
  const Item = ({
    id,
    label,
    icon,
  }: {
    id: ManagerTab;
    label: string;
    icon: IconName;
  }) => {
    const isActive = active === id;
    return (
      <button
        onClick={() => onSelect(id)}
        className={`w-full rounded-2xl px-4 py-3 text-left text-xs font-bold transition-all duration-150 flex items-center gap-3 shrink-0 active:scale-[0.99] ${isActive
          ? "bg-indigo-600 text-white shadow-soft-sm shadow-indigo-600/20"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
          }`}
      >
        <AppIcon
          name={icon}
          size={17}
          className={isActive ? "text-white" : "text-slate-400"}
        />
        <span className="truncate">{label}</span>
      </button>
    );
  };

  return (
    <aside className="w-full md:w-[250px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200/90 p-4 sm:p-5 bg-slate-50/50">
      <div className="mb-3 px-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
        Gestión y Almacén
      </div>
      <nav className="flex md:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-2 md:pb-0">
        <Item id="sales" label="Ventas y Cuentas" icon="sales" />
        <Item id="cash-cut" label="Corte de caja" icon="cashier" />
        <Item id="analytics" label="Analíticas de Ventas" icon="kpis" />
        <Item id="promotions" label="Promociones y Cupones" icon="zap" />
        <Item id="invoicing" label="Facturación CFDI 4.0" icon="invoicing" />
        <Item id="recipes" label="Recetas del Menú" icon="recipes" />
        <Item id="inventory" label="Inventario / Stock" icon="inventory" />
        <Item id="summary" label="Resumen y KPIs" icon="kpis" />
        <Item id="employees" label="Empleados en Turno" icon="users" />
      </nav>
    </aside>
  );
}
