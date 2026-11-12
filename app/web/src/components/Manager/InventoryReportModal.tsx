'use client';

import React from 'react';
import type { InventoryItem } from '@/types';
import { currency, fmtNum } from '@/utils/Manager/manager.functions';
import { AppIcon } from '@/components/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
}

export default function InventoryReportModal({ isOpen, onClose, items }: Props) {
  if (!isOpen) return null;

  const totalItems = items.length;
  const totalValuation = items.reduce(
    (acc, i) => acc + (Number(i.currentQty) || 0) * (Number(i.price) || 0),
    0
  );

  const categories = Array.from(new Set(items.map((i) => i.category || 'General')));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Controls (Hidden in print) */}
        <div className="print:hidden flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Vista Previa de Reporte Oficial de Inventario</h3>
            <p className="text-xs text-slate-500">Documento de control y auditoría de existencias físicas y valorización</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
            >
              <AppIcon name="print" size={14} />
              <span>Imprimir / Guardar como PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="p-8 overflow-y-auto space-y-6 printable-report bg-white text-slate-900">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#14144f] text-white px-2 py-0.5 rounded text-xs font-black">POS</span>
                <span className="text-lg font-black tracking-tight text-slate-900 uppercase">Restaurante - Almacén General</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900">REPORTE OFICIAL DE INVENTARIO Y EXISTENCIAS</h1>
              <p className="text-xs text-slate-500 mt-0.5">Auditoría y control de materias primas e insumos de cocina</p>
            </div>
            <div className="text-right text-xs">
              <p className="text-slate-500">Fecha de emisión:</p>
              <p className="font-bold text-slate-800">{new Date().toLocaleDateString('es-MX', { dateStyle: 'full' })}</p>
              <p className="text-slate-400 font-mono text-[11px]">{new Date().toLocaleTimeString('es-MX')}</p>
            </div>
          </div>

          {/* Resumen KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                Total de Insumos Registrados
              </span>
              <span className="text-2xl font-black text-slate-900">{fmtNum(totalItems)}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                Valor Total del Inventario
              </span>
              <span className="text-2xl font-black text-emerald-700">{currency(totalValuation)}</span>
            </div>
          </div>

          {/* Desglose por categoría */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Resumen por Categoría de Insumo
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map((cat) => {
                const catItems = items.filter((i) => (i.category || 'General') === cat);
                const catStock = catItems.reduce((a, b) => a + (Number(b.currentQty) || 0), 0);
                const catValue = catItems.reduce(
                  (a, b) => a + (Number(b.currentQty) || 0) * (Number(b.price) || 0),
                  0
                );
                return (
                  <div key={cat} className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs">
                    <p className="font-bold text-slate-800 truncate">{cat}</p>
                    <p className="text-slate-500 text-[11px]">{catItems.length} insumos · {catStock} uds</p>
                    <p className="font-extrabold text-emerald-800 text-[11px] mt-0.5">{currency(catValue)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabla de existencias */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Detalle Completo de Existencias
            </h4>
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2 border border-slate-200">SKU / Código</th>
                  <th className="p-2 border border-slate-200">Insumo / Producto</th>
                  <th className="p-2 border border-slate-200">Categoría</th>
                  <th className="p-2 border border-slate-200 text-right">Existencia Actual</th>
                  <th className="p-2 border border-slate-200 text-right">Precio Unit.</th>
                  <th className="p-2 border border-slate-200 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((i) => {
                  const val = (Number(i.currentQty) || 0) * (Number(i.price) || 0);
                  return (
                    <tr key={i.id} className="hover:bg-slate-50">
                      <td className="p-2 border border-slate-200 font-mono text-slate-500">{i.sku || '—'}</td>
                      <td className="p-2 border border-slate-200 font-bold text-slate-900">
                        {i.name} {i.brand && <span className="font-normal text-slate-400">({i.brand})</span>}
                      </td>
                      <td className="p-2 border border-slate-200">{i.category || 'General'}</td>
                      <td className="p-2 border border-slate-200 text-right font-bold text-indigo-900">
                        {fmtNum(i.currentQty)} {i.unit || 'uds'}
                      </td>
                      <td className="p-2 border border-slate-200 text-right">{currency(i.price || 0)}</td>
                      <td className="p-2 border border-slate-200 text-right font-bold text-emerald-800">
                        {currency(val)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Firmas */}
          <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs text-slate-600">
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold">Firma Gerente en Turno</p>
              <p className="text-[10px] text-slate-400">Responsable de Inventario y Almacén</p>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold">Firma Auditor / Propietario</p>
              <p className="text-[10px] text-slate-400">Conformidad de existencias y corte</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
