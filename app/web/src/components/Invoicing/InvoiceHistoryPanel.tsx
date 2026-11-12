'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  getInvoices,
  getInvoiceXmlUrl,
  getInvoicePdfUrl,
  cancelInvoice,
  getSatCatalogs,
  sendInvoiceEmail,
} from '@/services/InvoicingService';
import type { InvoiceData, SatCatalogsData } from '@/types';
import FiscalConfigModal from './FiscalConfigModal';
import GlobalInvoiceModal from './GlobalInvoiceModal';
import { AppIcon } from '@/components/icons';

export default function InvoiceHistoryPanel() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'global'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'stamped' | 'cancelled'>('all');

  // Modales
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<InvoiceData | null>(null);
  const [cancelReason, setCancelReason] = useState<'01' | '02' | '03' | '04'>('02');
  const [replacementUuid, setReplacementUuid] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Modal de envío por correo
  const [emailTarget, setEmailTarget] = useState<InvoiceData | null>(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [catalogs, setCatalogs] = useState<SatCatalogsData | null>(null);

  const refreshInvoices = () => {
    setLoading(true);
    getInvoices({ type: typeFilter, status: statusFilter, search })
      .then((data) => setInvoices(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshInvoices();
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    getSatCatalogs().then(setCatalogs).catch(console.error);
  }, []);

  const filteredInvoices = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return invoices;
    return invoices.filter(
      (inv) =>
        inv.folio?.toLowerCase().includes(s) ||
        inv.uuid?.toLowerCase().includes(s) ||
        inv.receptor?.rfc?.toLowerCase().includes(s) ||
        inv.receptor?.legalName?.toLowerCase().includes(s)
    );
  }, [invoices, search]);

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    if (cancelReason === '01' && !replacementUuid.trim()) {
      setCancelError('Para el motivo 01 es obligatorio indicar el UUID del comprobante que lo sustituye');
      return;
    }

    try {
      setCancelling(true);
      setCancelError(null);
      await cancelInvoice(cancelTarget._id || cancelTarget.id!, cancelReason, replacementUuid.trim());
      setCancelTarget(null);
      refreshInvoices();
    } catch (err: any) {
      setCancelError(err.message || 'Error al solicitar cancelación');
    } finally {
      setCancelling(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailTarget || !emailAddress.trim()) return;
    try {
      setSendingEmail(true);
      setEmailResult(null);
      const res = await sendInvoiceEmail(emailTarget._id || emailTarget.id!, emailAddress.trim());
      setEmailResult({ ok: true, msg: res.message || 'Factura enviada exitosamente' });
      refreshInvoices();
    } catch (err: any) {
      setEmailResult({ ok: false, msg: err.message || 'Error al enviar la factura' });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <section className="space-y-4 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AppIcon name="invoicing" size={20} className="text-indigo-600" />
            <span>Módulo de Facturación Electrónica (CFDI 4.0)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Administración de comprobantes fiscales, timbrado PAC, facturas globales y descargas XML/PDF
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-300 shadow-sm flex items-center gap-1.5"
          >
            <AppIcon name="settings" size={14} className="text-slate-600" />
            <span>Configuración Fiscal y PAC</span>
          </button>
          <button
            onClick={() => setShowGlobalModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#14144f] hover:bg-[#1f1f6d] text-white transition shadow-sm flex items-center gap-1.5"
          >
            <AppIcon name="global" size={14} className="text-indigo-300" />
            <span>Factura Global Público General</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
          <label className="text-xs font-semibold text-slate-600">Buscar:</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white placeholder-slate-400"
            placeholder="Folio, UUID, RFC o Razón Social…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-600">Tipo:</label>
          <select
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="all">Todos los tipos</option>
            <option value="individual">Individual (Venta)</option>
            <option value="global">Global (Público General)</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-600">Estado:</label>
          <select
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">Todos los estados</option>
            <option value="stamped">Vigentes (Timbradas)</option>
            <option value="cancelled">Canceladas SAT</option>
          </select>
        </div>

        <button
          onClick={refreshInvoices}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 bg-white"
        >
          ↻ Recargar
        </button>
      </div>

      {/* Tabla de Facturas */}
      <div className="w-full max-w-full overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-soft-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-50/90 text-slate-600 border-b border-slate-200 font-bold">
            <tr>
              <th className="px-2.5 sm:px-3 py-2.5 whitespace-nowrap">Serie/Folio</th>
              <th className="px-2.5 sm:px-3 py-2.5 whitespace-nowrap">UUID (SAT)</th>
              <th className="px-2.5 sm:px-3 py-2.5 whitespace-nowrap">Tipo</th>
              <th className="px-2.5 sm:px-3 py-2.5">Receptor</th>
              <th className="px-2.5 sm:px-3 py-2.5 whitespace-nowrap">Fecha Timbrado</th>
              <th className="px-2.5 sm:px-3 py-2.5 text-right whitespace-nowrap">Total</th>
              <th className="px-2.5 sm:px-3 py-2.5 text-center whitespace-nowrap">Estado SAT</th>
              <th className="px-2.5 sm:px-3 py-2.5 text-right whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Cargando facturas emitidas…
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No se encontraron facturas emitidas que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr key={inv._id || inv.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-2.5 sm:px-3 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                    {inv.serie}-{inv.folio}
                  </td>
                  <td className="px-2.5 sm:px-3 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    <span
                      className="block max-w-[105px] sm:max-w-[130px] truncate cursor-help"
                      title={inv.uuid || 'Comprobante sin UUID SAT'}
                    >
                      {inv.uuid ? `${inv.uuid.substring(0, 13)}…` : '—'}
                    </span>
                  </td>
                  <td className="px-2.5 sm:px-3 py-2.5 whitespace-nowrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${inv.type === 'global'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                        }`}
                    >
                      {inv.type === 'global' ? 'Global' : 'Individual'}
                    </span>
                  </td>
                  <td className="px-2.5 sm:px-3 py-2.5 min-w-[130px] max-w-[180px]">
                    <div
                      className="font-semibold text-slate-800 truncate cursor-help"
                      title={`${inv.receptor?.legalName || 'Público General'} - RFC: ${inv.receptor?.rfc || 'XAXX010101000'}`}
                    >
                      {inv.receptor?.legalName || 'Público General'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{inv.receptor?.rfc}</div>
                  </td>
                  <td className="px-2.5 sm:px-3 py-2.5 text-slate-500 whitespace-nowrap text-[11px]">
                    {inv.stampedAt ? new Date(inv.stampedAt).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td className="px-2.5 sm:px-3 py-2.5 text-right font-black text-slate-800 whitespace-nowrap">
                    ${inv.total.toFixed(2)}
                  </td>
                  <td className="px-2.5 sm:px-3 py-2.5 text-center whitespace-nowrap">
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${inv.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : inv.status === 'pending_cancellation'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                      >
                        {inv.status === 'cancelled'
                          ? 'Cancelada'
                          : inv.status === 'pending_cancellation'
                            ? 'En Cancelación'
                            : 'Vigente'}
                      </span>
                      {inv.emailSentAt ? (
                        <span className="text-[9px] text-emerald-700 font-semibold" title={`Enviado a ${inv.emailTo || inv.receptor?.email}`}>
                          ✓ Correo enviado
                        </span>
                      ) : inv.emailStatus === 'failed' ? (
                        <span className="text-[9px] text-rose-600 font-semibold" title="Error en envío automático de correo">
                          ⚠️ Correo no enviado
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-2.5 sm:px-3 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={getInvoiceXmlUrl(inv._id || inv.id!)}
                        target="_blank"
                        rel="noreferrer"
                        download
                        title="Descargar XML CFDI 4.0 Oficial"
                        className="px-2 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-[11px] font-semibold transition"
                      >
                        XML
                      </a>
                      <a
                        href={getInvoicePdfUrl(inv._id || inv.id!)}
                        target="_blank"
                        rel="noreferrer"
                        title="Ver / Descargar Representación PDF Certificada"
                        className="px-2 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold transition"
                      >
                        PDF
                      </a>
                      <button
                        onClick={() => {
                          setEmailTarget(inv);
                          setEmailAddress(inv.emailTo || inv.receptor?.email || '');
                          setEmailResult(null);
                        }}
                        title={inv.emailSentAt ? "Reenviar CFDI por correo electrónico sin re-timbrar" : "Enviar CFDI por correo electrónico"}
                        className="px-2 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold transition"
                      >
                        {inv.emailSentAt ? "Reenviar" : "Email"}
                      </button>
                      {inv.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            setCancelTarget(inv);
                            setCancelReason('02');
                            setReplacementUuid('');
                            setCancelError(null);
                          }}
                          title="Cancelar CFDI ante el SAT"
                          className="px-2 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Cancelación SAT */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <header className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AppIcon name="warning" size={16} className="text-amber-500" />
                <span>Cancelar Factura SAT: {cancelTarget.serie}-{cancelTarget.folio}</span>
              </h3>
              <button
                onClick={() => setCancelTarget(null)}
                className="text-slate-400 hover:text-slate-600 transition p-1"
                aria-label="Cerrar modal"
              >
                <AppIcon name="close" size={16} />
              </button>
            </header>

            <div className="text-xs text-slate-600 space-y-1">
              <div>
                UUID: <strong className="font-mono text-slate-800 text-[11px]">{cancelTarget.uuid}</strong>
              </div>
              <div>
                Receptor: <strong>{cancelTarget.receptor?.legalName} ({cancelTarget.receptor?.rfc})</strong>
              </div>
              <div>
                Total: <strong className="text-rose-600">${cancelTarget.total.toFixed(2)} MXN</strong>
              </div>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {cancelError}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo de Cancelación (SAT) *
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900"
                >
                  <option value="02">02 - Comprobante emitido con errores sin relación</option>
                  <option value="03">03 - No se llevó a cabo la operación</option>
                  <option value="01">01 - Comprobante emitido con errores con relación (Requiere sustitución)</option>
                  <option value="04">04 - Operación nominativa relacionada en factura global</option>
                </select>
              </div>

              {cancelReason === '01' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UUID del Comprobante Sustituto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="XXXXXXXX-XXXX-4XXX-YXXX-XXXXXXXXXXXX"
                    value={replacementUuid}
                    onChange={(e) => setReplacementUuid(e.target.value.trim().toUpperCase())}
                    className="w-full text-xs font-mono px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50"
              >
                {cancelling ? 'Cancelando ante SAT…' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Envío por Correo */}
      {emailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <header className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Enviar Factura: {emailTarget.serie}-{emailTarget.folio}</span>
              </h3>
              <button
                onClick={() => setEmailTarget(null)}
                className="text-slate-400 hover:text-slate-600 transition p-1"
                aria-label="Cerrar modal"
              >
                <AppIcon name="close" size={16} />
              </button>
            </header>

            <div className="text-xs text-slate-600 space-y-1">
              <div>UUID: <strong className="font-mono text-slate-800 text-[11px]">{emailTarget.uuid}</strong></div>
              <div>Receptor: <strong>{emailTarget.receptor?.legalName}</strong></div>
            </div>

            {emailResult && (
              <div
                className={`p-3 text-xs rounded-xl font-medium border ${
                  emailResult.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {emailResult.msg}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Correo destinatario:
              </label>
              <input
                type="email"
                required
                placeholder="correo@ejemplo.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setEmailTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Cerrar
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailAddress.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#14144f] hover:bg-[#1f1f6d] text-white transition disabled:opacity-50"
              >
                {sendingEmail ? 'Enviando comprobante…' : 'Enviar Comprobante'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales Secundarios */}
      <FiscalConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSaved={refreshInvoices}
      />

      <GlobalInvoiceModal
        isOpen={showGlobalModal}
        onClose={() => setShowGlobalModal(false)}
        onSuccess={refreshInvoices}
      />
    </section>
  );
}
