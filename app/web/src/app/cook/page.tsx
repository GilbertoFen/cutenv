'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { markReadyOrders, updateOrderItemStatus, callWaiterForDish, dismissWaiterCall } from '@/services/OrderService';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import { AppIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import Modal from '@/components/UI/Modal';

export default function CookPage() {
  const router = useRouter();
  const { hasWorkerAccess, loading: authLoading } = useAuth();
  const { notify } = useNotification();
  const { orders, setOrders } = useKitchenOrders();
  const [updating, setUpdating] = useState<string | null>(null);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [stationFilter, setStationFilter] = useState<'all' | 'fria' | 'caliente'>('all');

  const coldOrdersCount = useMemo(() => {
    return orders.filter((o) => (o.recipes || []).some((r: any) => (r.station || '').toLowerCase() === 'fria')).length;
  }, [orders]);

  const hotOrdersCount = useMemo(() => {
    return orders.filter((o) => (o.recipes || []).some((r: any) => (r.station || '').toLowerCase() === 'caliente')).length;
  }, [orders]);

  const displayedOrders = useMemo(() => {
    return orders
      .map((order) => {
        const visibleRecipes = (order.recipes || []).filter((r: any) => {
          if (stationFilter === 'all') return true;
          const s = (r.station || '').toLowerCase();
          if (stationFilter === 'fria') return s === 'fria';
          if (stationFilter === 'caliente') return s === 'caliente';
          return false;
        });
        return {
          order,
          visibleRecipes,
        };
      })
      .filter(({ visibleRecipes }) => visibleRecipes.length > 0);
  }, [orders, stationFilter]);

  // Modal para llamar al mesero
  const [callingWaiterItem, setCallingWaiterItem] = useState<{
    orderId: string;
    itemId: string;
    dishName: string;
    tableNumber: number;
  } | null>(null);
  const [callReason, setCallReason] = useState<'ready' | 'unavailable' | 'issue' | 'other'>('ready');
  const [callMessage, setCallMessage] = useState('');
  const [sendingCall, setSendingCall] = useState(false);

  useEffect(() => {
    if (!authLoading && !hasWorkerAccess) {
      router.replace('/worker');
    }
  }, [hasWorkerAccess, authLoading, router]);

  const handleReady = async (id: string) => {
    try {
      setUpdating(id);
      await markReadyOrders(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
      notify.success('Orden completa marcada como lista para servir.');
    } catch (err: any) {
      notify.error(err?.message || 'Error al marcar orden como lista');
    } finally {
      setUpdating(null);
    }
  };

  const handleItemReady = async (orderId: string, itemId: string) => {
    try {
      setUpdatingItem(itemId);
      await updateOrderItemStatus(orderId, itemId, 'ready');
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const updatedRecipes = o.recipes.map((r: any) =>
            (r.itemId === itemId || r.id === itemId) ? { ...r, status: 'ready' } : r
          );
          const active = updatedRecipes.filter((r: any) => r.status !== 'cancelled');
          const allReady = active.length > 0 && active.every((r: any) => r.status === 'ready' || r.status === 'delivered');
          return {
            ...o,
            status: allReady ? 'ready' : o.status,
            recipes: updatedRecipes,
          };
        })
      );
      notify.success('Platillo marcado como listo.');
    } catch (err: any) {
      console.error('Error al marcar platillo como listo:', err);
      notify.error(err?.message || 'Error al marcar platillo como listo');
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleSendCallWaiter = async () => {
    if (!callingWaiterItem) return;
    try {
      setSendingCall(true);
      await callWaiterForDish(callingWaiterItem.orderId, callingWaiterItem.itemId, {
        reason: callReason,
        message: callMessage.trim(),
      });
      // Actualizar estado local
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== callingWaiterItem.orderId) return o;
          return {
            ...o,
            recipes: o.recipes.map((r: any) => {
              if (r.itemId === callingWaiterItem.itemId || r.id === callingWaiterItem.itemId) {
                return {
                  ...r,
                  callWaiter: {
                    requested: true,
                    reason: callReason,
                    message: callMessage.trim(),
                    requestedAt: new Date(),
                    resolved: false,
                  },
                };
              }
              return r;
            }),
          };
        })
      );
      const reasonLabels = {
        ready: 'Platillo listo para recoger',
        unavailable: 'Platillo no disponible',
        issue: 'Problema en preparación',
        other: 'Atención requerida',
      };
      notify.success(`Aviso enviado al mesero de la Mesa ${callingWaiterItem.tableNumber} (${reasonLabels[callReason]}).`);
      setCallingWaiterItem(null);
      setCallMessage('');
    } catch (err: any) {
      notify.error(err?.message || 'Error al llamar al mesero');
    } finally {
      setSendingCall(false);
    }
  };

  const handleDismissCall = async (orderId: string, itemId: string) => {
    try {
      await dismissWaiterCall(orderId, itemId);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            recipes: o.recipes.map((r: any) => {
              if (r.itemId === itemId || r.id === itemId) {
                return {
                  ...r,
                  callWaiter: { ...r.callWaiter, requested: false, resolved: true },
                };
              }
              return r;
            }),
          };
        })
      );
      notify.info('Llamado descartado');
    } catch (err: any) {
      notify.error(err?.message || 'Error al descartar llamado');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Validando credenciales de cocina…
        </div>
      </div>
    );
  }

  if (!hasWorkerAccess) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-soft-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Área de Preparación
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Cocina
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Comandas activas para preparación. Marca los platillos listos para que el personal de sala los entregue a la mesa.
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
          <div className="min-h-[44px] bg-emerald-50 text-emerald-800 px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 border border-emerald-200 shadow-soft-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>En cola: {orders.length} comandas</span>
          </div>
        </div>
      </div>

      {/* Selector rápido de estaciones de cocina */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-soft-xs">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-2">
          Estación:
        </span>
        <button
          type="button"
          onClick={() => setStationFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 active:scale-95 ${stationFilter === 'all'
            ? 'bg-slate-900 text-white shadow-soft-xs'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
        >
          <span>Todas</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${stationFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-white text-slate-700'
            }`}>
            {orders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStationFilter('fria')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 active:scale-95 ${stationFilter === 'fria'
            ? 'bg-sky-600 text-white shadow-soft-xs ring-2 ring-sky-300'
            : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
            }`}
        >
          <AppIcon name="frozen" size={14} className={stationFilter === 'fria' ? 'text-white' : 'text-sky-700'} />
          <span>Cocina Fría</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${stationFilter === 'fria' ? 'bg-sky-700 text-white' : 'bg-sky-200 text-sky-900'
            }`}>
            {coldOrdersCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStationFilter('caliente')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 active:scale-95 ${stationFilter === 'caliente'
            ? 'bg-amber-600 text-white shadow-soft-xs ring-2 ring-amber-300'
            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
        >
          <AppIcon name="flame" size={14} className={stationFilter === 'caliente' ? 'text-white' : 'text-amber-700'} />
          <span>Cocina Caliente</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${stationFilter === 'caliente' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
            }`}>
            {hotOrdersCount}
          </span>
        </button>
      </div>

      {/* High-visibility Kitchen Cards Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 items-start">
        {displayedOrders.map(({ order, visibleRecipes }) => {
          const activeRecipes = (order.recipes || []).filter((r: any) => r.status !== 'cancelled');
          const readyCount = activeRecipes.filter((r: any) => r.status === 'ready' || r.status === 'delivered').length;
          const isFullyReady = activeRecipes.length > 0 && readyCount === activeRecipes.length;
          const hasCold = activeRecipes.some((r: any) => r.station === 'fria');
          const hasHot = activeRecipes.some((r: any) => r.station === 'caliente');
          const visibleActive = visibleRecipes.filter((r: any) => r.status !== 'cancelled');
          const visibleReadyCount = visibleActive.filter((r: any) => r.status === 'ready' || r.status === 'delivered').length;

          return (
            <div
              key={order.id}
              className={`bg-white p-5 sm:p-6 rounded-3xl border transition-all flex flex-col justify-between ${isFullyReady
                ? 'border-emerald-300 ring-2 ring-emerald-300/50 shadow-soft-md'
                : 'border-slate-200/90 shadow-soft-xs hover:shadow-soft-md'
                }`}
            >
              <div>
                {/* Order Card Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0">
                      #{String(order.id).slice(-4)}
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Mesa {order.tableNumber ?? 'S/N'}
                      </h2>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {hasCold && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-1">
                            <AppIcon name="frozen" size={11} className="text-sky-700" />
                            <span>COCINA FRÍA</span>
                          </span>
                        )}
                        {hasHot && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <AppIcon name="flame" size={11} className="text-amber-700" />
                            <span>COCINA CALIENTE</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 block mt-0.5">
                        {stationFilter === 'all'
                          ? `${readyCount} de ${activeRecipes.length} platillos listos`
                          : `${visibleReadyCount} de ${visibleActive.length} platillos listos en esta estación (${readyCount} de ${activeRecipes.length} en total)`}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 ${isFullyReady
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isFullyReady ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'
                        }`}
                    ></span>
                    <span>{isFullyReady ? 'Listo para servir' : 'En cocina'}</span>
                  </span>
                </div>

                {/* Dishes List */}
                <ul className="space-y-3 mb-5">
                  {visibleRecipes.map((item: any, index: number) => {
                    const isItemReady = item.status === 'ready';
                    const isItemDelivered = item.status === 'delivered';
                    const isItemCancelled = item.status === 'cancelled';
                    const itemId = item.itemId || item.id;
                    const isExplicitCall =
                      Boolean(item.callWaiter?.requested) &&
                      (
                        Boolean((item.callWaiter as any)?.isExplicitCall) ||
                        item.callWaiter?.reason !== 'ready' ||
                        (Boolean(item.callWaiter?.message) && item.callWaiter.message !== 'Platillo listo para entregar')
                      );
                    const hasCall = isExplicitCall;

                    return (
                      <li
                        key={index}
                        className={`flex flex-col gap-2 p-3 rounded-2xl border transition-all ${isItemCancelled
                          ? 'bg-slate-50 border-slate-200 opacity-50'
                          : isItemDelivered
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : isItemReady
                              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-300/40'
                              : hasCall
                                ? 'bg-amber-50/80 border-amber-300 shadow-soft-xs'
                                : 'bg-white border-slate-200/90 shadow-soft-xs'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                                <AppIcon name="utensils" size={18} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p
                                className={`font-black text-sm text-slate-900 truncate ${isItemCancelled ? 'line-through text-slate-400' : ''
                                  }`}
                              >
                                {item.name}
                              </p>
                              {item.description && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                  Cant: {item.quantity}
                                </span>
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${item.station === 'fria'
                                    ? 'bg-sky-50 text-sky-700 border-sky-300'
                                    : item.station === 'caliente'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                >
                                  {item.station === 'fria' && (
                                    <>
                                      <AppIcon name="frozen" size={11} className="text-sky-600" />
                                      <span>Fría</span>
                                    </>
                                  )}
                                  {item.station === 'caliente' && (
                                    <>
                                      <AppIcon name="flame" size={11} className="text-amber-600" />
                                      <span>Caliente</span>
                                    </>
                                  )}
                                  {(!item.station || item.station === 'ninguna') && (
                                    <>
                                      <AppIcon name="coffee" size={11} className="text-slate-500" />
                                      <span>Sin cocina</span>
                                    </>
                                  )}
                                </span>
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isItemCancelled
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : isItemDelivered
                                      ? 'bg-slate-200 text-slate-600'
                                      : isItemReady
                                        ? 'bg-emerald-600 text-white'
                                        : item.status === 'pending'
                                          ? 'bg-sky-100 text-sky-800'
                                          : 'bg-amber-100 text-amber-800'
                                    }`}
                                >
                                  {isItemCancelled
                                    ? 'Cancelado'
                                    : isItemDelivered
                                      ? 'Entregado'
                                      : isItemReady
                                        ? '✓ ¡Listo!'
                                        : item.status === 'pending'
                                          ? 'Pendiente'
                                          : 'Preparando'}
                                </span>
                              </div>
                              {item.notes && (
                                <p className="text-[11px] text-amber-900 italic mt-1 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Nota: {item.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons for Cook */}
                          {!isItemCancelled && !isItemDelivered && itemId && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setCallingWaiterItem({
                                    orderId: order.id,
                                    itemId,
                                    dishName: item.name,
                                    tableNumber: order.tableNumber || 0,
                                  })
                                }
                                className={`min-h-[40px] px-2.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 active:scale-95 ${hasCall
                                  ? 'bg-amber-500 text-white shadow-soft-xs'
                                  : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200'
                                  }`}
                                title="Llamar al mesero para este platillo"
                              >
                                <AppIcon name="bell" size={13} />
                                <span className="hidden sm:inline">Mesero</span>
                              </button>

                              {!isItemReady && (
                                <button
                                  type="button"
                                  onClick={() => handleItemReady(order.id, itemId)}
                                  disabled={updatingItem === itemId}
                                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-soft-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                  title="Marcar este platillo individualmente como listo"
                                >
                                  <AppIcon name="check" size={14} />
                                  <span>{updatingItem === itemId ? '…' : 'Listo'}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Active Call Alert Badge on Item */}
                        {hasCall && item.callWaiter && (
                          <div className="flex items-center justify-between bg-amber-100/80 border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-amber-900 font-semibold">
                            <div className="flex items-center gap-1.5">
                              <AppIcon name="bell" size={14} className="text-amber-700" />
                              <span>
                                {item.callWaiter.reason === 'ready' && 'Aviso enviado: Platillo listo para recoger'}
                                {item.callWaiter.reason === 'unavailable' && 'Aviso enviado: Platillo no disponible'}
                                {item.callWaiter.reason === 'issue' && 'Aviso enviado: Problema en preparación'}
                                {item.callWaiter.reason === 'other' && 'Aviso enviado: Atención requerida'}
                                {item.callWaiter.message && ` — "${item.callWaiter.message}"`}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDismissCall(order.id, itemId)}
                              className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline ml-2"
                            >
                              Descartar
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* Highly legible notes banner for cooks */}
                {order.notes && (
                  <div className="bg-amber-50/90 border-2 border-amber-300 text-amber-950 p-3.5 mb-5 rounded-2xl text-xs sm:text-sm font-semibold flex items-start gap-2 shadow-soft-xs">
                    <AppIcon name="warning" size={16} className="text-amber-700 mt-0.5 shrink-0" />
                    <div>
                      <strong className="font-extrabold text-amber-900">Nota de comanda:</strong> {order.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Big Primary Action Button (min 48px height) */}
              <button
                onClick={() => handleReady(order.id)}
                disabled={updating === order.id}
                className="w-full min-h-[50px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-2xl font-black text-sm sm:text-base shadow-soft-sm hover:shadow-soft-md transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                {updating === order.id ? (
                  <span>Marcando comanda completa…</span>
                ) : (
                  <>
                    <AppIcon name="check" size={18} />
                    <span>Marcar Orden Completa como Lista</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal Llamar al Mesero */}
      <Modal
        open={Boolean(callingWaiterItem)}
        onClose={() => {
          setCallingWaiterItem(null);
          setCallMessage('');
        }}
        title="Llamar al Mesero"
        maxWidthClass="max-w-md"
      >
        {callingWaiterItem && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <p className="text-xs text-slate-500 font-medium">Platillo y Mesa:</p>
              <p className="font-black text-base text-slate-900">{callingWaiterItem.dishName}</p>
              <p className="text-xs font-bold text-indigo-700 mt-0.5">Mesa {callingWaiterItem.tableNumber}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Motivo de la llamada:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'ready', label: 'Platillo listo', desc: 'Recoger y servir', icon: 'utensils' as const },
                  { id: 'unavailable', label: 'No disponible', desc: 'Ingrediente agotado', icon: 'warning' as const },
                  { id: 'issue', label: 'Problema cocina', desc: 'Duda o demora', icon: 'info' as const },
                  { id: 'other', label: 'Otra observación', desc: 'Mensaje libre', icon: 'bell' as const },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCallReason(opt.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${callReason === opt.id
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-200'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                  >
                    <p className="font-bold text-xs flex items-center gap-1.5">
                      <AppIcon name={opt.icon} size={13} className="shrink-0" />
                      <span>{opt.label}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detalle u observación adicional (opcional):
              </label>
              <textarea
                value={callMessage}
                onChange={(e) => setCallMessage(e.target.value)}
                placeholder="Ej. El comensal pidió término medio pero salió 3/4, o ya no hay aguacate…"
                rows={2}
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCallingWaiterItem(null);
                  setCallMessage('');
                }}
                disabled={sendingCall}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendCallWaiter}
                disabled={sendingCall}
                className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-soft-xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <AppIcon name="bell" size={14} />
                <span>{sendingCall ? 'Notificando…' : 'Enviar aviso al mesero'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="text-center py-20 px-6 bg-white rounded-3xl border border-dashed border-slate-200 shadow-soft-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-3">
            <AppIcon name="cooking" size={36} />
          </div>
          <h3 className="text-lg font-black text-slate-800">No hay órdenes pendientes por preparar</h3>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
            Las nuevas comandas tomadas por los meseros aparecerán aquí automáticamente en tiempo real.
          </p>
        </div>
      )}
    </div>
  );
}
