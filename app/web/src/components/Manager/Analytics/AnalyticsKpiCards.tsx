'use client';

import React from 'react';
import { AppIcon } from '@/components/icons';
import type { PeriodKpiData, KpiComparison } from '@/services/AnalyticsService';

interface Props {
  current: PeriodKpiData;
  previous: PeriodKpiData;
  comparison: KpiComparison;
  periodLabel: string;
}

export default function AnalyticsKpiCards({ current, previous, comparison, periodLabel }: Props) {
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('es-MX').format(val || 0);
  };

  const renderBadge = (change: number | null, prevAmount: number, label: string) => {
    if (!comparison.hasPreviousBase || change === null) {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full"
          title={`Sin base previa para calcular variación (Periodo previo: ${label} = ${label.includes('$') ? formatMoney(prevAmount) : prevAmount})`}
        >
          <AppIcon name="info" size={11} className="text-slate-400" />
          <span>Prev: {label.includes('$') ? formatMoney(prevAmount) : prevAmount}</span>
        </span>
      );
    }

    const isPositive = change > 0;
    const isZero = change === 0;

    if (isZero) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
          <span>0.0% vs ant.</span>
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isPositive
            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
            : 'text-rose-700 bg-rose-50 border border-rose-200'
        }`}
        title={`Periodo previo equivalente: ${label.includes('$') ? formatMoney(prevAmount) : prevAmount}`}
      >
        <span>{isPositive ? '↑' : '↓'}</span>
        <span>{Math.abs(change)}% vs ant.</span>
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Ventas Netas */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-indigo-300">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Ventas Netas Cobradas
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <AppIcon name="cash" size={16} />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900">
            {formatMoney(current.netSales)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <span>Bruto: {formatMoney(current.grossSales)}</span>
          {renderBadge(comparison.percentageChangeRevenue, previous.netSales, '$')}
        </div>
        {current.totalDiscounts > 0 && (
          <div className="mt-1 text-[10px] text-amber-700 font-medium">
            Descuentos aplicados: -{formatMoney(current.totalDiscounts)}
          </div>
        )}
      </div>

      {/* 2. Cantidad de Ventas (Tickets) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-indigo-300">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tickets Pagados
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
            <AppIcon name="receipt" size={16} />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900">
            {formatNumber(current.salesCount)}
          </span>
          <span className="text-xs text-slate-400 font-medium">ventas</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <span>
            {current.pendingSalesCount > 0
              ? `${current.pendingSalesCount} pendiente(s)`
              : 'Sin cuentas por cobrar'}
          </span>
          {renderBadge(comparison.percentageChangeOrders, previous.salesCount, 'tickets')}
        </div>
        {current.cancelledSalesCount > 0 && (
          <div className="mt-1 text-[10px] text-rose-600 font-medium">
            Canceladas: {current.cancelledSalesCount} ({formatMoney(current.cancelledSalesAmount)})
          </div>
        )}
      </div>

      {/* 3. Ticket Promedio */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-indigo-300">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Ticket Promedio
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
            <AppIcon name="card" size={16} />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900">
            {current.averageTicket !== null ? formatMoney(current.averageTicket) : 'N/D'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <span>Promedio por comanda</span>
          <span className="text-[10px] text-slate-400">
            {previous.averageTicket !== null
              ? `Prev: ${formatMoney(previous.averageTicket)}`
              : 'Prev: N/D'}
          </span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400">
          Fórmula: Ventas Netas ÷ Ventas Válidas
        </div>
      </div>

      {/* 4. Unidades Vendidas */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-indigo-300">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Platillos / Unidades
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <AppIcon name="utensils" size={16} />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900">
            {formatNumber(current.unitsSold)}
          </span>
          <span className="text-xs text-slate-400 font-medium">servidas</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <span>
            {current.salesCount > 0
              ? `${(current.unitsSold / current.salesCount).toFixed(1)} u/ticket`
              : '0 u/ticket'}
          </span>
          {renderBadge(comparison.percentageChangeUnits, previous.unitsSold, 'unidades')}
        </div>
        <div className="mt-1 text-[10px] text-slate-400">
          Platillos completados y pagados
        </div>
      </div>
    </div>
  );
}
