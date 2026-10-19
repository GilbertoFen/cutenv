'use client';

import React from 'react';
import { AppIcon } from '@/components/icons';
import type { IngredientConsumptionItem } from '@/services/AnalyticsService';

interface Props {
  consumption: IngredientConsumptionItem[];
  note: string;
}

export default function InventoryConsumptionPanel({ consumption, note }: Props) {
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(val || 0);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <AppIcon name="inventory" size={16} />
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Consumo Teórico de Insumos e Impacto en Inventario
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Deducción teórica de ingredientes derivada de recetas vendidas en comensales pagados
          </p>
        </div>

        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg uppercase">
          {consumption.length} Insumo(s) Involucrados
        </span>
      </div>

      {/* Tabla de Consumo de Insumos */}
      <div className="overflow-x-auto">
        {consumption.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No hay consumo de insumos registrado para el periodo seleccionado.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-2 px-3">Insumo de Almacén</th>
                <th className="py-2 px-3 text-right">Consumo Teórico</th>
                <th className="py-2 px-3 text-right">Existencia Actual</th>
                <th className="py-2 px-3 text-center">Estado de Stock</th>
                <th className="py-2 px-3 text-right">Costo Estimado de Consumo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consumption.map((c) => {
                const isOutOfStock = c.stockStatus === 'Agotado';
                const isLowStock = c.stockStatus === 'Bajo stock';

                return (
                  <tr key={c.productId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{c.productName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      {formatNumber(c.theoreticalConsumption)} {c.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">
                      {formatNumber(c.currentStock)} {c.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          isOutOfStock
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isLowStock
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOutOfStock
                              ? 'bg-rose-500'
                              : isLowStock
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        {c.stockStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                      {c.estimatedCostOfConsumption > 0 ? formatMoney(c.estimatedCostOfConsumption) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Aclaración metodológica obligatoria */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
        <AppIcon name="info" size={15} className="text-slate-400 shrink-0 mt-0.5" />
        <div>
          <strong>Metodología de inventario: </strong>
          {note} El inventario actual no se modifica desde este módulo analítico.
        </div>
      </div>
    </div>
  );
}
