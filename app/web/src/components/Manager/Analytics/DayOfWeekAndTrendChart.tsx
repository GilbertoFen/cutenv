'use client';

import React, { useState } from 'react';
import { AppIcon } from '@/components/icons';
import type { DayOfWeekData, DailyTrendPoint } from '@/services/AnalyticsService';

interface Props {
  dayOfWeek: DayOfWeekData[];
  dailyTrend: DailyTrendPoint[];
  periodLabel: string;
}

export default function DayOfWeekAndTrendChart({ dayOfWeek, dailyTrend, periodLabel }: Props) {
  const [showTable, setShowTable] = useState(true);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatMoneyExact = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const maxDowRevenue = Math.max(1, ...dayOfWeek.map((d) => d.totalRevenue));
  const maxTrendRevenue = Math.max(1, ...dailyTrend.map((d) => d.netSales ?? d.revenue));

  // Totales acumulados para la fila de resumen del periodo
  const totals = dailyTrend.reduce(
    (acc, day) => {
      const net = day.netSales ?? day.revenue ?? 0;
      const tip = day.tips ?? 0;
      const cobrado = day.totalCollected ?? net + tip;
      const cost = day.cogs ?? day.expenses ?? 0;
      const profit = day.estimatedProfit ?? net - cost;

      return {
        netSales: acc.netSales + net,
        tips: acc.tips + tip,
        totalCollected: acc.totalCollected + cobrado,
        cogs: acc.cogs + cost,
        profit: acc.profit + profit,
        salesCount: acc.salesCount + day.salesCount,
        unitsSold: acc.unitsSold + day.unitsSold,
      };
    },
    {
      netSales: 0,
      tips: 0,
      totalCollected: 0,
      cogs: 0,
      profit: 0,
      salesCount: 0,
      unitsSold: 0,
    }
  );

  const overallMargin =
    totals.netSales > 0 ? Number(((totals.profit / totals.netSales) * 100).toFixed(1)) : null;

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* 1. SECCIÓN DE GRÁFICAS: DÍA DE LA SEMANA + EVOLUCIÓN TEMPORAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0 w-full">
        {/* 1.1 Ventas por Día de la Semana */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-purple-50 text-purple-700">
                  <AppIcon name="calendar" size={16} />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Desempeño por Día de la Semana
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Comparativa de ingresos netos y promedio ponderado por ocurrencia
              </p>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
              Lunes - Domingo
            </span>
          </div>

          <div className="space-y-3">
            {dayOfWeek.map((d) => {
              const percent = (d.totalRevenue / maxDowRevenue) * 100;
              return (
                <div key={d.dow} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 w-16">{d.dayName}</span>
                      <span className="text-[10px] text-slate-400">
                        ({d.occurrences} {d.occurrences === 1 ? 'día' : 'días'})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-slate-500 text-[11px]">
                        {d.salesCount} ticket(s)
                      </span>
                      <span className="font-bold text-slate-900 w-20">
                        {formatMoney(d.totalRevenue)}
                      </span>
                      <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">
                        Prom: {formatMoney(d.averageRevenue)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${Math.max(2, percent)}%` }}
                      className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-1.5">
            <AppIcon name="info" size={12} className="text-slate-400 shrink-0" />
            <span>
              El promedio considera el número de veces que se repitió cada día en el periodo para evitar sesgos.
            </span>
          </div>
        </div>

        {/* 1.2 Tendencia Temporal Diaria */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 min-w-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
                    <AppIcon name="kpis" size={16} />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Evolución Diaria de Ventas
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Fluctuación de ventas netas, costos y ganancias ({periodLabel})
                </p>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                {dailyTrend.length} día(s)
              </span>
            </div>

            {/* Visualizador de barras cronológicas adaptativo */}
            <div className="pt-2 w-full min-w-0 overflow-x-auto">
              <div className="h-44 flex items-end gap-0.5 sm:gap-1 border-b border-slate-200 pb-1 min-w-[280px]">
                {dailyTrend.map((day, idx) => {
                  const net = day.netSales ?? day.revenue ?? 0;
                  const heightPercent = maxTrendRevenue > 0 ? Math.max(3, (net / maxTrendRevenue) * 100) : 3;
                  const [, mm, dd] = day.date.split('-');
                  const dayNum = parseInt(dd, 10);

                  const showLabel =
                    dailyTrend.length <= 14
                      ? true
                      : dailyTrend.length <= 21
                        ? idx === 0 || idx === dailyTrend.length - 1 || idx % 2 === 0
                        : idx === 0 || idx === dailyTrend.length - 1 || dayNum % 5 === 0;

                  const tips = day.tips || 0;
                  const totalCobrado = day.totalCollected ?? net + tips;
                  const cogs = day.cogs ?? day.expenses ?? 0;
                  const profit = day.estimatedProfit ?? net - cogs;

                  return (
                    <div
                      key={day.date}
                      className="flex-1 min-w-[6px] sm:min-w-0 flex flex-col items-center h-full justify-end group relative"
                    >
                      {/* Tooltip flotante enriquecido con desglose financiero */}
                      <div className="absolute -top-28 opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 bg-slate-900 text-white text-[10px] rounded-xl py-2 px-3 whitespace-nowrap shadow-2xl border border-slate-700 min-w-[170px]">
                        <div className="font-bold border-b border-slate-700 pb-1 text-slate-200">{day.date}</div>
                        <div className="text-emerald-400 mt-1 font-semibold">
                          Venta Neta: {formatMoney(net)}
                        </div>
                        {tips > 0 && (
                          <div className="text-amber-300">
                            Propinas: +{formatMoney(tips)}
                          </div>
                        )}
                        <div className="text-slate-300 text-[9px]">
                          Cobrado: {formatMoney(totalCobrado)}
                        </div>
                        {cogs > 0 && (
                          <div className="text-orange-300">
                            Costo Insumos: -{formatMoney(cogs)}
                          </div>
                        )}
                        <div className="text-teal-300 font-bold mt-0.5 pt-0.5 border-t border-slate-700">
                          Ganancia: {formatMoney(profit)}
                          {day.profitMarginPercentage !== null && day.profitMarginPercentage !== undefined && (
                            <span className="text-slate-300 font-normal"> ({day.profitMarginPercentage}%)</span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[9px] mt-0.5">
                          {day.salesCount} ticket(s) • {day.unitsSold} u.
                        </div>
                      </div>

                      {/* Barra */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          net > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-100'
                        }`}
                      />

                      {/* Label eje X */}
                      {showLabel ? (
                        <span className="text-[9px] text-slate-400 mt-1 truncate block text-center leading-none">
                          {dailyTrend.length > 16 ? `${dayNum}` : `${dd}/${mm}`}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-200 mt-1 select-none leading-none">
                          ·
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1">
            <span>Pase el cursor sobre cualquier barra para ver el desglose completo del día.</span>
            {dailyTrend.length > 16 && (
              <span className="text-[9px] text-slate-400">Eje X: día del mes</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. TABLA DETALLADA: DESGLOSE FINANCIERO POR DÍA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-indigo-50 text-indigo-700">
                <AppIcon name="receipt" size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Desglose Financiero Diario Detallado
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Supervisión de venta neta, propinas, total cobrado, costo de ventas y ganancia calculada para cada día del periodo ({periodLabel})
            </p>
          </div>
          <button
            onClick={() => setShowTable(!showTable)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span>{showTable ? 'Ocultar tabla' : 'Mostrar tabla'}</span>
          </button>
        </div>

        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                  <th className="py-2.5 px-4">Fecha</th>
                  <th className="py-2.5 px-3 text-right">Venta Neta</th>
                  <th className="py-2.5 px-3 text-right">Propinas</th>
                  <th className="py-2.5 px-3 text-right">Total Cobrado</th>
                  <th className="py-2.5 px-3 text-right">Costo Ventas</th>
                  <th className="py-2.5 px-3 text-right">Ganancia Calc.</th>
                  <th className="py-2.5 px-3 text-center">Margen</th>
                  <th className="py-2.5 px-3 text-center">Tickets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyTrend.map((day) => {
                  const net = day.netSales ?? day.revenue ?? 0;
                  const tips = day.tips || 0;
                  const totalCobrado = day.totalCollected ?? net + tips;
                  const cogs = day.cogs ?? day.expenses ?? 0;
                  const profit = day.estimatedProfit ?? net - cogs;
                  const margin = day.profitMarginPercentage;
                  const hasSales = day.salesCount > 0;

                  return (
                    <tr
                      key={day.date}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !hasSales ? 'text-slate-400 bg-slate-50/20' : 'text-slate-800'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-medium whitespace-nowrap">
                        <span className={hasSales ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                          {day.date}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatMoneyExact(net)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-700 whitespace-nowrap">
                        {tips > 0 ? `+${formatMoneyExact(tips)}` : '$0.00'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 whitespace-nowrap">
                        {formatMoneyExact(totalCobrado)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-orange-700 whitespace-nowrap">
                        {cogs > 0 ? formatMoneyExact(cogs) : '$0.00'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                        <span className={profit > 0 ? 'text-emerald-700' : profit < 0 ? 'text-rose-600' : 'text-slate-400'}>
                          {formatMoneyExact(profit)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {margin !== null && margin !== undefined ? (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            margin > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {margin}%
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap text-slate-600">
                        {day.salesCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* FILA DE TOTALES DEL PERIODO */}
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100/80 font-black text-slate-900">
                  <td className="py-3 px-4">
                    TOTAL PERIODO ({dailyTrend.length} días)
                  </td>
                  <td className="py-3 px-3 text-right text-indigo-900 whitespace-nowrap">
                    {formatMoneyExact(totals.netSales)}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-800 whitespace-nowrap">
                    +{formatMoneyExact(totals.tips)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900 whitespace-nowrap">
                    {formatMoneyExact(totals.totalCollected)}
                  </td>
                  <td className="py-3 px-3 text-right text-orange-900 whitespace-nowrap">
                    {formatMoneyExact(totals.cogs)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-800 whitespace-nowrap">
                    {formatMoneyExact(totals.profit)}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {overallMargin !== null ? (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900">
                        {overallMargin}%
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {totals.salesCount}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
