'use client';

import { useEffect, useState } from "react";
import type { SaleData } from "@/types";
import { getUnpaidSaleByTable, paySale, getSaleById } from "@/services/SaleService";
import type { Props, OrderType, PaymentMethod } from "@/types/Waiter/waiter.types";

export default function ChargeModal({ tableId, onClose, onPaid }: Props) {
  const [sale, setSale] = useState<SaleData | null>(null);
  const [orderType, setOrderType] = useState<OrderType>('local');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const s = await getUnpaidSaleByTable(tableId);
        if (s?.id) {
          const full = await getSaleById(s.id);
          setSale(full ?? s);
          setError("");
        } else {
          setSale(null);
          setError("No hay venta abierta (unpaid) para esta mesa.");
        }
      } catch (e) {
        console.error(e);
        setError("Error al cargar la venta");
      } finally {
        setLoading(false);
      }
    })();
  }, [tableId]);

  const confirmPayment = async () => {
    if (!sale?.id) {
      setError("No hay venta que pagar.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await paySale(sale.id, { orderType, paymentMethod });
      onPaid();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;
  if (!sale) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white text-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
          <h3 className="text-lg font-bold mb-2 text-slate-900">Cobrar</h3>
          <p className="text-sm text-rose-600">{error || "No hay venta abierta"}</p>
          <div className="mt-4 text-right">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-100">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-slate-900">Cobrar — Folio {sale.folio}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
            &times;
          </button>
        </div>

        {(() => {
          const grouped = (sale.orders ?? [])
            .flatMap((o) => o.items ?? [])
            .reduce((acc, it) => {
              const key = it.recipe;
              if (!acc[key]) acc[key] = { qty: 0, price: it.price };
              acc[key].qty += it.quantity;
              return acc;
            }, {} as Record<string, { qty: number; price: number }>);

          const keys = Object.keys(grouped);
          if (!keys.length) return <div className="mt-2 text-xs text-slate-500">No hay items.</div>;

          return (
            <ul className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1 border rounded-lg p-2.5 bg-slate-50">
              {keys.map((name) => {
                const { qty, price } = grouped[name];
                return (
                  <li key={name} className="flex justify-between text-xs text-slate-700">
                    <span>
                      <strong className="text-slate-900">{qty}×</strong> {name}
                    </span>
                    <span className="font-semibold">${(qty * price).toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>
          );
        })()}

        <div className="space-y-3 mt-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-semibold text-slate-600 mb-1">Tipo de orden</span>
              <select
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as OrderType)}
              >
                <option value="local">Local</option>
                <option value="para llevar">Para llevar</option>
                <option value="evento">Evento</option>
                <option value="domicilio">Domicilio</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-slate-600 mb-1">Método de pago</span>
              <select
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </label>
          </div>

          <div className="pt-2 flex justify-between items-center border-t text-base font-bold text-slate-900">
            <span>Total a pagar:</span>
            <span className="text-xl text-indigo-700">${sale.totalAmount?.toFixed?.(2) ?? "0.00"}</span>
          </div>

          {error && <div className="text-xs text-rose-600">{error}</div>}
        </div>

        <div className="mt-5 flex justify-end gap-2.5 pt-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            disabled={submitting}
            onClick={confirmPayment}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            {submitting ? "Procesando…" : "Confirmar pago"}
          </button>
        </div>
      </div>
    </div>
  );
}
