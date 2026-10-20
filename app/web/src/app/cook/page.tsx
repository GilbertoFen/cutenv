'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { markReadyOrders, updateOrderItemStatus } from '@/services/OrderService';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import { AppIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';

export default function CookPage() {
  const router = useRouter();
  const { hasWorkerAccess, loading: authLoading } = useAuth();
  const { orders, setOrders } = useKitchenOrders();
  const [updating, setUpdating] = useState<string | null>(null);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

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
          const allReady = updatedRecipes.every((r: any) => r.status === 'ready' || r.status === 'delivered');
          return {
            ...o,
            status: allReady ? 'ready' : o.status,
            recipes: updatedRecipes,
          };
        })
      );
    } catch (err) {
      console.error('Error al marcar platillo como listo:', err);
    } finally {
      setUpdatingItem(null);
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
              Pantalla de Cocina • KDS en Tiempo Real
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Comandas en Preparación
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Sincronizado vía WebSocket. Marca platillos individuales o la comanda completa cuando esté lista para servir
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

      {/* High-visibility Kitchen Cards Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 items-start">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-soft-xs hover:shadow-soft-md transition-all flex flex-col justify-between"
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
                    <span className="text-[11px] font-semibold text-slate-400">
                      {order.recipes?.length || 0} platillos
                    </span>
                  </div>
                </div>

                <span className="text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>En cocina</span>
                </span>
              </div>

              {/* Dishes List */}
              <ul className="space-y-3 mb-5">
                {order.recipes.map((item: any, index: number) => {
                  const isItemReady = item.status === 'ready';
                  const isItemDelivered = item.status === 'delivered';
                  const itemId = item.itemId || item.id;
                  return (
                    <li
                      key={index}
                      className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                        isItemReady
                          ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-300/40'
                          : isItemDelivered
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200/90 shadow-soft-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs shrink-0">
                            🍽️
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-black text-sm text-slate-900 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                              Cant: {item.quantity}
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                isItemDelivered
                                  ? 'bg-slate-200 text-slate-600'
                                  : isItemReady
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isItemDelivered ? 'Entregado' : isItemReady ? '✓ ¡Listo!' : 'Preparando'}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-[11px] text-amber-800 italic mt-1 font-medium">Nota: {item.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* 44px Touch button to mark individual dish as ready */}
                      {!isItemReady && !isItemDelivered && itemId && (
                        <button
                          onClick={() => handleItemReady(order.id, itemId)}
                          disabled={updatingItem === itemId}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-soft-xs flex items-center gap-1.5 shrink-0 active:scale-95 disabled:opacity-50"
                          title="Marcar solo este platillo como listo"
                        >
                          <AppIcon name="check" size={14} />
                          <span>{updatingItem === itemId ? '…' : 'Listo'}</span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Highly legible notes banner for cooks */}
              {order.notes && (
                <div className="bg-amber-50/90 border-2 border-amber-300 text-amber-950 p-3.5 mb-5 rounded-2xl text-xs sm:text-sm font-semibold flex items-start gap-2 shadow-soft-xs">
                  <span className="text-base leading-none">⚠️</span>
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
        ))}
      </div>

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
