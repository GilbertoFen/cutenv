'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCashierSocket } from '@/gateways/cashierSocket';
import { getSaleById, paySale, markPrinted, getTicketQueue } from '@/services/SaleService';
import { getValidPromotionsToday, calculateSalePromotion } from '@/services/PromotionService';
import type { OrderType, PaymentMethod } from '@/types/Waiter/waiter.types';
import type { Promotion } from '@/types';
import { AppIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';

type Ticket = {
  saleId: string;
  tableId?: string;
  tableNumber?: number;
  requestedAt?: number;
};

const isOid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);

const dedupeBySaleId = (rows: Ticket[]): Ticket[] => {
  const seen = new Set<string>();
  const out: Ticket[] = [];
  for (const r of rows) {
    const k = String(r?.saleId ?? '');
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
};

export default function CashierPage() {
  const router = useRouter();
  const { hasWorkerAccess, loading: authLoading } = useAuth();
  const [orderType, setOrderType] = useState<OrderType>('local');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');

  useEffect(() => {
    if (!authLoading && !hasWorkerAccess) {
      router.replace('/worker');
    }
  }, [hasWorkerAccess, authLoading, router]);
  const [queue, setQueue] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [sale, setSale] = useState<any>(null);
  const [printing, setPrinting] = useState(false);
  const [paying, setPaying] = useState(false);

  // Promociones
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const [promoCalculation, setPromoCalculation] = useState<{
    discountAmount: number;
    benefitedItems: string[];
    finalTotal: number;
    eligibleUnitsCount?: number;
    eligibleSubtotal?: number;
    rule?: string;
  } | null>(null);
  const [calculatingPromo, setCalculatingPromo] = useState(false);

  const socketRef = useRef<ReturnType<typeof getCashierSocket> | null>(null);

  const fetchQueue = async () => {
    try {
      const [reqRows, prnRows] = await Promise.all([
        getTicketQueue('requested'),
        getTicketQueue('printed'),
      ]);

      const mapRows = (rows: any[]): Ticket[] =>
        (rows ?? []).map((r) => ({
          saleId: r.id,
          tableId: r.tableId,
          tableNumber: r.tableNumber,
          requestedAt: r.requestedAt ? new Date(r.requestedAt).getTime() : undefined,
        }));

      const combined = dedupeBySaleId([...mapRows(reqRows), ...mapRows(prnRows)]);
      setQueue(combined);
    } catch {
      setQueue([]);
    }
  };

  useEffect(() => {
    // Cargar promociones vigentes hoy desde el servidor
    getValidPromotionsToday()
      .then(setPromotions)
      .catch((err) => console.warn('[Cashier] Error loading promotions:', err));

    const s = getCashierSocket();
    socketRef.current = s;

    const onRequested = (t: Ticket) => {
      console.log('[cashier] ticket.requested', t);
      if (!t?.saleId) return;
      setQueue((prev) => dedupeBySaleId([t, ...prev]));
    };

    const onPrinted = (p: { saleId: string }) => {
      console.log('--- CASHIER SOCKET --- ticket.printed', p);
      setSale((prev: any) =>
        prev?.id === p.saleId
          ? { ...prev, ticketStatus: 'printed', ticketPrintedAt: Date.now() }
          : prev
      );
    };

    const onPaid = (p: { saleId: string }) => {
      console.log('[cashier] sale.paid', p);
      setQueue((prev) => prev.filter((x) => x.saleId !== p.saleId));
      setSelected((sel) => (sel?.saleId === p.saleId ? null : sel));
      setSale((prev: any) => (prev?.id === p.saleId ? null : prev));
    };

    // Sincronización cuando una orden se modifica o elimina
    const onOrderChange = () => {
      fetchQueue();
      if (selected?.saleId) {
        getSaleById(selected.saleId)
          .then((updated) => {
            if (!updated || updated.status === 'paid' || updated.orders?.length === 0) {
              setSale(null);
              setSelected(null);
            } else {
              setSale(updated);
            }
          })
          .catch(() => {
            setSale(null);
            setSelected(null);
          });
      }
    };

    s.on('ticket.requested', onRequested);
    s.on('ticket.printed', onPrinted);
    s.on('sale.paid', onPaid);
    s.on('order.deleted' as any, onOrderChange);
    s.on('order.created' as any, onOrderChange);
    s.on('order.updated' as any, onOrderChange);

    fetchQueue();

    return () => {
      s.off('ticket.requested', onRequested);
      s.off('ticket.printed', onPrinted);
      s.off('sale.paid', onPaid);
      s.off('order.deleted' as any, onOrderChange);
      s.off('order.created' as any, onOrderChange);
      s.off('order.updated' as any, onOrderChange);
    };
  }, [selected?.saleId]);

  useEffect(() => {
    (async () => {
      if (!selected) {
        setSale(null);
        setSelectedPromo(null);
        setPromoCalculation(null);
        return;
      }
      if (!isOid(selected.saleId)) {
        console.warn('[cashier] saleId inválido', selected.saleId);
        setSale(null);
        setSelectedPromo(null);
        setPromoCalculation(null);
        return;
      }

      const full = await getSaleById(selected.saleId);
      setSale(full);
      setSelectedPromo(null);
      setPromoCalculation(null);

      if (full?.orderType) setOrderType(full.orderType as OrderType);
      else setOrderType('local');

      if (full?.paymentMethod) setPaymentMethod(full.paymentMethod as PaymentMethod);
      else setPaymentMethod('efectivo');
    })();
  }, [selected]);

  const handleApplyPromotion = async (promo: Promotion | null) => {
    setSelectedPromo(promo);
    if (!promo || !sale?.id) {
      setPromoCalculation(null);
      return;
    }

    try {
      setCalculatingPromo(true);
      const res = await calculateSalePromotion(
        sale.id,
        promo.id || (promo as any)._id
      );

      if (!res.isEligible && res.discountAmount === 0) {
        alert(res.ineligibilityReason || 'Esta promoción no aplica a los productos de esta cuenta.');
        setSelectedPromo(null);
        setPromoCalculation(null);
        return;
      }

      setPromoCalculation({
        discountAmount: res.discountAmount,
        benefitedItems: res.benefitedItems,
        finalTotal: res.finalTotal,
        eligibleUnitsCount: res.eligibleUnitsCount,
        eligibleSubtotal: res.eligibleSubtotal,
        rule: res.rule,
      });
    } catch (err: any) {
      alert(err.message || 'Error al calcular promoción');
      setSelectedPromo(null);
      setPromoCalculation(null);
    } finally {
      setCalculatingPromo(false);
    }
  };

  const printTicket = async () => {
    if (!sale?.id) return;
    try {
      setPrinting(true);
      await markPrinted(sale.id);
    } catch (e) {
      console.error(e);
      alert('Error al imprimir');
    } finally {
      setPrinting(false);
    }
  };

  const confirmPayment = async () => {
    if (!sale?.id) return;
    try {
      setPaying(true);
      await paySale(sale.id, {
        orderType,
        paymentMethod,
        promotionId: selectedPromo ? (selectedPromo.id || (selectedPromo as any)._id) : undefined,
        discountAmount: promoCalculation?.discountAmount || 0,
        promotionApplied: selectedPromo && promoCalculation
          ? {
              promotionId: selectedPromo.id || (selectedPromo as any)._id,
              name: selectedPromo.name,
              type: selectedPromo.type,
              discountAmount: promoCalculation?.discountAmount || 0,
              benefitedItems: promoCalculation?.benefitedItems || [],
            }
          : undefined,
      });
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error al pagar');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-soft-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Caja y Facturación • Cobro en Punto de Venta
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Módulo de Caja y Cobros
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Emisión de tickets de venta, aplicación de descuentos vigentes y registro de cobros
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/worker"
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-2xl transition active:scale-95 shadow-soft-xs"
            title="Volver a los 4 módulos operativos"
          >
            <AppIcon name="arrow-left" size={14} />
            <span>Inicio de trabajador</span>
          </Link>
          <div className="min-h-[44px] bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 border border-indigo-100 shadow-soft-xs">
            <span>Cola activa:</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[11px]">
              {queue.length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tickets Queue (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl shadow-soft-xs border border-slate-200/90 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <span>Tickets por Cobrar</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-extrabold">
                {queue.length}
              </span>
            </h2>
            <button
              onClick={fetchQueue}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
            >
              ↻ Refrescar
            </button>
          </div>

          <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
            {queue.map((ticket) => {
              const isSelected = selected?.saleId === ticket.saleId;
              return (
                <button
                  key={ticket.saleId}
                  onClick={() => setSelected(ticket)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 active:scale-[0.99] ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-soft-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50/60 shadow-soft-xs'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-slate-900 font-mono">
                      Venta #{String(ticket.saleId).slice(-6)}
                    </span>
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Mesa {ticket.tableNumber ?? '-'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Solicitado: {ticket.requestedAt ? new Date(ticket.requestedAt).toLocaleTimeString() : '—'}
                  </div>
                </button>
              );
            })}
            {!queue.length && (
              <div className="text-center py-14 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <AppIcon name="receipt" size={30} className="mx-auto text-slate-300 mb-1.5" />
                <p className="text-xs font-bold text-slate-600">Sin tickets en cola</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Los meseros solicitarán el ticket cuando los comensales pidan la cuenta.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ticket Detail & Checkout (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl shadow-soft-xs border border-slate-200/90 p-5 sm:p-7">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <h2 className="font-black text-base text-slate-900">Detalle de la Cuenta y Cobro</h2>
            {sale && (
              <span className={`text-xs px-3 py-1 rounded-full font-black uppercase tracking-wider ${
                sale.ticketStatus === 'printed'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {sale.ticketStatus === 'printed' ? '✓ Ticket Impreso' : '⏳ Por imprimir'}
              </span>
            )}
          </div>

          {!sale && (
            <div className="text-center py-20 px-6 bg-slate-50/60 rounded-3xl border border-dashed border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
                💳
              </div>
              <h3 className="text-sm font-bold text-slate-700">Ningún ticket seleccionado</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Selecciona un ticket de la columna izquierda para revisar el consumo, aplicar promociones y registrar el pago.
              </p>
            </div>
          )}

          {sale && (
            <div className="space-y-5">
              {/* Folio info */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Comprobante de Venta
                  </span>
                  <span className="text-lg font-black text-slate-900 font-mono">
                    Folio: {sale.folio || `VTA-${String(sale.id).slice(-6)}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Ubicación en Sala
                  </span>
                  <span className="text-sm font-black text-indigo-700">
                    Mesa {sale.table?.number ?? selected?.tableNumber ?? '-'}
                  </span>
                </div>
              </div>

              {/* Consumed Items */}
              <div>
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2.5">
                  Artículos Consumidos
                </h3>
                {(() => {
                  const grouped = (sale.orders ?? [])
                    .flatMap((o: any) => o.items ?? [])
                    .reduce((acc: Record<string, { qty: number; price: number }>, it: any) => {
                      const key = it.recipe;
                      if (!acc[key]) acc[key] = { qty: 0, price: it.price };
                      acc[key].qty += it.quantity;
                      return acc;
                    }, {});
                  const keys = Object.keys(grouped);
                  return keys.length ? (
                    <div className="divide-y divide-slate-100 border border-slate-200/90 rounded-2xl overflow-hidden bg-slate-50/50">
                      {keys.map((name) => {
                        const { qty, price } = grouped[name];
                        return (
                          <div key={name} className="flex justify-between items-center px-4 py-3 text-xs text-slate-800">
                            <span className="font-medium">
                              <strong className="text-slate-900 font-black text-sm">{qty}×</strong> {name}
                            </span>
                            <span className="font-black text-sm text-slate-900">${(qty * price).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 py-3">Sin platillos registrados.</div>
                  );
                })()}
              </div>

              {/* Promotions Box */}
              <div className="rounded-2xl border border-amber-200/90 bg-amber-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                    <AppIcon name="zap" size={16} className="text-amber-600" />
                    <span>Promociones y Descuentos Vigentes Hoy</span>
                  </div>
                  {calculatingPromo && <span className="text-[11px] text-amber-700 animate-pulse font-bold">Calculando…</span>}
                </div>

                {promotions.length === 0 ? (
                  <p className="text-xs text-slate-500">No hay promociones programadas para hoy.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPromotion(null)}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition active:scale-95 ${
                        !selectedPromo
                          ? 'bg-slate-900 text-white border-slate-900 shadow-soft-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Sin promoción
                    </button>
                    {promotions.map((p) => {
                      const isSel = selectedPromo?.id === p.id || (selectedPromo as any)?._id === (p as any)._id;
                      return (
                        <button
                          key={p.id || (p as any)._id}
                          type="button"
                          onClick={() => handleApplyPromotion(p)}
                          className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black border transition flex items-center gap-1.5 active:scale-95 ${
                            isSel
                              ? 'bg-amber-600 text-white border-amber-600 shadow-soft-xs'
                              : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100/60'
                          }`}
                        >
                          <span>{p.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">
                            {p.type === 'two_for_one' ? '2x1' : p.type === 'percentage_discount' ? `${p.discountValue}%` : `$${p.discountValue}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {promoCalculation && promoCalculation.discountAmount > 0 && (
                  <div className="bg-emerald-50/70 rounded-2xl p-3.5 border border-emerald-200/90 text-xs space-y-1.5 shadow-soft-xs">
                    <div className="flex justify-between font-black text-emerald-800 text-sm">
                      <span className="flex items-center gap-1.5">
                        <AppIcon name="sparkles" size={15} className="text-emerald-600" />
                        <span>Descuento Verificado ({selectedPromo?.name}):</span>
                      </span>
                      <span>-${promoCalculation.discountAmount.toFixed(2)}</span>
                    </div>
                    {promoCalculation.rule && (
                      <div className="text-[11px] text-emerald-900/80 font-medium">
                        <span className="font-bold">Regla: </span>
                        {promoCalculation.rule}
                      </div>
                    )}
                    {promoCalculation.eligibleUnitsCount !== undefined && (
                      <div className="text-[11px] text-slate-600">
                        <span className="font-bold text-slate-500">Artículos participantes: </span>
                        {promoCalculation.eligibleUnitsCount} unidades (Subtotal: ${promoCalculation.eligibleSubtotal?.toFixed(2)})
                      </div>
                    )}
                    {promoCalculation.benefitedItems.length > 0 && (
                      <div className="text-[11px] text-slate-700 bg-white/80 p-2 rounded-xl border border-emerald-100">
                        <span className="font-bold text-slate-500 block mb-0.5">Detalle de bonificación:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                          {promoCalculation.benefitedItems.map((itemStr, idx) => (
                            <li key={idx}>{itemStr}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Totals Breakdown */}
              <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>Subtotal consumo:</span>
                  <span className="font-semibold text-slate-900">${Number(sale.totalAmount || 0).toFixed(2)}</span>
                </div>
                {promoCalculation && promoCalculation.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold text-sm">
                    <span>Descuento aplicado:</span>
                    <span>-${promoCalculation.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                  <span className="text-base font-black text-slate-900">Total a Cobrar:</span>
                  <span className="text-3xl font-black text-emerald-600 tracking-tight">
                    ${(promoCalculation ? promoCalculation.finalTotal : Number(sale.totalAmount || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Order Type & Payment Method Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1.5">Tipo de orden</span>
                  <select
                    className="w-full min-h-[46px] border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-soft-xs"
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as OrderType)}
                  >
                    <option value="local">Para comer aquí</option>
                    <option value="para llevar">Para llevar</option>
                    <option value="evento">Evento</option>
                    <option value="domicilio">A domicilio</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1.5">Método de pago</span>
                  <select
                    className="w-full min-h-[46px] border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-soft-xs"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="tarjeta">💳 Tarjeta de Crédito/Débito</option>
                    <option value="transferencia">🏦 Transferencia Bancaria</option>
                  </select>
                </label>
              </div>

              {/* Bottom Action Buttons (Print Ticket & Confirm Payment) */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-slate-200">
                <button
                  onClick={printTicket}
                  disabled={printing || sale.ticketStatus === 'printed'}
                  className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-black disabled:opacity-50 transition-all shadow-soft-xs inline-flex items-center justify-center gap-2 active:scale-95"
                >
                  {printing ? (
                    'Imprimiendo…'
                  ) : sale.ticketStatus === 'printed' ? (
                    <>
                      <AppIcon name="check" size={16} />
                      <span>Ticket ya Impreso</span>
                    </>
                  ) : (
                    <>
                      <AppIcon name="print" size={16} />
                      <span>Imprimir Ticket</span>
                    </>
                  )}
                </button>

                <button
                  onClick={confirmPayment}
                  disabled={paying}
                  className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black disabled:opacity-50 transition-all shadow-soft-sm hover:shadow-soft-md inline-flex items-center justify-center gap-2 active:scale-95"
                >
                  {paying ? (
                    'Procesando cobro…'
                  ) : (
                    <>
                      <AppIcon name="card" size={16} />
                      <span>Registrar Pago y Cerrar Cuenta</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
