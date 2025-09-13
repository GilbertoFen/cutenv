import { useEffect, useState } from "react";
import type { SaleData } from "../../types";
import { getUnpaidSaleByTable, paySale, getSaleById } from "../../services/SaleService";
import type { Props, OrderType, PaymentMethod } from "../../types/Waiter/waiter.types";

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
          const full = await getSaleById(s.id); // <-- asegura orders poblados
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
    if (!sale?.id) { setError("No hay venta que pagar."); return; }
    setSubmitting(true);
    setError("");
    try {
      await paySale(sale.id, { orderType, paymentMethod });
      onPaid();        // refresca mesa y cierra en el padre
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;
  if (!sale) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="bg-white text-black rounded p-4 w-full max-w-md">
          <h3 className="text-lg font-bold mb-2">Cobrar</h3>
          <p className="text-sm text-red-600">{error || "No hay venta abierta"}</p>
          <div className="mt-3 text-right">
            <button onClick={onClose} className="px-3 py-1 rounded border">Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white text-black rounded p-4 w-full max-w-md">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">Cobrar — Folio {sale.folio}</h3>
          <button onClick={onClose} className="text-xl font-bold">&times;</button>
        </div>
        {(() => {
          const grouped = (sale.orders ?? [])
            .flatMap(o => o.items ?? [])
            .reduce((acc, it) => {
              const key = it.recipe;
              if (!acc[key]) acc[key] = { qty: 0, price: it.price };
              acc[key].qty += it.quantity;
              return acc;
            }, {} as Record<string, { qty: number; price: number }>);

          const keys = Object.keys(grouped);
          if (!keys.length) return <div className="mt-2 text-xs text-gray-500">No hay items.</div>;

          return (
            <ul className="mt-2 list-disc pl-5">
              {keys.map(name => {
                const { qty, price } = grouped[name];
                return (
                  <li key={name} className="flex justify-between text-sm">
                    <span>{qty} × {name}</span>
                    <span>${(qty * price).toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>
          );
        })()}

        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="block text-gray-600 mb-1">Tipo de orden</span>
              <select className="w-full border rounded px-2 py-1"
                value={orderType} onChange={e => setOrderType(e.target.value as OrderType)}>
                <option value="local">Local</option>
                <option value="para llevar">Para llevar</option>
                <option value="evento">Evento</option>
                <option value="domicilio">Domicilio</option>
              </select>
            </label>
            <label className="flex-1">
              <span className="block text-gray-600 mb-1">Método de pago</span>
              <select className="w-full border rounded px-2 py-1"
                value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </label>
          </div>

          <div className="mt-2 text-right font-bold text-lg">
            Total: ${sale.totalAmount?.toFixed?.(2) ?? "0.00"}
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded border">Cancelar</button>
          <button disabled={submitting}
            onClick={confirmPayment}
            className="px-3 py-1 rounded bg-green-600 text-white">
            {submitting ? "Procesando…" : "Confirmar pago"}
          </button>
        </div>
      </div>
    </div>
  );
}
