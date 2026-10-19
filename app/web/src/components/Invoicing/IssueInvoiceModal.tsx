'use client';

import React, { useState, useEffect } from 'react';
import {
  issueIndividualInvoice,
  getFiscalCustomers,
  getSatCatalogs,
  getInvoiceXmlUrl,
  getInvoicePdfUrl,
} from '@/services/InvoicingService';
import type { SaleData, SatCatalogsData, FiscalCustomerData, InvoiceData } from '@/types';
import { AppIcon } from '@/components/icons';

interface Props {
  isOpen: boolean;
  sale: SaleData | null;
  onClose: () => void;
  onSuccess?: (invoice: InvoiceData) => void;
}

export default function IssueInvoiceModal({ isOpen, sale, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [catalogs, setCatalogs] = useState<SatCatalogsData | null>(null);
  const [customers, setCustomers] = useState<FiscalCustomerData[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<InvoiceData | null>(null);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    rfc: '',
    legalName: '',
    postalCode: '',
    taxRegime: '601',
    cfdiUse: 'G03',
    email: '',
    paymentMethod: '01',
    saveCustomer: true,
  });

  useEffect(() => {
    if (isOpen && sale) {
      setError(null);
      setCreatedInvoice(null);
      setAutoCloseCountdown(null);

      getSatCatalogs()
        .then((cat) => setCatalogs(cat))
        .catch(console.error);

      getFiscalCustomers()
        .then((custs) => setCustomers(custs))
        .catch(console.error);

      // Default payment method mapping
      let satForma = '01';
      const pm = (sale.paymentMethod || '').toLowerCase();
      if (pm.includes('tarjeta') || pm.includes('card')) satForma = '28';
      else if (pm.includes('transfer')) satForma = '03';

      setFormData((prev) => ({
        ...prev,
        paymentMethod: satForma,
      }));
    }
  }, [isOpen, sale]);

  useEffect(() => {
    if (!createdInvoice) {
      setAutoCloseCountdown(null);
      return;
    }
    setAutoCloseCountdown(3);
    const timer = setInterval(() => {
      setAutoCloseCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [createdInvoice, onClose]);

  if (!isOpen || !sale) return null;

  const handleSelectExistingCustomer = (cust: FiscalCustomerData) => {
    setFormData((prev) => ({
      ...prev,
      rfc: cust.rfc,
      legalName: cust.legalName,
      postalCode: cust.postalCode,
      taxRegime: cust.taxRegime,
      cfdiUse: cust.cfdiUse,
      email: cust.email || '',
    }));
  };

  const handleQuickPublicoGeneral = () => {
    setFormData((prev) => ({
      ...prev,
      rfc: 'XAXX010101000',
      legalName: 'PUBLICO EN GENERAL',
      postalCode: '06000',
      taxRegime: '616',
      cfdiUse: 'S01',
      email: '',
      saveCustomer: false,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.rfc.trim()) {
      setError('El RFC del receptor es obligatorio');
      return;
    }
    if (!formData.legalName.trim()) {
      setError('El nombre o razón social del receptor es obligatorio');
      return;
    }
    if (formData.postalCode.length !== 5) {
      setError('El código postal debe tener 5 dígitos');
      return;
    }

    try {
      setLoading(true);
      const invoice = await issueIndividualInvoice(sale.id, {
        receptor: {
          rfc: formData.rfc.toUpperCase().trim(),
          legalName: formData.legalName.toUpperCase().trim(),
          postalCode: formData.postalCode.trim(),
          taxRegime: formData.taxRegime,
          cfdiUse: formData.cfdiUse,
          email: formData.email.trim() || undefined,
        },
        paymentMethod: formData.paymentMethod,
        saveCustomer: formData.saveCustomer,
      });

      setCreatedInvoice(invoice);
      if (onSuccess) onSuccess(invoice);
    } catch (err: any) {
      setError(err.message || 'Error al emitir el comprobante fiscal');
    } finally {
      setLoading(false);
    }
  };

  const total = Number(sale.totalAmount || 0);
  const subtotal = Math.round((total / 1.16 + Number.EPSILON) * 100) / 100;
  const iva = Math.round((total - subtotal + Number.EPSILON) * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        <header className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AppIcon name="invoicing" size={18} className="text-indigo-600" />
              <span>Facturación de Venta #{sale.folio}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Emisión de comprobante fiscal digital por internet (CFDI 4.0)
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
          /* Pantalla de Éxito / Comprobante Timbrado */
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <AppIcon name="check" size={26} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">¡Factura Timbrada con Éxito!</h3>
              <p className="text-xs text-slate-500 mt-1">
                El comprobante fiscal ha sido certificado y sellado digitalmente ante el SAT
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
                <span className="text-slate-500">Receptor:</span>
                <span className="text-slate-800 font-medium">{createdInvoice.receptor.legalName} ({createdInvoice.receptor.rfc})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Facturado:</span>
                <strong className="text-emerald-700">${createdInvoice.total.toFixed(2)} MXN</strong>
              </div>
            </div>

            {autoCloseCountdown !== null && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] text-emerald-800 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Cerrando automáticamente en {autoCloseCountdown}s...</span>
              </div>
            )}

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
          /* Formulario de Emisión */
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AppIcon name="warning" size={16} className="text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Resumen del Ticket */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-indigo-900 font-bold block">Ticket #{sale.folio}</span>
                <span className="text-indigo-600 text-[11px]">
                  {sale.date ? new Date(sale.date).toLocaleString('es-MX') : 'Fecha no disponible'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Subtotal</span>
                  <span className="font-semibold text-slate-800">${subtotal.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">IVA (16%)</span>
                  <span className="font-semibold text-slate-800">${iva.toFixed(2)}</span>
                </div>
                <div className="border-l border-indigo-200 pl-4">
                  <span className="text-indigo-900 block text-[10px] uppercase font-bold">Total Neto</span>
                  <span className="font-black text-indigo-700 text-sm">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Clientes frecuentes / Atajos */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Datos Fiscales del Cliente Receptor
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleQuickPublicoGeneral}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition flex items-center gap-1"
                >
                  <AppIcon name="zap" size={12} className="text-amber-600" />
                  <span>Público en General</span>
                </button>
                {customers.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      const sel = customers.find((c) => (c._id || c.id) === e.target.value);
                      if (sel) handleSelectExistingCustomer(sel);
                    }}
                    className="text-[11px] px-2 py-1 border rounded-lg border-slate-300 bg-white text-slate-700"
                  >
                    <option value="">Seleccionar cliente guardado…</option>
                    {customers.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.rfc} - {c.legalName.substring(0, 20)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Formulario Receptor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RFC del Receptor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. URE180429TM6 o XAXX010101000"
                  value={formData.rfc}
                  onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                  className="w-full text-xs font-mono px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código Postal Fiscal del Receptor *
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  placeholder="Ej. 64000"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value.replace(/\D/g, '') })}
                  className="w-full text-xs font-mono px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre o Razón Social (Mayúsculas exactamente como en el SAT) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. JUAN PEREZ LOPEZ o UNIVERSIDAD ROBOTICA..."
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value.toUpperCase() })}
                  className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Régimen Fiscal del Receptor *
                </label>
                <select
                  value={formData.taxRegime}
                  onChange={(e) => setFormData({ ...formData, taxRegime: e.target.value })}
                  className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  {catalogs?.regimenes?.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.code} - {r.description}
                    </option>
                  )) || (
                    <>
                      <option value="601">601 - General de Ley Personas Morales</option>
                      <option value="605">605 - Sueldos y Salarios</option>
                      <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                      <option value="616">616 - Sin obligaciones fiscales (Público General)</option>
                      <option value="626">626 - RESICO</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Uso del CFDI *
                </label>
                <select
                  value={formData.cfdiUse}
                  onChange={(e) => setFormData({ ...formData, cfdiUse: e.target.value })}
                  className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  {catalogs?.usosCfdi?.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.code} - {u.description}
                    </option>
                  )) || (
                    <>
                      <option value="G03">G03 - Gastos en general</option>
                      <option value="G01">G01 - Adquisición de mercancías</option>
                      <option value="S01">S01 - Sin efectos fiscales</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Forma de Pago (SAT)
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  {catalogs?.formasPago?.map((fp) => (
                    <option key={fp.code} value={fp.code}>
                      {fp.code} - {fp.description}
                    </option>
                  )) || (
                    <>
                      <option value="01">01 - Efectivo</option>
                      <option value="03">03 - Transferencia electrónica</option>
                      <option value="04">04 - Tarjeta de crédito</option>
                      <option value="28">28 - Tarjeta de débito</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico (Para envío)
                </label>
                <input
                  type="email"
                  placeholder="cliente@dominio.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.saveCustomer}
                    onChange={(e) => setFormData({ ...formData, saveCustomer: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Guardar o actualizar datos de este cliente fiscal para futuras visitas</span>
                </label>
              </div>
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
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#14144f] hover:bg-[#1f1f6d] text-white transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Timbrando ante SAT…</span>
                  </>
                ) : (
                  <>
                    <AppIcon name="zap" size={14} className="text-amber-300" />
                    <span>Emitir y Timbrar CFDI 4.0</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
