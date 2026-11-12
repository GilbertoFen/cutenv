'use client';

import React, { useState, useEffect } from 'react';
import type { SaleData } from '@/types';
import {
  checkPrinterAgentStatus,
  printToLocalAgent,
  formatTicketPlainText,
  getPrinterAgentUrl,
  setPrinterAgentUrl,
  type PrinterStatus,
} from '@/services/PrinterService';
import { AppIcon } from '@/components/icons';
import { markPrinted } from '@/services/SaleService';

interface ThermalTicketModalProps {
  sale: SaleData | null;
  isOpen: boolean;
  onClose: () => void;
  onPrintedSuccess?: () => void;
}

export default function ThermalTicketModal({
  sale,
  isOpen,
  onClose,
  onPrintedSuccess,
}: ThermalTicketModalProps) {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [agentStatus, setAgentStatus] = useState<PrinterStatus | null>(null);
  const [checkingAgent, setCheckingAgent] = useState(false);
  const [printingDirect, setPrintingDirect] = useState(false);
  const [directMessage, setDirectMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [customAgentUrl, setCustomAgentUrl] = useState('');

  useEffect(() => {
    if (!isOpen || !sale) return;

    setDirectMessage(null);
    setCustomAgentUrl(getPrinterAgentUrl());
    verifyAgent();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, sale, onClose]);

  const verifyAgent = async () => {
    setCheckingAgent(true);
    try {
      const status = await checkPrinterAgentStatus();
      setAgentStatus(status);
      if (status.paperWidth) {
        setPaperWidth(status.paperWidth);
      }
    } catch {
      setAgentStatus({ online: false, printerConnected: false });
    } finally {
      setCheckingAgent(false);
    }
  };

  const handleSaveConfig = () => {
    if (customAgentUrl) {
      setPrinterAgentUrl(customAgentUrl);
      verifyAgent();
      setShowConfig(false);
    }
  };

  const handlePrintDirectUSB = async () => {
    if (!sale) return;
    setPrintingDirect(true);
    setDirectMessage(null);

    try {
      const result = await printToLocalAgent(sale, { paperWidth });
      if (result.success) {
        setDirectMessage({ type: 'success', text: result.message });
        if (onPrintedSuccess) onPrintedSuccess();
      } else {
        setDirectMessage({
          type: 'error',
          text: result.message || 'Error al comunicarse con la impresora física USB.',
        });
      }
    } catch (err: any) {
      setDirectMessage({
        type: 'error',
        text: err?.message || 'Fallo de conexión con la impresora USB.',
      });
    } finally {
      setPrintingDirect(false);
    }
  };

  const handleBrowserPrint = async () => {
    if (!sale) return;

    // Disparar diálogo nativo del navegador
    if (typeof window !== 'undefined') {
      window.print();
    }

    // Actualizar estado en el backend sin bloquear
    if (sale.id) {
      try {
        await markPrinted(sale.id);
        if (onPrintedSuccess) onPrintedSuccess();
      } catch (e) {
        console.warn('[ThermalTicketModal] No se pudo marcar como impreso:', e);
      }
    }
  };

  if (!isOpen || !sale) return null;

  const tableNumber =
    typeof sale.table === 'object' && sale.table !== null
      ? (sale.table as any).number ?? '—'
      : String(sale.table || '—');

  const activeOrders = (sale.orders ?? []).filter((o: any) => o.status !== 'cancelled');
  const items = activeOrders.flatMap((o: any) =>
    (o.items ?? []).filter((it: any) => it.status !== 'cancelled')
  );
  const subtotalCalculated = items.reduce((acc, it) => acc + (it.quantity || 1) * (it.price || 0), 0);
  const discount = Number(sale.discountAmount || 0);
  const totalAmount = Number(sale.totalAmount || 0);
  const baseSubtotal = subtotalCalculated > 0 ? subtotalCalculated : (totalAmount + discount);

  return (
    <>
      {/* CSS para impresión térmica limpia (Oculta todo excepto el ticket térmico) */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #pos-thermal-ticket,
          #pos-thermal-ticket * {
            visibility: visible !important;
          }
          #pos-thermal-ticket {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === '80mm' ? '72mm' : '48mm'} !important;
            margin: 0 !important;
            padding: 2mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 11px !important;
          }
          @page {
            margin: 0;
            size: ${paperWidth === '80mm' ? '80mm auto' : '58mm auto'};
          }
        }
      `}</style>

      {/* Modal Backdrop (Solo visible en pantalla) */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <AppIcon name="print" size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Impresión de Ticket Térmico
                </h2>
                <p className="text-xs text-slate-500">
                  Folio {sale.folio || `VTA-${sale.id.slice(-6)}`} • Mesa {tableNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Selector de Ancho */}
              <div className="bg-slate-200/80 p-0.5 rounded-xl flex items-center text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  className={`px-2.5 py-1 rounded-lg transition ${paperWidth === '80mm'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'hover:text-slate-900'
                    }`}
                >
                  80 mm
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  className={`px-2.5 py-1 rounded-lg transition ${paperWidth === '58mm'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'hover:text-slate-900'
                    }`}
                >
                  58 mm
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition active:scale-95 font-bold"
                title="Cerrar modal"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Modal Body: 2 Columns (Preview + Controls) */}
          <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Visual Thermal Ticket (Preview) */}
            <div className="md:col-span-6 flex justify-center bg-slate-100/80 p-4 sm:p-6 rounded-2xl border border-dashed border-slate-200">
              <div
                id="pos-thermal-ticket"
                className={`bg-white text-slate-900 shadow-md border border-slate-300/80 font-mono text-[12px] leading-relaxed p-4 transition-all duration-200 select-none ${paperWidth === '80mm' ? 'w-[320px]' : 'w-[240px]'
                  }`}
              >
                {/* Header Restaurant */}
                <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3 mb-3">
                  <h3 className="font-black text-sm tracking-tight text-slate-900 uppercase">
                    RESTAURANTE POS
                  </h3>
                  <p className="text-[10px] text-slate-600 uppercase">
                    Comprobante de Consumo
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">
                    No Fiscal
                  </p>
                  <p className="text-[9px] text-slate-400">
                    RFC: XAXX010101000 • Sucursal Centro
                  </p>
                </div>

                {/* Metadata */}
                <div className="text-[11px] space-y-1 border-b border-dashed border-slate-300 pb-2 mb-2 text-slate-700">
                  <div className="flex justify-between">
                    <span className="font-bold">FOLIO:</span>
                    <span className="font-black text-slate-900">{sale.folio || `VTA-${sale.id.slice(-6)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MESA:</span>
                    <span className="font-bold">{tableNumber}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>FECHA:</span>
                    <span>{new Date(sale.date || Date.now()).toLocaleDateString()} {new Date(sale.date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 uppercase">
                    <span>TIPO:</span>
                    <span>{sale.orderType || 'local'}</span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border-b border-dashed border-slate-300 pb-2 mb-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase flex justify-between border-b border-slate-200 pb-1 mb-1.5">
                    <span>CANT / DESCRIPCIÓN</span>
                    <span>IMPORTE</span>
                  </div>

                  <div className="space-y-1.5">
                    {items.map((it, idx) => {
                      const totalItem = (it.quantity || 1) * (it.price || 0);
                      return (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between items-baseline gap-1">
                            <span className="font-bold text-slate-800 break-words leading-tight">
                              <span className="text-slate-900 font-black">{it.quantity}x</span> {it.recipe}
                            </span>
                            <span className="font-semibold text-slate-900 shrink-0">
                              ${totalItem.toFixed(2)}
                            </span>
                          </div>
                          {it.notes && (
                            <p className="text-[9px] text-slate-500 pl-4 italic">
                              * {it.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Financial Totals */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2 mb-2 text-slate-700">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">${baseSubtotal.toFixed(2)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between font-bold text-emerald-800">
                      <span>Descuento ({sale.promotionApplied?.name || 'Promo'}):</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-sm font-black text-slate-900">
                    <span>TOTAL:</span>
                    <span className="text-base">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment & Status */}
                <div className="text-[10px] space-y-0.5 text-slate-600 mb-3">
                  <div className="flex justify-between uppercase">
                    <span>Método de pago:</span>
                    <span className="font-bold text-slate-800">{sale.paymentMethod || 'efectivo'}</span>
                  </div>
                  <div className="flex justify-between uppercase">
                    <span>Estado:</span>
                    <span className={`font-bold inline-flex items-center gap-1 ${sale.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {sale.status === 'paid' ? (
                        <>
                          <AppIcon name="check" size={11} className="text-emerald-600 inline" />
                          <span>PAGADO</span>
                        </>
                      ) : (
                        <>
                          <AppIcon name="clock" size={11} className="text-amber-600 inline" />
                          <span>POR COBRAR</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Footer Message */}
                <div className="text-center space-y-1 text-[10px] text-slate-500 pt-2 border-t border-dashed border-slate-200">
                  <p className="font-bold text-slate-700">¡Muchas gracias por su visita!</p>
                  <p className="text-[9px] text-slate-400">Conserve este ticket para cualquier aclaración</p>
                  <p className="text-[8px] text-slate-300 font-mono tracking-widest mt-1">
                    || | |||| ||| ||||| || |||
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Connection Status & Printing Actions */}
            <div className="md:col-span-6 space-y-4">
              {/* Agent Status Card */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${agentStatus?.online
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-amber-500'
                        }`}
                    ></span>
                    <span className="text-xs font-bold text-slate-800">
                      Impresión Local (PC de Caja)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={verifyAgent}
                    disabled={checkingAgent}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    {checkingAgent ? 'Verificando…' : '↻ Reintentar'}
                  </button>
                </div>

                <div className="text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estado de conexión:</span>
                    <span
                      className={`font-black ${agentStatus?.online ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                    >
                      {agentStatus?.online ? 'En Línea (Conectado)' : 'Fuera de Línea / No Detectado'}
                    </span>
                  </div>
                  {agentStatus?.online && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Impresora detectada:</span>
                        <span className="font-bold text-slate-800">{agentStatus.printerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-800">{agentStatus.driver}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Status Message */}
              {directMessage && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-bold border flex items-center gap-2 ${directMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                >
                  <AppIcon
                    name={directMessage.type === 'success' ? 'check' : 'warning'}
                    size={16}
                    className={directMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}
                  />
                  <span>{directMessage.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {/* 1. Direct USB Print (Alternativa B) */}
                <button
                  type="button"
                  onClick={handlePrintDirectUSB}
                  disabled={printingDirect}
                  className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-soft-sm transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <AppIcon name="print" size={18} />
                  <span>
                    {printingDirect
                      ? 'Enviando a impresora USB…'
                      : 'Imprimir Directo por USB (Silencioso)'}
                  </span>
                </button>

                {/* 2. Browser Print Fallback (Alternativa A) */}
                <button
                  type="button"
                  onClick={handleBrowserPrint}
                  className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm shadow-soft-sm transition active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <AppIcon name="receipt" size={18} />
                  <span>Imprimir desde Navegador / PDF (Fallback)</span>
                </button>

                <div className="pt-2 flex justify-between items-center text-xs text-slate-400">
                  <span>Reintentar la impresión no duplica la venta ni el cobro.</span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="font-bold text-slate-600 hover:text-slate-900 underline"
                  >
                    Cerrar ventana
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
