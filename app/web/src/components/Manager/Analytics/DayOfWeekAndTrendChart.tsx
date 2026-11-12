'use client';

import React from 'react';
import { AppIcon } from '@/components/icons';
import type { DayOfWeekData, DailyTrendPoint } from '@/services/AnalyticsService';

interface Props {
  dayOfWeek: DayOfWeekData[];
  dailyTrend: DailyTrendPoint[];
  periodLabel: string;
}

export default function DayOfWeekAndTrendChart({ dayOfWeek, dailyTrend, periodLabel }: Props) {
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const maxDowRevenue = Math.max(1, ...dayOfWeek.map((d) => d.totalRevenue));
  const maxTrendRevenue = Math.max(1, ...dailyTrend.map((d) => d.revenue));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0 w-full">
      {/* 1. Ventas por Día de la Semana */}
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
              Comparativa de ingresos totales y promedio ponderado por ocurrencia
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
            El promedio considera el número de veces que se repitió cada día en el periodo seleccionado para evitar sesgos comparativos.
          </span>
        </div>
      </div>

      {/* 2. Tendencia Temporal Diaria */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 min-w-0 overflow-hidden">
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
              Fluctuación de ingresos netos a lo largo del periodo ({periodLabel})
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
              const heightPercent = maxTrendRevenue > 0 ? Math.max(3, (day.revenue / maxTrendRevenue) * 100) : 3;
              const [, mm, dd] = day.date.split('-');
              const dayNum = parseInt(dd, 10);

              // Smart stepping: if > 14 days, abbreviate and step labels to never blow out width
              const showLabel =
                dailyTrend.length <= 14
                  ? true
                  : dailyTrend.length <= 21
                    ? idx === 0 || idx === dailyTrend.length - 1 || idx % 2 === 0
                    : idx === 0 || idx === dailyTrend.length - 1 || dayNum % 5 === 0;

              return (
                <div
                  key={day.date}
                  className="flex-1 min-w-[6px] sm:min-w-0 flex flex-col items-center h-full justify-end group relative"
                >
                  {/* Tooltip flotante */}
                  <div className="absolute -top-14 opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 bg-slate-900 text-white text-[10px] rounded-lg py-1 px-2 whitespace-nowrap shadow-lg">
                    <div className="font-bold">{day.date}</div>
                    <div className="text-emerald-400">{formatMoney(day.revenue)}</div>
                    <div>
                      {day.salesCount} ticket(s) • {day.unitsSold} u.
                    </div>
                    {day.averageTicket !== null && (
                      <div className="text-slate-400 text-[9px]">
                        Ticket prom: {formatMoney(day.averageTicket)}
                      </div>
                    )}
                  </div>

                  {/* Barra */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-sm transition-all duration-300 ${day.revenue > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-100'
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

        <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1">
          <span>Consejo analítico: Correlacione días atípicos con promociones o eventos.</span>
          {dailyTrend.length > 16 && (
            <span className="text-[9px] text-slate-400">Eje X: día del mes</span>
          )}
        </div>
      </div>
    </div>
  );
}
