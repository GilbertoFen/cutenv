'use client';

import React, { useState } from 'react';
import { AppIcon } from '@/components/icons';
import type { HourlySlot } from '@/services/AnalyticsService';

interface Props {
  data: HourlySlot[];
  peaks: {
    revenue: { hour: number; label: string; revenue: number };
    tickets: { hour: number; label: string; salesCount: number };
    units: { hour: number; label: string; unitsSold: number };
  };
  daysCount: number;
}

export default function HourlySalesChart({ data, peaks, daysCount }: Props) {
  const [metric, setMetric] = useState<'revenue' | 'tickets' | 'units'>('revenue');

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const currentPeak =
    metric === 'revenue'
      ? { label: peaks.revenue.label, val: formatMoney(peaks.revenue.revenue), metricName: 'ingresos' }
      : metric === 'tickets'
      ? { label: peaks.tickets.label, val: `${peaks.tickets.salesCount} tickets`, metricName: 'tickets' }
      : { label: peaks.units.label, val: `${peaks.units.unitsSold} unidades`, metricName: 'unidades' };

  // Obtener valor máximo para normalizar altura de barras
  const maxVal = Math.max(
    1,
    ...data.map((d) => (metric === 'revenue' ? d.revenue : metric === 'tickets' ? d.salesCount : d.unitsSold))
  );

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
      {/* Encabezado y Selector de Métrica */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-indigo-50 text-indigo-700">
              <AppIcon name="clock" size={16} />
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Picos de Demanda por Hora (00:00 - 23:00)
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Distribución horaria en horario local del restaurante (UTC-6)
            {daysCount > 1 && ` • Promedio diario sobre ${daysCount} días analizados`}
          </p>
        </div>

        {/* Pestañas de Métrica */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setMetric('revenue')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              metric === 'revenue'
                ? 'bg-white text-indigo-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ingresos ($)
          </button>
          <button
            onClick={() => setMetric('tickets')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              metric === 'tickets'
                ? 'bg-white text-indigo-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tickets
          </button>
          <button
            onClick={() => setMetric('units')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              metric === 'units'
                ? 'bg-white text-indigo-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unidades
          </button>
        </div>
      </div>

      {/* Banner de Hora Pico */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-900">
        <AppIcon name="zap" size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Hora pico de {currentPeak.metricName}: </span>
          <span className="font-extrabold text-amber-950 underline decoration-amber-400">
            {currentPeak.label}
          </span>{' '}
          con <strong>{currentPeak.val}</strong> acumulados en el periodo.{' '}
          <span className="text-[11px] text-amber-800/90 italic block sm:inline mt-0.5 sm:mt-0">
            *Nota: Un mayor volumen de ventas no representa automáticamente el horario de mayor margen
            de ganancia.
          </span>
        </div>
      </div>

      {/* Visualizador de Barras Horarias */}
      <div className="pt-4">
        <div className="h-44 flex items-end gap-1 sm:gap-1.5 border-b border-slate-200 pb-1">
          {data.map((slot) => {
            const rawVal =
              metric === 'revenue'
                ? slot.revenue
                : metric === 'tickets'
                ? slot.salesCount
                : slot.unitsSold;

            const heightPercent = maxVal > 0 ? Math.max(3, (rawVal / maxVal) * 100) : 3;
            const isPeak =
              (metric === 'revenue' && slot.hour === peaks.revenue.hour && peaks.revenue.revenue > 0) ||
              (metric === 'tickets' && slot.hour === peaks.tickets.hour && peaks.tickets.salesCount > 0) ||
              (metric === 'units' && slot.hour === peaks.units.hour && peaks.units.unitsSold > 0);

            return (
              <div
                key={slot.hour}
                className="flex-1 flex flex-col items-center h-full justify-end group relative"
              >
                {/* Tooltip flotante al pasar el mouse */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 bg-slate-900 text-white text-[10px] rounded-lg py-1 px-2 whitespace-nowrap shadow-lg">
                  <div className="font-bold">{slot.label} hrs</div>
                  <div>
                    {metric === 'revenue'
                      ? formatMoney(slot.revenue)
                      : metric === 'tickets'
                      ? `${slot.salesCount} tickets`
                      : `${slot.unitsSold} unidades`}
                  </div>
                  {daysCount > 1 && (
                    <div className="text-slate-400 text-[9px]">
                      Promedio: {formatMoney(slot.averageRevenuePerHour)}/día
                    </div>
                  )}
                </div>

                {/* Barra */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-md transition-all duration-300 ${
                    isPeak
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-xs'
                      : rawVal > 0
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Eje X de Horas */}
        <div className="flex justify-between text-[10px] text-slate-400 font-semibold pt-1.5 px-0.5">
          <span>00:00</span>
          <span className="hidden sm:inline">04:00</span>
          <span>08:00</span>
          <span className="hidden sm:inline">12:00</span>
          <span>16:00</span>
          <span className="hidden sm:inline">20:00</span>
          <span>23:00</span>
        </div>
      </div>
    </div>
  );
}
