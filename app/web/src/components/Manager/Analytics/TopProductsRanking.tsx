'use client';

import React, { useState } from 'react';
import { AppIcon } from '@/components/icons';
import type { ProductRankingItem } from '@/services/AnalyticsService';

interface Props {
  topProducts: ProductRankingItem[];
  lowRotationProducts: ProductRankingItem[];
  zeroSalesProducts: Array<{
    recipeId: string;
    name: string;
    category: string;
    price: number;
    unitsSold: number;
    revenue: number;
  }>;
  summary: {
    totalUnitsSold: number;
    totalRevenue: number;
    distinctRecipesSold: number;
    zeroSalesCount: number;
  };
  currentSortBy: 'units' | 'revenue';
  onSortChange: (sort: 'units' | 'revenue') => void;
}

export default function TopProductsRanking({
  topProducts,
  lowRotationProducts,
  zeroSalesProducts,
  summary,
  currentSortBy,
  onSortChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<'top' | 'low' | 'zero'>('top');

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
      {/* Encabezado y Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-50 text-amber-700">
              <AppIcon name="owner" size={16} />
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Desempeño y Rotación de Menú (Recetas y Platillos)
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {summary.distinctRecipesSold} platillo(s) con ventas activas • {summary.zeroSalesCount} sin ventas registradas
          </p>
        </div>

        {/* Pestañas de Vista y Orden */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs Top / Baja rotación / Sin ventas */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('top')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'top'
                  ? 'bg-white text-indigo-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Top 10 Más Vendidos
            </button>
            <button
              onClick={() => setActiveTab('low')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'low'
                  ? 'bg-white text-indigo-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Baja Rotación ({lowRotationProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('zero')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'zero'
                  ? 'bg-white text-rose-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sin Ventas ({zeroSalesProducts.length})
            </button>
          </div>

          {/* Toggle de ordenamiento */}
          {activeTab === 'top' && (
            <div className="flex items-center bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-xs gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Ordenar por:</span>
              <button
                onClick={() => onSortChange('units')}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  currentSortBy === 'units'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unidades
              </button>
              <button
                onClick={() => onSortChange('revenue')}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  currentSortBy === 'revenue'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ingresos ($)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabla 1: Top 10 Más Vendidos */}
      {activeTab === 'top' && (
        <div className="overflow-x-auto">
          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No hay platillos vendidos en el periodo seleccionado.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-2 px-3 w-8">#</th>
                  <th className="py-2 px-3">Platillo / Receta</th>
                  <th className="py-2 px-3">Categoría</th>
                  <th className="py-2 px-3 text-right">Precio Unit.</th>
                  <th className="py-2 px-3 text-right">Unidades</th>
                  <th className="py-2 px-3 text-right">Participación (U)</th>
                  <th className="py-2 px-3 text-right">Ingresos Netos</th>
                  <th className="py-2 px-3 text-right">Participación ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.map((p, idx) => (
                  <tr key={p.recipeId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-black text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{p.name}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {formatMoney(p.price)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      {p.unitsSold}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-semibold text-slate-700">
                          {p.unitsSharePercentage}%
                        </span>
                        <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${p.unitsSharePercentage}%` }}
                            className="h-full bg-indigo-600 rounded-full"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                      {formatMoney(p.revenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-semibold text-slate-700">
                          {p.revenueSharePercentage}%
                        </span>
                        <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${p.revenueSharePercentage}%` }}
                            className="h-full bg-emerald-600 rounded-full"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tabla 2: Baja Rotación */}
      {activeTab === 'low' && (
        <div className="space-y-3">
          <p className="text-[11px] text-slate-500">
            Platillos con menor volumen de venta dentro del periodo (pero que tuvieron al menos 1 orden).
          </p>
          <div className="overflow-x-auto">
            {lowRotationProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No hay productos de baja rotación en el periodo.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2 px-3">Platillo</th>
                    <th className="py-2 px-3">Categoría</th>
                    <th className="py-2 px-3 text-right">Precio</th>
                    <th className="py-2 px-3 text-right">Unidades Vendidas</th>
                    <th className="py-2 px-3 text-right">Ingresos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowRotationProducts.map((p) => (
                    <tr key={p.recipeId} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{p.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{p.category}</td>
                      <td className="py-2.5 px-3 text-right">{formatMoney(p.price)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                        {p.unitsSold}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                        {formatMoney(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tabla 3: Sin Ventas en el Periodo */}
      {activeTab === 'zero' && (
        <div className="space-y-3">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 leading-relaxed">
            <strong>Catálogo sin demanda en el periodo:</strong> Estos platillos están marcados como activos en el menú pero no registraron ninguna venta en el rango seleccionado. Esta información permite al dueño evaluar si conviene retirarlos, renovar sus insumos o impulsarlos con una promoción.
          </div>
          <div className="overflow-x-auto">
            {zeroSalesProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-emerald-600 font-semibold">
                ¡Excelente! Todos los platillos activos del menú registraron ventas en este periodo.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2 px-3">Platillo Activo</th>
                    <th className="py-2 px-3">Categoría</th>
                    <th className="py-2 px-3 text-right">Precio en Carta</th>
                    <th className="py-2 px-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {zeroSalesProducts.map((p) => (
                    <tr key={p.recipeId} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{p.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{p.category}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">{formatMoney(p.price)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          0 ventas
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
