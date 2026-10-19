'use client';

import React from 'react';
import { AppIcon } from '@/components/icons';
import type { OperationalDistributionItem } from '@/services/AnalyticsService';

interface Props {
  byOrderType: OperationalDistributionItem[];
  byPaymentMethod: OperationalDistributionItem[];
  totalRevenue: number;
  totalTickets: number;
}

export default function OperationalDistributionsPanel({
  byOrderType,
  byPaymentMethod,
  totalRevenue,
  totalTickets,
}: Props) {
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const getOrderTypeLabel = (type?: string) => {
    switch (type) {
      case 'local':
        return { label: 'Comer en Restaurante (Local)', icon: 'utensils' as const };
      case 'para llevar':
        return { label: 'Para Llevar (Takeout)', icon: 'products' as const };
      case 'domicilio':
        return { label: 'A Domicilio (Delivery)', icon: 'home' as const };
      case 'evento':
        return { label: 'Eventos / Banquete', icon: 'owner' as const };
      default:
        return { label: type || 'Otro', icon: 'receipt' as const };
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'efectivo':
        return { label: 'Efectivo en Caja', icon: 'cash' as const };
      case 'tarjeta':
        return { label: 'Tarjeta Bancaria (TPV)', icon: 'card' as const };
      case 'transferencia':
        return { label: 'Transferencia Electrónica', icon: 'transfer' as const };
      default:
        return { label: method || 'Otro', icon: 'card' as const };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Por Tipo de Pedido */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-blue-50 text-blue-700">
                <AppIcon name="utensils" size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Ventas por Tipo de Pedido
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Distribución de comensales en salón vs servicios para llevar o domicilio
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
            {totalTickets} tickets
          </span>
        </div>

        <div className="space-y-3">
          {byOrderType.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No hay pedidos en el periodo.
            </div>
          ) : (
            byOrderType.map((o) => {
              const info = getOrderTypeLabel(o.type);
              return (
                <div key={o.type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <AppIcon name={info.icon} size={14} className="text-slate-400" />
                      <span className="font-bold text-slate-800">{info.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-[11px]">{o.ticketsCount} tickets</span>
                      <span className="font-bold text-slate-900 w-24 text-right">
                        {formatMoney(o.revenue)}
                      </span>
                      <span className="text-xs font-black text-indigo-700 w-12 text-right">
                        {o.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${Math.max(2, o.percentage)}%` }}
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Por Método de Pago */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
                <AppIcon name="card" size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Cobros por Método de Pago
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Importes efectivamente liquidados en caja según medio de recepción
            </p>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            {formatMoney(totalRevenue)}
          </span>
        </div>

        <div className="space-y-3">
          {byPaymentMethod.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No hay cobros en el periodo.
            </div>
          ) : (
            byPaymentMethod.map((p) => {
              const info = getPaymentMethodLabel(p.method);
              return (
                <div key={p.method} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <AppIcon name={info.icon} size={14} className="text-slate-400" />
                      <span className="font-bold text-slate-800">{info.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-[11px]">{p.ticketsCount} tickets</span>
                      <span className="font-bold text-slate-900 w-24 text-right">
                        {formatMoney(p.revenue)}
                      </span>
                      <span className="text-xs font-black text-emerald-700 w-12 text-right">
                        {p.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${Math.max(2, p.percentage)}%` }}
                      className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
