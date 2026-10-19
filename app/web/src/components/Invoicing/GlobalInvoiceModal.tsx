'use client';

import React, { useState, useEffect } from 'react';
import {
  previewGlobalInvoice,
  issueGlobalInvoice,
  getInvoiceXmlUrl,
  getInvoicePdfUrl,
} from '@/services/InvoicingService';
import type { GlobalInvoicePreview, InvoiceData } from '@/types';
import { AppIcon } from '@/components/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (invoice: InvoiceData) => void;
}

export default function GlobalInvoiceModal({ isOpen, onClose, onSuccess }: Props) {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingIssue, setLoadingIssue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GlobalInvoicePreview | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<InvoiceData | null>(null);

  const todayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [periodicity, setPeriodicity] = useState<'01' | '02' | '03' | '04'>('01');
  const [months, setMonths] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [paymentMethod, setPaymentMethod] = useState('01');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPreview(null);
      setCreatedInvoice(null);
      handleLoadPreview();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoadPreview = async () => {
    try {
      setLoadingPreview(true);
      setError(null);
      const res = await previewGlobalInvoice(startDate, endDate);
      setPreview(res);
    } catch (err: any) {
      setError(err.message || 'Error al consultar ventas para factura global');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleIssueGlobal = async () => {
    if (!preview || preview.eligibleCount === 0) {
      setError('No hay ventas elegibles para emitir la factura global');
      return;
    }

    try {
      setLoadingIssue(true);
      setError(null);
      const inv = await issueGlobalInvoice({
        periodicity,
        months,
        year: Number(year),
        startDate,
        endDate,
        paymentMethod,
      });

      setCreatedInvoice(inv);
      if (onSuccess) onSuccess(inv);
    } catch (err: any) {
      setError(err.message || 'Error al timbrar factura global');
    } finally {
      setLoadingIssue(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        <header className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AppIcon name="global" size={18} className="text-indigo-600" />
              <span>Factura Global de Operaciones con Público en General</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              CFDI 4.0 consolidado para ventas no facturadas individualmente (Regla 2.7.1.24 RMF)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
            aria-label="Cerrar modal"
          >
            <AppIcon name="close" size={16} />
          </button>
        </header>

        {createdInvoice ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <AppIcon name="check" size={26} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">¡Factura Global Certificada!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Se han incorporado las ventas seleccionadas bajo el RFC genérico XAXX010101000
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left max-w-md mx-auto space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Serie y Folio:</span>
                <strong className="text-slate-800">{createdInvoice.serie}-{createdInvoice.folio}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Folio Fiscal (UUID):</span>
                <strong className="text-indigo-600 font-mono text-[11px] select-all">{createdInvoice.uuid}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Periodicidad:</span>
                <span className="text-slate-800 font-medium">
                  {createdInvoice.globalPeriodicity?.periodicity === '01' ? 'Diario' : 'Mensual'} - Mes {createdInvoice.globalPeriodicity?.months} / {createdInvoice.globalPeriodicity?.year}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Global:</span>
                <strong className="text-emerald-700">${createdInvoice.total.toFixed(2)} MXN</strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={getInvoiceXmlUrl(createdInvoice._id || createdInvoice.id!)}
                target="_blank"
                rel="noreferrer"
                download
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition flex items-center gap-1.5"
              >
                <AppIcon name="xml" size={14} className="text-slate-600" />
                <span>Descargar XML</span>
              </a>
              <a
                href={getInvoicePdfUrl(createdInvoice._id || createdInvoice.id!)}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition flex items-center gap-1.5"
              >
                <AppIcon name="pdf" size={14} className="text-indigo-600" />
                <span>Ver / Descargar PDF</span>
              </a>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#14144f] hover:bg-[#1f1f6d] text-white text-xs font-bold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AppIcon name="warning" size={16} className="text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Parámetros SAT Factura Global */}
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                1. Parámetros Fiscales del SAT (InformacionGlobal)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Periodicidad</label>
                  <select
                    value={periodicity}
                    onChange={(e) => setPeriodicity(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900"
                  >
                    <option value="01">01 - Diario</option>
                    <option value="02">02 - Semanal</option>
                    <option value="03">03 - Quincenal</option>
                    <option value="04">04 - Mensual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mes</label>
                  <select
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Año</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Forma Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900"
                  >
                    <option value="01">01 - Efectivo</option>
                    <option value="04">04 - Tarjeta Crédito</option>
                    <option value="28">28 - Tarjeta Débito</option>
                    <option value="03">03 - Transferencia</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Rango de Fechas */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                2. Rango de Fechas de Ventas a Consolidar
              </h3>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Desde Fecha:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hasta Fecha:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLoadPreview}
                  disabled={loadingPreview}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition"
                >
                  {loadingPreview ? 'Consultando…' : '↻ Filtrar Ventas'}
                </button>
              </div>
            </div>

            {/* Resumen de Ventas Elegibles */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                3. Resumen de Ventas Elegibles Encontradas
              </h3>

              {loadingPreview ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Buscando ventas elegibles no facturadas…
                </div>
              ) : preview ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Tickets Elegibles</span>
                      <strong className="text-sm text-slate-800">{preview.eligibleCount}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Subtotal</span>
                      <strong className="text-sm text-slate-800">${preview.subtotal.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">IVA Trasladado</span>
                      <strong className="text-sm text-slate-800">${preview.taxAmount.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-700 uppercase block font-bold">Total Factura</span>
                      <strong className="text-sm text-indigo-700 font-black">${preview.total.toFixed(2)}</strong>
                    </div>
                  </div>

                  {preview.eligibleCount === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                      No hay ventas pagadas pendientes de facturar en este rango de fechas.
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl">
                      <table className="min-w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-600 sticky top-0">
                          <tr>
                            <th className="px-3 py-1.5">Folio</th>
                            <th className="px-3 py-1.5">Fecha</th>
                            <th className="px-3 py-1.5">Método</th>
                            <th className="px-3 py-1.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {preview.tickets.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50">
                              <td className="px-3 py-1 font-medium">{t.folio}</td>
                              <td className="px-3 py-1 text-slate-500">
                                {new Date(t.date).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-1 text-slate-500">{t.paymentMethod}</td>
                              <td className="px-3 py-1 text-right font-bold">${t.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleIssueGlobal}
                disabled={loadingIssue || !preview || preview.eligibleCount === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#14144f] hover:bg-[#1f1f6d] text-white transition disabled:opacity-50 flex items-center gap-2"
              >
                {loadingIssue ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Timbrando Factura Global…</span>
                  </>
                ) : (
                  <>
                    <AppIcon name="global" size={14} className="text-indigo-300" />
                    <span>Emitir y Timbrar Factura Global</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
