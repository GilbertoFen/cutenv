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

  const netSales = current.netSales || 0;
  const tips = current.totalTips || 0;
  const totalCollected = current.totalCollected ?? Number((netSales + tips).toFixed(2));
  const cogs = current.cogs ?? current.expenses ?? 0;
  const estimatedProfit = current.estimatedProfit ?? Number((netSales - cogs).toFixed(2));
  const marginPercentage =
    current.profitMarginPercentage !== undefined && current.profitMarginPercentage !== null
      ? current.profitMarginPercentage
      : netSales > 0
        ? Number(((estimatedProfit / netSales) * 100).toFixed(1))
        : null;

  return (
    <div className="space-y-4">
      {/* 1. DESGLOSE FINANCIERO PRINCIPAL (5 PILARES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Pilar 1: Venta Neta */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-indigo-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Venta Neta
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                <AppIcon name="cash" size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {formatMoney(netSales)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Sin propinas</span>
              {renderBadge(comparison.percentageChangeRevenue, previous.netSales, '$')}
            </div>
            {current.totalDiscounts > 0 && (
              <div className="text-[10px] text-indigo-600 font-medium">
                Descuentos: -{formatMoney(current.totalDiscounts)}
              </div>
            )}
          </div>
        </div>

        {/* Pilar 2: Propinas */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-amber-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Propinas
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <AppIcon name="receipt" size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-900">
                {formatMoney(tips)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-amber-800">
            <span>Importe adicional</span>
            <div className="text-[10px] text-slate-400 mt-0.5">
              No cuenta como venta ni ganancia
            </div>
          </div>
        </div>

        {/* Pilar 3: Total Cobrado */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-teal-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Cobrado
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                <AppIcon name="card" size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {formatMoney(totalCollected)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="font-semibold text-teal-700">Venta neta + Propinas</span>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Flujo total ingresado en caja
            </div>
          </div>
        </div>

        {/* Pilar 4: Costo de Ventas (Gastos Insumos) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-orange-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
                Costo de Ventas
              </span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-700">
                <AppIcon name="inventory" size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {formatMoney(cogs)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Gastos calculados de venta</span>
            <div className="text-[10px] text-orange-700 font-medium mt-0.5">
              Insumos de recetas vendidas
            </div>
          </div>
        </div>

        {/* Pilar 5: Ganancia Calculada */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm relative overflow-hidden transition-all hover:border-emerald-400 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Ganancia Calculada
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <AppIcon name="kpis" size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-black ${estimatedProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatMoney(estimatedProfit)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Margen estimado:</span>
              <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                marginPercentage !== null && marginPercentage > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {marginPercentage !== null ? `${marginPercentage}%` : 'N/D'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Venta Neta − Costo Insumos
            </div>
          </div>
        </div>
      </div>

      {/* 2. MÉTRICAS OPERATIVAS SECUNDARIAS (TICKETS, TICKET PROMEDIO, PLATILLOS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Tickets Pagados */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-slate-300">
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
                : 'Sin cuentas pendientes'}
            </span>
            {renderBadge(comparison.percentageChangeOrders, previous.salesCount, 'tickets')}
          </div>
          {current.cancelledSalesCount > 0 && (
            <div className="mt-1 text-[10px] text-rose-600 font-medium">
              Canceladas: {current.cancelledSalesCount} ({formatMoney(current.cancelledSalesAmount)})
            </div>
          )}
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-slate-300">
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
            Fórmula: Venta Neta ÷ Ventas Válidas
          </div>
        </div>

        {/* Unidades / Platillos Vendidos */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Platillos Servidos
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
              <AppIcon name="utensils" size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {formatNumber(current.unitsSold)}
            </span>
            <span className="text-xs text-slate-400 font-medium">unidades</span>
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
            Órdenes completadas y pagadas
          </div>
        </div>
      </div>
    </div>
  );
}
