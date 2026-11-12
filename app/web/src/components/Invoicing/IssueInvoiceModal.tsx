'use client';

import React, { useState, useEffect } from 'react';
import {
  issueIndividualInvoice,
  getFiscalCustomers,
  getSatCatalogs,
  getInvoiceXmlUrl,
  getInvoicePdfUrl,
  sendInvoiceEmail,
} from '@/services/InvoicingService';
import type { SaleData, SatCatalogsData, FiscalCustomerData, InvoiceData } from '@/types';
import { AppIcon } from '@/components/icons';
import SelectCustomerModal from './SelectCustomerModal';
import CustomSelect from '@/components/UI/CustomSelect';

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
  const [showSelectCustomerModal, setShowSelectCustomerModal] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<InvoiceData | null>(null);
  const [copiedUuid, setCopiedUuid] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  const [customSendEmail, setCustomSendEmail] = useState('');

  const [formData, setFormData] = useState({
    rfc: '',
    legalName: '',
    postalCode: '',
    taxRegime: '601',
    cfdiUse: 'G03',
    email: '',
    paymentMethod: '01',
    saveCustomer: false,
    sendEmail: true,
  });

  useEffect(() => {
    if (isOpen && sale) {
      setError(null);
      setCreatedInvoice(null);
      setCopiedUuid(false);
      setEmailStatusMessage(null);
      setCustomSendEmail('');

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
      postalCode: '42501',
      taxRegime: '616',
      cfdiUse: 'S01',
      email: '',
      saveCustomer: false,
    }));
  };

  const handleQuickTestPersonaMoral = () => {
    setFormData((prev) => ({
      ...prev,
      rfc: 'ICV060329BY0',
      legalName: 'INMOBILIARIA CVA',
      postalCode: '33826',
      taxRegime: '601',
      cfdiUse: 'G03',
      email: prev.email || 'contacto@inmobiliariacva.com',
      saveCustomer: false,
    }));
  };

  const handleQuickTestPersonaFisica = () => {
    setFormData((prev) => ({
      ...prev,
      rfc: 'MASO451221PM4',
      legalName: 'MARIA OLIVIA MARTINEZ SAGAZ',
      postalCode: '80290',
      taxRegime: '612',
      cfdiUse: 'G03',
      email: prev.email || 'maria.martinez@prueba.com',
      saveCustomer: false,
    }));
  };

  const handleCopyUuid = () => {
    if (createdInvoice?.uuid) {
      navigator.clipboard.writeText(createdInvoice.uuid);
      setCopiedUuid(true);
      setTimeout(() => setCopiedUuid(false), 2500);
    }
  };

  const handleSendEmailNow = async () => {
    const invId = createdInvoice?._id || createdInvoice?.id;
    const targetEmail = customSendEmail.trim() || formData.email.trim();
    if (!invId || !targetEmail) {
      setEmailStatusMessage('Ingresa un correo electrónico válido');
      return;
    }

    try {
      setSendingEmail(true);
      setEmailStatusMessage(null);
      const res = await sendInvoiceEmail(invId, targetEmail);
      setEmailStatusMessage(res.message || 'Factura enviada con éxito');
    } catch (err: any) {
      setEmailStatusMessage(err.message || 'Error al enviar por correo');
    } finally {
      setSendingEmail(false);
    }
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
        sendEmail: formData.sendEmail && Boolean(formData.email.trim()),
      });

      setCreatedInvoice(invoice);
      setCustomSendEmail(formData.email.trim());
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
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AppIcon name="invoicing" size={18} className="text-indigo-600" />
                <span>Facturación de Venta #{sale.folio}</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Ambiente de Pruebas (Test Mode)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Certificación de comprobante fiscal digital CFDI 4.0 con Fiscalisto
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

        {sale.isFacturada ? (
          /* Aviso de Venta Ya Facturada (Prevención de Duplicados) */
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <AppIcon name="shield" size={26} className="text-amber-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Esta Venta Ya Fue Facturada</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Para garantizar la relación 1 a 1 entre tickets y comprobantes fiscales y evitar duplicidades ante el SAT, este ticket no puede volver a facturarse.
              </p>
            </div>
            {sale.invoiceId && (
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <a
                  href={getInvoiceXmlUrl(String(sale.invoiceId))}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition flex items-center gap-1.5"
                >
                  <AppIcon name="xml" size={14} className="text-slate-600" />
                  <span>Descargar XML Oficial</span>
                </a>
                <a
                  href={getInvoicePdfUrl(String(sale.invoiceId))}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition flex items-center gap-1.5"
                >
                  <AppIcon name="pdf" size={14} className="text-indigo-600" />
                  <span>Ver PDF Certificado</span>
                </a>
              </div>
            )}
            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : createdInvoice ? (
          /* Pantalla de Éxito / Comprobante Timbrado */
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <AppIcon name="check" size={26} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">¡Factura Timbrada con Éxito!</h3>
              <p className="text-xs text-slate-500 mt-1">
                El comprobante fiscal ha sido certificado ante el SAT a través de Fiscalisto
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left max-w-lg mx-auto space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Serie y Folio:</span>
                <strong className="text-slate-800">{createdInvoice.serie}-{createdInvoice.folio}</strong>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 shrink-0">Folio Fiscal (UUID):</span>
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <strong className="text-indigo-600 font-mono text-[11px] truncate select-all">{createdInvoice.uuid}</strong>
                  <button
                    type="button"
                    onClick={handleCopyUuid}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 hover:bg-indigo-200 text-indigo-700 shrink-0 font-medium transition"
                  >
                    {copiedUuid ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Receptor:</span>
                <span className="text-slate-800 font-medium truncate max-w-[260px]">
                  {createdInvoice.receptor.legalName} ({createdInvoice.receptor.rfc})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Facturado:</span>
                <strong className="text-emerald-700">${createdInvoice.total.toFixed(2)} MXN</strong>
              </div>
            </div>

            {/* Acciones de Descarga Oficial */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <a
                href={getInvoiceXmlUrl(createdInvoice._id || createdInvoice.id!)}
                target="_blank"
                rel="noreferrer"
                download
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition flex items-center gap-1.5"
              >
                <AppIcon name="xml" size={14} className="text-slate-600" />
                <span>Descargar XML Oficial</span>
              </a>
              <a
                href={getInvoicePdfUrl(createdInvoice._id || createdInvoice.id!)}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition flex items-center gap-1.5"
              >
                <AppIcon name="pdf" size={14} className="text-indigo-600" />
                <span>Ver / Descargar PDF Certificado</span>
              </a>
            </div>

            {/* Envío opcional por Correo */}
            <div className="border-t border-slate-200 pt-3 max-w-lg mx-auto text-left">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Enviar CFDI (PDF y XML) por correo:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="correo@receptor.com"
                  value={customSendEmail}
                  onChange={(e) => setCustomSendEmail(e.target.value)}
                  className="flex-1 text-xs px-3 py-1.5 border rounded-xl border-slate-300 bg-white"
                />
                <button
                  type="button"
                  disabled={sendingEmail}
                  onClick={handleSendEmailNow}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:opacity-50 transition"
                >
                  {sendingEmail ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
              {emailStatusMessage && (
                <p className="text-[11px] mt-1 font-medium text-indigo-600">
                  {emailStatusMessage}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full max-w-xs px-5 py-2.5 rounded-xl bg-[#14144f] hover:bg-[#1f1f6d] text-white text-xs font-bold transition shadow-sm"
              >
                Aceptar y Finalizar
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

            {/* Atajos de pruebas SAT / Fiscalisto y clientes guardados */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block">
                Atajos de prueba y Clientes Fiscales
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleQuickTestPersonaMoral}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition"
                  title="ICV060329BY0 - INMOBILIARIA CVA"
                >
                  🏢 Inmobiliaria CVA (P. Moral)
                </button>
                <button
                  type="button"
                  onClick={handleQuickTestPersonaFisica}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-semibold transition"
                  title="MASO451221PM4 - MARIA OLIVIA MARTINEZ"
                >
                  👤 Maria Martinez (P. Física)
                </button>
                <button
                  type="button"
                  onClick={handleQuickPublicoGeneral}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-semibold transition flex items-center gap-1"
                >
                  <AppIcon name="zap" size={12} className="text-amber-600" />
                  <span>Público General</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSelectCustomerModal(true)}
                  className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition flex items-center gap-1.5 ml-auto active:scale-95"
                >
                  <AppIcon name="search" size={12} />
                  <span>Buscar / Seleccionar cliente registrado</span>
                </button>
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
                  placeholder="Ej. ICV060329BY0 o XAXX010101000"
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
                  placeholder="Ej. 33826"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value.replace(/\D/g, '') })}
                  className="w-full text-xs font-mono px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre o Razón Social (Mayúsculas sin régimen de capital) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. INMOBILIARIA CVA"
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value.toUpperCase() })}
                  className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <CustomSelect
                  label="Régimen Fiscal del Receptor *"
                  value={formData.taxRegime}
                  onChange={(val) => setFormData({ ...formData, taxRegime: val })}
                  searchable
                  options={
                    catalogs?.regimenes?.map((r) => ({
                      value: r.code,
                      label: `${r.code} - ${r.description}`,
                    })) || [
                      { value: '601', label: '601 - General de Ley Personas Morales' },
                      { value: '605', label: '605 - Sueldos y Salarios' },
                      { value: '612', label: '612 - Personas Físicas con Actividades Empresariales' },
                      { value: '616', label: '616 - Sin obligaciones fiscales (Público General)' },
                      { value: '626', label: '626 - RESICO' },
                    ]
                  }
                />
              </div>

              <div>
                <CustomSelect
                  label="Uso del CFDI *"
                  value={formData.cfdiUse}
                  onChange={(val) => setFormData({ ...formData, cfdiUse: val })}
                  searchable
                  options={
                    catalogs?.usosCfdi?.map((u) => ({
                      value: u.code,
                      label: `${u.code} - ${u.description}`,
                    })) || [
                      { value: 'G03', label: 'G03 - Gastos en general' },
                      { value: 'G01', label: 'G01 - Adquisición de mercancías' },
                      { value: 'S01', label: 'S01 - Sin efectos fiscales' },
                    ]
                  }
                />
              </div>

              <div>
                <CustomSelect
                  label="Forma de Pago (SAT)"
                  value={formData.paymentMethod}
                  onChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                  searchable
                  options={
                    catalogs?.formasPago?.map((fp) => ({
                      value: fp.code,
                      label: `${fp.code} - ${fp.description}`,
                    })) || [
                      { value: '01', label: '01 - Efectivo' },
                      { value: '03', label: '03 - Transferencia electrónica' },
                      { value: '04', label: '04 - Tarjeta de crédito' },
                      { value: '28', label: '28 - Tarjeta de débito' },
                    ]
                  }
                />
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

              <div className="sm:col-span-2 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.sendEmail}
                    onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Enviar factura (PDF y XML) automáticamente al correo tras timbrar</span>
                </label>
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
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#14144f] hover:bg-[#1f1f6d] text-white transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Timbrando con Fiscalisto…</span>
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

      <SelectCustomerModal
        isOpen={showSelectCustomerModal}
        onClose={() => setShowSelectCustomerModal(false)}
        onSelectCustomer={handleSelectExistingCustomer}
      />
    </div>
  );
}
