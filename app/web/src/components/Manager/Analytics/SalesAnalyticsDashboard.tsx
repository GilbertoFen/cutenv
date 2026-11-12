'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AppIcon } from '@/components/icons';
import {
  getAnalyticsDashboard,
  type AnalyticsDashboardResponse,
  type AnalyticsQueryParams,
} from '@/services/AnalyticsService';
import AnalyticsKpiCards from './AnalyticsKpiCards';
import HourlySalesChart from './HourlySalesChart';
import DayOfWeekAndTrendChart from './DayOfWeekAndTrendChart';
import TopProductsRanking from './TopProductsRanking';
import PromotionsAnalyticsPanel from './PromotionsAnalyticsPanel';
import InventoryConsumptionPanel from './InventoryConsumptionPanel';
import OperationalDistributionsPanel from './OperationalDistributionsPanel';

export default function SalesAnalyticsDashboard() {
  const [period, setPeriod] = useState<AnalyticsQueryParams['period']>('last_7_days');
  const [sortBy, setSortBy] = useState<'units' | 'revenue'>('units');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsDashboardResponse | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalyticsDashboard({
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        sortBy,
      });
      setData(res);
    } catch (err: any) {
      console.error('[SalesAnalyticsDashboard] Error loading data:', err);
      setError(err?.message || 'Error al consultar las analíticas de ventas');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, sortBy]);

  useEffect(() => {
    if (period !== 'custom' || (startDate && endDate)) {
      loadData();
    }
  }, [period, sortBy, loadData, startDate, endDate]);

  const handleExportCSV = () => {
    if (!data) return;
    const ov = data.overview.current;
    const rows = [
      ['Reporte Analítico de Ventas POS'],
      ['Periodo:', data.overview.periodLabel],
      ['Fecha Inicio:', data.overview.dateRange.start],
      ['Fecha Fin:', data.overview.dateRange.end],
      [''],
      ['INDICADOR', 'VALOR ACTUAL', 'PERIODO PREVIO'],
      ['Ventas Netas ($)', ov.netSales, data.overview.previous.netSales],
      ['Ventas Brutas ($)', ov.grossSales, data.overview.previous.grossSales],
      ['Descuentos Concedidos ($)', ov.totalDiscounts, data.overview.previous.totalDiscounts],
      ['Tickets Pagados', ov.salesCount, data.overview.previous.salesCount],
      ['Ticket Promedio ($)', ov.averageTicket ?? 'N/D', data.overview.previous.averageTicket ?? 'N/D'],
      ['Unidades Vendidas', ov.unitsSold, data.overview.previous.unitsSold],
      [''],
      ['TOP PLATILLOS MAS VENDIDOS'],
      ['Nombre', 'Categoría', 'Precio ($)', 'Unidades Vendidas', 'Ingresos ($)', 'Participación (%)'],
      ...data.topProducts.topProducts.map((p) => [
        p.name,
        p.category,
        p.price,
        p.unitsSold,
        p.revenue,
        `${p.unitsSharePercentage}%`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `analitica_ventas_${data.overview.periodLabel.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const periodOptions: Array<{ id: AnalyticsQueryParams['period']; label: string }> = [
    { id: 'today', label: 'Hoy' },
    { id: 'yesterday', label: 'Ayer' },
    { id: 'last_7_days', label: 'Últimos 7 días' },
    { id: 'last_30_days', label: 'Últimos 30 días' },
    { id: 'this_month', label: 'Este mes' },
    { id: 'last_month', label: 'Mes anterior' },
    { id: 'custom', label: 'Personalizado' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header con Filtros de Periodo */}
      <header className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Analíticas de Ventas y Rendimiento
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión de ingresos netos, horarios pico, rotación de menú, promociones y consumo de insumos.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 text-xs font-bold transition disabled:opacity-50"
            >
              <AppIcon name="refresh" size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Consultando…' : 'Actualizar'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!data || data.overview.current.salesCount === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#14144f] hover:bg-[#1f1f6d] text-white px-3.5 py-2 text-xs font-bold transition shadow-xs disabled:opacity-40"
            >
              <AppIcon name="download" size={14} />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros de Periodo */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-0.5">
            {periodOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPeriod(opt.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${period === opt.id
                  ? 'bg-white text-indigo-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Rango de Fechas Personalizado */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl text-xs">
              <label className="text-slate-500 font-medium">Desde:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs bg-white"
              />
              <label className="text-slate-500 font-medium">Hasta:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs bg-white"
              />
            </div>
          )}

          {data && (
            <div className="text-[11px] text-slate-500 font-medium">
              Periodo: <strong className="text-slate-800">{data.overview.periodLabel}</strong> ({data.overview.dateRange.daysCount} días)
            </div>
          )}
        </div>
      </header>

      {/* Manejo de Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppIcon name="error" size={18} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="font-bold underline text-rose-900">
            Reintentar
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="space-y-4 py-12 text-center text-slate-400">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold">Cargando analíticas de ventas…</p>
        </div>
      )}

      {/* Empty State Claro (Cuando no existen ventas en el periodo) */}
      {data && data.overview.current.salesCount === 0 && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center max-w-lg mx-auto my-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 mx-auto">
            <AppIcon name="calendar" size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Sin información comercial para el periodo seleccionado
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            No se registraron ventas válidas en el rango <strong>&quot;{data.overview.periodLabel}&quot;</strong>.
            Los indicadores no muestran ceros ficticios ni tendencias simuladas. Prueba seleccionando otro
            rango de fechas o registra ventas desde la terminal de caja.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setPeriod('last_30_days')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition"
            >
              Ver Últimos 30 Días
            </button>
          </div>
        </div>
      )}

      {/* Contenido Completo del Dashboard (Cuando existen datos) */}
      {data && data.overview.current.salesCount > 0 && (
        <div className="space-y-6">
          {/* 1. Tarjetas de Indicadores Principales */}
          <AnalyticsKpiCards
            current={data.overview.current}
            previous={data.overview.previous}
            comparison={data.overview.comparison}
            periodLabel={data.overview.periodLabel}
          />

          {/* 2. Picos de Ventas por Hora */}
          <HourlySalesChart
            data={data.hourlyAndDaily.hourly.data}
            peaks={data.hourlyAndDaily.hourly.peaks}
            daysCount={data.hourlyAndDaily.daysCount}
          />

          {/* 3. Ventas por Día de la Semana y Tendencia Diaria */}
          <DayOfWeekAndTrendChart
            dayOfWeek={data.hourlyAndDaily.dayOfWeek}
            dailyTrend={data.hourlyAndDaily.dailyTrend}
            periodLabel={data.overview.periodLabel}
          />

          {/* 4. Ranking de Menú: Top 10, Baja Rotación y Sin Ventas */}
          <TopProductsRanking
            topProducts={data.topProducts.topProducts}
            lowRotationProducts={data.topProducts.lowRotationProducts}
            zeroSalesProducts={data.topProducts.zeroSalesProducts}
            summary={data.topProducts.summary}
            currentSortBy={sortBy}
            onSortChange={(s) => setSortBy(s)}
          />

          {/* 5. Analítica de Promociones y Descuentos */}
          <PromotionsAnalyticsPanel
            promotions={data.promotions.promotions}
            summary={data.promotions.summary}
            commercialNote={data.promotions.commercialNote}
          />

          {/* 6. Consumo Teórico de Insumos vs Almacén */}
          <InventoryConsumptionPanel
            consumption={data.inventory.ingredientsConsumption}
            note={data.inventory.note}
          />

          {/* 7. Distribución Operativa (Tipos de Pedido y Métodos de Pago) */}
          <OperationalDistributionsPanel
            byOrderType={data.distributions.byOrderType}
            byPaymentMethod={data.distributions.byPaymentMethod}
            totalRevenue={data.distributions.totalRevenue}
            totalTickets={data.distributions.totalTickets}
          />
        </div>
      )}
    </div>
  );
}
