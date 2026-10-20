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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Órdenes en Preparación</h1>
          <p className="text-sm text-slate-500">Monitor de cocina en tiempo real sincronizado vía WebSocket</p>
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
          <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>En vivo ({orders.length})</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white p-5 shadow-sm hover:shadow-md transition-shadow rounded-xl border border-slate-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Mesa {order.tableNumber ?? 'S/N'}</h2>
                <span className="text-xs bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded">
                  En preparación
                </span>
              </div>
              <ul className="space-y-2.5 mb-4">
                {order.recipes.map((item: any, index: number) => {
                  const isItemReady = item.status === 'ready';
                  const isItemDelivered = item.status === 'delivered';
                  const itemId = item.itemId || item.id;
                  return (
                    <li
                      key={index}
                      className={`flex items-center justify-between gap-3 p-2 rounded-xl border ${
                        isItemReady
                          ? 'bg-emerald-50/60 border-emerald-300'
                          : isItemDelivered
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-[10px] shrink-0">
                            Sin foto
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-slate-800 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-500">Cant: <strong className="text-slate-800">{item.quantity}</strong></span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isItemDelivered
                                  ? 'bg-slate-200 text-slate-600'
                                  : isItemReady
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isItemDelivered ? 'Entregado' : isItemReady ? '¡Listo!' : 'En preparación'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!isItemReady && !isItemDelivered && itemId && (
                        <button
                          onClick={() => handleItemReady(order.id, itemId)}
                          disabled={updatingItem === itemId}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1 shrink-0 disabled:opacity-50"
                          title="Marcar solo este platillo como listo"
                        >
                          <AppIcon name="check" size={12} />
                          <span>{updatingItem === itemId ? '...' : 'Listo'}</span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {order.notes && (
                <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-2.5 mb-4 rounded text-xs">
                  <strong>Nota:</strong> {order.notes}
                </div>
              )}
            </div>

            <button
              onClick={() => handleReady(order.id)}
              disabled={updating === order.id}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg w-full font-bold text-sm shadow transition-colors flex items-center justify-center gap-2"
            >
              {updating === order.id ? (
                'Marcando...'
              ) : (
                <>
                  <AppIcon name="check" size={16} />
                  <span>Marcar como lista</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <AppIcon name="cooking" size={44} className="mx-auto mb-2 text-slate-300" />
          <p className="text-slate-500 text-base font-medium">No hay órdenes pendientes por preparar</p>
          <p className="text-slate-400 text-xs mt-1">Las nuevas comandas aparecerán automáticamente aquí al emitirse.</p>
        </div>
      )}
    </div>
  );
}
