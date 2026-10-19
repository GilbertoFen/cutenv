'use client';

import React from 'react';
import { AppIcon } from '@/components/icons';
import type { PromotionReportItem } from '@/services/AnalyticsService';

interface Props {
  promotions: PromotionReportItem[];
  summary: {
    totalDiscountsGranted: number;
    totalPromotionalRevenue: number;
    totalTimesApplied: number;
  };
  commercialNote: string;
}

export default function PromotionsAnalyticsPanel({ promotions, summary, commercialNote }: Props) {
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const getPromotionTypeBadge = (type: string) => {
    switch (type) {
      case 'two_for_one':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">2x1</span>;
      case 'percentage_discount':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Porcentaje %</span>;
      case 'fixed_discount':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Monto Fijo $</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{type}</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-50 text-amber-700">
              <AppIcon name="zap" size={16} />
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Analítica de Promociones y Cupones de Descuento
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Registro real de cupones y promociones aplicados en cuentas liquidadas
          </p>
        </div>

        {/* Resumen numérico */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Descuentos Concedidos</span>
            <span className="text-sm font-black text-rose-600">-{formatMoney(summary.totalDiscountsGranted)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Ventas Asociadas</span>
            <span className="text-sm font-black text-slate-900">{formatMoney(summary.totalPromotionalRevenue)}</span>
          </div>
        </div>
      </div>

      {/* Tabla de Promociones */}
      <div className="overflow-x-auto">
        {promotions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No se aplicaron promociones ni cupones durante el periodo seleccionado.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-2 px-3">Promoción / Cupón</th>
                <th className="py-2 px-3">Código</th>
                <th className="py-2 px-3">Modalidad</th>
                <th className="py-2 px-3 text-center">Estado Catálogo</th>
                <th className="py-2 px-3 text-right">Veces Aplicada</th>
                <th className="py-2 px-3 text-right">Total Descuento</th>
                <th className="py-2 px-3 text-right">Ingresos Netos Generados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {promotions.map((p) => (
                <tr key={p.id + p.name} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-900 block">{p.name}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                    {p.code}
                  </td>
                  <td className="py-2.5 px-3">
                    {getPromotionTypeBadge(p.type)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-900">
                    {p.timesApplied}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-rose-600">
                    -{formatMoney(p.totalDiscount)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                    {formatMoney(p.associatedNetRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Nota de Interpretación Comercial Obligatoria */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
        <AppIcon name="info" size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Interpretación comercial responsable: </strong>
          {commercialNote}
        </div>
      </div>
    </div>
  );
}
