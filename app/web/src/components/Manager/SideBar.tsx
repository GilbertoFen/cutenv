'use client';

import React from 'react';
import { AppIcon, IconName } from '@/components/icons';

export type ManagerTab = "employees" | "sales" | "analytics" | "summary" | "inventory" | "recipes" | "invoicing" | "promotions";

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
        className={`w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition flex items-center gap-2.5 ${
          isActive
            ? "bg-[#14144f] text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <AppIcon
          name={icon}
          size={16}
          className={isActive ? "text-indigo-300" : "text-slate-500"}
        />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <aside className="w-full md:w-[230px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200 p-4 bg-slate-50/50">
      <div className="mb-3 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Módulos Gerenciales
      </div>
      <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
        <Item id="sales" label="Ventas y Cuentas" icon="sales" />
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
