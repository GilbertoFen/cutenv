'use client';

import { useEffect, useState } from "react";
import { getSaleById } from "@/services/SaleService";
import { getInvoiceXmlUrl, getInvoicePdfUrl } from "@/services/InvoicingService";
import type { SaleData } from "@/types";
import { Th, Td, Kpi, currency, translateSaleStatus } from "@/utils/Manager/manager.functions";
import IssueInvoiceModal from "@/components/Invoicing/IssueInvoiceModal";
import { AppIcon } from "@/components/icons";

type Props = {
  saleId: string;
  onClose: () => void;
  onInvoiceCreated?: () => void;
};

export default function SaleDetailModal({ saleId, onClose, onInvoiceCreated }: Props) {
  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState<SaleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSaleById(saleId)
      .then((data) => setSale(data))
      .catch((e) => setError(e?.message || "Error al cargar la venta"))
      .finally(() => setLoading(false));
  }, [saleId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <header className="flex items-center justify-between border-b p-4 bg-slate-50">
          <h3 className="text-base font-bold text-slate-800">Detalle de Venta</h3>
          <button
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-slate-100"
            onClick={onClose}
          >
            Cerrar
          </button>
        </header>

        <div className="max-h-[75vh] overflow-y-auto p-5">
          {loading && <div className="text-xs text-slate-400 py-6 text-center">Cargando venta…</div>}
          {error && <div className="text-xs text-rose-600 font-semibold mb-3">{error}</div>}
          {!loading && sale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Kpi label="Folio" value={sale.folio ?? "—"} />
                <Kpi label="Fecha" value={sale.date ? new Date(sale.date).toLocaleDateString() : "—"} />
                <Kpi label="Estado" value={translateSaleStatus(sale.status)} />
                <Kpi
                  label="Total de la Venta"
                  value={currency(sale.totalAmount || 0)}
                  className="bg-indigo-50/60 border-indigo-200"
                  valueClassName="text-indigo-900"
                />
              </div>

              {sale.status === 'paid' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                      <AppIcon name="invoicing" size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">Facturación Electrónica SAT (CFDI 4.0)</span>
                      <span className="text-slate-500 text-[11px]">
                        {sale.isFacturada
                          ? 'Esta venta ya cuenta con factura digital timbrada'
                          : 'Genera el comprobante fiscal individual para el cliente'}
                      </span>
                    </div>
                  </div>

                  {sale.isFacturada ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                        <AppIcon name="check" size={13} className="text-emerald-700" />
                        <span>Facturada</span>
                      </span>
                      {sale.invoiceId && (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={getInvoiceXmlUrl(String(sale.invoiceId))}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                          >
                            XML
                          </a>
                          <a
                            href={getInvoicePdfUrl(String(sale.invoiceId))}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
                          >
                            PDF
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowInvoiceModal(true)}
                      className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#14144f] hover:bg-[#1f1f6d] text-white transition shadow-sm flex items-center gap-1.5"
                    >
                      <AppIcon name="zap" size={13} className="text-amber-300" />
                      <span>Facturar Venta</span>
                    </button>
                  )}
                </div>
              )}

              {sale.status === 'cancelled' && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs">
                  <div className="flex items-center gap-2 text-rose-800 font-bold mb-1">
                    <AppIcon name="error" size={16} className="text-rose-600 shrink-0" />
                    <span>ESTA CUENTA FUE CANCELADA POR EL GERENTE</span>
                  </div>
                  <p className="text-slate-700">
                    <strong>Motivo registrado:</strong> &quot;{sale.cancelReason || 'Sin motivo'}&quot;
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    <strong>Autorizado por:</strong> {sale.cancelledBy || 'Gerente'}
                    {sale.cancelledAt && ` · ${new Date(sale.cancelledAt).toLocaleString()}`}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Comandas asociadas</h4>
                {sale.orders && sale.orders.length > 0 ? (
                  <div className="space-y-3">
                    {sale.orders.map((o: any, idx: number) => (
                      <div key={o.id || o._id || idx} className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800">
                            Mesa: {o.table?.number ?? o.tableNumber ?? "—"}
                          </span>
                          <span className="font-bold text-xs text-indigo-700">
                            Subtotal: {currency(o.total || 0)}
                          </span>
                        </div>
                        {Array.isArray(o.items) && o.items.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-xs text-left bg-white rounded-lg border border-slate-200">
                              <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                  <Th>Platillo</Th>
                                  <Th>Cant.</Th>
                                  <Th>Precio</Th>
                                  <Th>Total</Th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {o.items.map((it: any, i: number) => (
                                  <tr key={i}>
                                    <Td>{it.recipe ?? "—"}</Td>
                                    <Td className="font-bold">{it.quantity}</Td>
                                    <Td>{currency(it.price || 0)}</Td>
                                    <Td className="font-bold">{currency((it.quantity || 0) * (it.price || 0))}</Td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-3">Sin comandas registradas</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <IssueInvoiceModal
        isOpen={showInvoiceModal}
        sale={sale}
        onClose={() => setShowInvoiceModal(false)}
        onSuccess={() => {
          if (sale) setSale({ ...sale, isFacturada: true });
          if (onInvoiceCreated) onInvoiceCreated();
        }}
      />
    </div>
  );
}
