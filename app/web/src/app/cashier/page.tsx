'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCashierSocket } from '@/gateways/cashierSocket';
import { getSaleById, paySale, markPrinted, getTicketQueue } from '@/services/SaleService';
import { getValidPromotionsToday, calculatePromotionDiscount } from '@/services/PromotionService';
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
    if (!promo || !sale) {
      setPromoCalculation(null);
      return;
    }

    try {
      setCalculatingPromo(true);
      const flatItems = (sale.orders ?? []).flatMap((o: any) =>
        (o.items ?? []).map((it: any) => ({
          recipeId: it.recipeId || (it as any).id,
          recipeName: it.recipe,
          category: it.category,
          price: it.price || 0,
          quantity: it.quantity || 1,
        }))
      );

      const res = await calculatePromotionDiscount(
        promo.id || (promo as any)._id,
        flatItems,
        sale.totalAmount || 0
      );

      setPromoCalculation({
        discountAmount: res.discountAmount,
        benefitedItems: res.benefitedItems,
        finalTotal: res.finalTotal,
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
        discountAmount: promoCalculation?.discountAmount || 0,
        promotionApplied: selectedPromo
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Módulo de Caja y Cobros</h1>
          <p className="text-sm text-slate-500">Gestión de tickets, impresión y registro de pagos</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/worker"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-slate-700 rounded-lg transition"
            title="Volver a los 4 módulos operativos"
          >
            <AppIcon name="arrow-left" size={13} />
            <span>Volver al inicio de trabajador</span>
          </Link>
          <div className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-semibold">
            Cola activa: {queue.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cola de tickets */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-bold text-sm text-slate-800 mb-3 flex items-center justify-between">
            <span>Tickets pendientes</span>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
              {queue.length}
            </span>
          </h2>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {queue.map((ticket) => {
              const isSelected = selected?.saleId === ticket.saleId;
              return (
                <button
                  key={ticket.saleId}
                  onClick={() => setSelected(ticket)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                    <span>Venta #{String(ticket.saleId).slice(-6)}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Mesa {ticket.tableNumber ?? '-'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Solicitado:{' '}
                    {ticket.requestedAt ? new Date(ticket.requestedAt).toLocaleTimeString() : '—'}
                  </div>
                </button>
              );
            })}
            {!queue.length && (
              <div className="text-xs text-slate-400 py-10 text-center">
                Sin tickets pendientes de cobro.
              </div>
            )}
          </div>
        </div>

        {/* Detalle */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-bold text-sm text-slate-800 mb-4">Detalle de la Cuenta</h2>
          {!sale && (
            <div className="text-center py-16 text-slate-400 text-sm">
              Seleccione un ticket de la columna izquierda para visualizar el detalle y procesar el cobro.
            </div>
          )}
          {sale && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <div className="font-bold text-lg text-slate-900">Folio: {sale.folio}</div>
                  <div className="text-xs text-slate-500">
                    Mesa {sale.table?.number ?? selected?.tableNumber ?? '-'}
                  </div>
                </div>
                <div className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                  sale.ticketStatus === 'printed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  Ticket: {sale.ticketStatus === 'printed' ? 'Impreso' : 'Por imprimir'}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Artículos consumidos</h3>
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
                    <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      {keys.map((name) => {
                        const { qty, price } = grouped[name];
                        return (
                          <li key={name} className="flex justify-between px-3 py-2 text-xs text-slate-800">
                            <span>
                              <strong className="text-slate-900">{qty}×</strong> {name}
                            </span>
                            <span className="font-bold">${(qty * price).toFixed(2)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-xs text-slate-400 py-3">Sin platillos registrados.</div>
                  );
                })()}
              </div>

              {/* Sección de Promociones Aplicables */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AppIcon name="zap" size={14} className="text-amber-600" />
                    <span>Promociones y Cupones Vigentes Hoy</span>
                  </div>
                  {calculatingPromo && <span className="text-[10px] text-amber-700 animate-pulse">Calculando…</span>}
                </div>

                {promotions.length === 0 ? (
                  <p className="text-xs text-slate-500">No hay promociones programadas vigentes para el día de hoy.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPromotion(null)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                        !selectedPromo
                          ? 'bg-slate-700 text-white border-slate-700'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
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
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                            isSel
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                              : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100/50'
                          }`}
                        >
                          <span>{p.name}</span>
                          <span className="text-[10px] opacity-80">
                            {p.type === 'two_for_one' ? '2x1' : p.type === 'percentage_discount' ? `${p.discountValue}%` : `$${p.discountValue}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {promoCalculation && promoCalculation.discountAmount > 0 && (
                  <div className="bg-white rounded-lg p-2.5 border border-amber-200 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Descuento aplicado ({selectedPromo?.name}):</span>
                      <span>-${promoCalculation.discountAmount.toFixed(2)}</span>
                    </div>
                    {promoCalculation.benefitedItems.length > 0 && (
                      <div className="text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-500">Beneficios: </span>
                        {promoCalculation.benefitedItems.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Totales */}
              <div className="pt-2 border-t space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>${Number(sale.totalAmount || 0).toFixed(2)}</span>
                </div>
                {promoCalculation && promoCalculation.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Descuento Promoción:</span>
                    <span>-${promoCalculation.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t text-base font-bold text-slate-900">
                  <span>Total a Cobrar:</span>
                  <span className="text-2xl text-indigo-700">
                    ${(promoCalculation ? promoCalculation.finalTotal : Number(sale.totalAmount || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="block">
                  <span className="block text-xs font-semibold text-slate-600 mb-1">Tipo de orden</span>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
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
                  <span className="block text-xs font-semibold text-slate-600 mb-1">Método de pago</span>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </label>
              </div>

              <div className="mt-6 flex gap-3 justify-end pt-3 border-t">
                <button
                  onClick={printTicket}
                  disabled={printing || sale.ticketStatus === 'printed'}
                  className="px-4 py-2 rounded-lg bg-[#14144f] hover:bg-[#1f1f6d] text-white text-xs font-bold disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                >
                  {printing ? (
                    'Imprimiendo…'
                  ) : sale.ticketStatus === 'printed' ? (
                    <>
                      <AppIcon name="check" size={14} />
                      <span>Ticket Impreso</span>
                    </>
                  ) : (
                    <>
                      <AppIcon name="print" size={14} />
                      <span>Imprimir Ticket</span>
                    </>
                  )}
                </button>

                <button
                  onClick={confirmPayment}
                  disabled={paying}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 transition-colors shadow-sm inline-flex items-center gap-1.5"
                >
                  {paying ? (
                    'Procesando pago…'
                  ) : (
                    <>
                      <AppIcon name="card" size={14} />
                      <span>Registrar Pago</span>
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
