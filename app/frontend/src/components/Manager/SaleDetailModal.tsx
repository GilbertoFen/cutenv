import { useEffect, useState } from "react";
import { getSaleById } from "../../services/SaleService";
import type { SaleData } from "../../types";
import { Th, Td, Kpi, currency } from "../../utils/Manager/manager.functions";
type Props = {
  saleId: string;
  onClose: () => void;
};

export default function SaleDetailModal({ saleId, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState<SaleData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getSaleById(saleId)
      .then((data) => setSale(data))
      .catch((e) => setError(e?.message || "Error al cargar la venta"))
      .finally(() => setLoading(false));
  }, [saleId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold">Detalle de venta</h3>
          <button className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50" onClick={onClose}>
            Cerrar
          </button>
        </header>

        <div className="max-h-[70vh] overflow-auto p-4">
          {loading && <div className="text-sm text-gray-500">Cargando…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!loading && sale && (
            <div className="space-y-4">
              {/* Encabezado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Kpi label="Folio" value={sale.folio ?? "—"} />
                <Kpi label="Fecha" value={sale.date ? new Date(sale.date).toLocaleString() : "—"} />
                <Kpi label="Estado" value={sale.status ?? "—"} />
                <Kpi label="Total" value={currency(sale.totalAmount || 0)} />
              </div>

              {/* Órdenes */}
              <section>
                <div className="mb-2 text-sm font-semibold">Órdenes</div>
                {(sale.orders && sale.orders.length > 0) ? (
                  <div className="space-y-3">
                    {sale.orders.map((o: any, idx: number) => (
                      <div key={o.id || o._id || idx} className="rounded-xl border p-3">
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm">
                            <span className="font-medium">Mesa:</span>{" "}
                            {o.table?.number ?? o.tableNumber ?? "—"}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Total orden:</span>{" "}
                            {currency(o.total || 0)}
                          </div>
                        </div>

                        {Array.isArray(o.items) && o.items.length > 0 && (
                          <div className="overflow-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <Th>Platillo</Th>
                                  <Th>Cant.</Th>
                                  <Th>Precio</Th>
                                  <Th>Importe</Th>
                                </tr>
                              </thead>
                              <tbody>
                                {o.items.map((it: any, i: number) => (
                                  <tr key={i} className="border-t">
                                    <Td>{it.name ?? it.recipe?.name ?? "—"}</Td>
                                    <Td>{it.quantity ?? 1}</Td>
                                    <Td>{currency(it.price ?? it.recipe?.price ?? 0)}</Td>
                                    <Td>{currency((it.quantity ?? 1) * (it.price ?? it.recipe?.price ?? 0))}</Td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {o.notes && (
                          <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
                            <span className="font-medium">Notas:</span> {o.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Sin órdenes asociadas.</div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
