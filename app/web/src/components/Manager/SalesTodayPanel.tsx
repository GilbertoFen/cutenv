'use client';

import type { SaleData } from "@/types";
import { getTableNumber, Th, Td, currency } from "@/utils/Manager/manager.functions";
import { AppIcon } from "@/components/icons";

export default function SalesTodayPanel({
  loading,
  sales,
  onPrint,
  onOpen,
  onCancel,
  onGoToSummary,
}: {
  loading: boolean;
  sales: SaleData[];
  onPrint: (id: string) => void;
  onOpen: (id: string) => void;
  onCancel?: (sale: SaleData) => void;
  onGoToSummary?: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Cuentas y Ventas del Día</h2>
        {onGoToSummary && (
          <button
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 text-slate-700 transition-colors inline-flex items-center gap-1.5"
            onClick={onGoToSummary}
          >
            <AppIcon name="reports" size={14} />
            <span>Ver reporte detallado</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <Th>Folio</Th>
              <Th>Mesa</Th>
              <Th>Fecha y hora</Th>
              <Th>Estado</Th>
              <Th>Total</Th>
              <Th>Nota / Justificación</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={7}>
                  Cargando ventas…
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={7}>
                  Sin ventas registradas en esta fecha.
                </td>
              </tr>
            ) : (
              sales.map((s: SaleData) => {
                const isCancelled = s.status === 'cancelled';
                return (
                  <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${isCancelled ? 'bg-rose-50/40' : ''}`}>
                    <Td className="font-bold text-slate-900 font-mono">{s.folio || "—"}</Td>
                    <Td>Mesa {getTableNumber(s.table)}</Td>
                    <Td className="text-slate-500">{s.date ? new Date(s.date).toLocaleString() : "—"}</Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          isCancelled
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black'
                            : s.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {isCancelled ? 'Cancelada' : s.status}
                        </span>
                        {s.isFacturada && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-black border border-indigo-200">
                            CFDI
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className={`font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {currency(s.totalAmount || 0)}
                    </Td>
                    <Td>
                      {isCancelled ? (
                        <div className="bg-rose-100/70 border border-rose-200 p-2 rounded-lg text-rose-900 text-[11px] max-w-xs">
                          <p className="font-bold">Motivo: &quot;{s.cancelReason || 'Sin motivo especificado'}&quot;</p>
                          <p className="text-[10px] text-rose-700 mt-0.5">Por: {s.cancelledBy || 'Gerente'}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex gap-1.5">
                        <button
                          className="rounded-lg border border-slate-300 px-2.5 py-1 hover:bg-slate-100 text-slate-700 font-semibold"
                          onClick={() => onOpen(s.id)}
                        >
                          Ver
                        </button>
                        {s.status === 'paid' && !s.isFacturada && (
                          <button
                            className="rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 font-bold text-[11px] flex items-center gap-1"
                            onClick={() => onOpen(s.id)}
                            title="Emitir comprobante fiscal CFDI 4.0 para este ticket"
                          >
                            <AppIcon name="invoicing" size={12} className="text-indigo-600" />
                            <span>Facturar</span>
                          </button>
                        )}
                        <button
                          className="rounded-lg border border-slate-300 px-2.5 py-1 hover:bg-slate-100 text-slate-700 font-semibold"
                          onClick={() => onPrint(s.id)}
                        >
                          Imprimir
                        </button>
                        {!isCancelled && onCancel && (
                          <button
                            className="rounded-lg border border-rose-300 px-2.5 py-1 hover:bg-rose-100 text-rose-700 font-bold bg-rose-50"
                            onClick={() => onCancel(s)}
                            title="Cancelar cuenta manualmente siguiendo reglas de negocio"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
