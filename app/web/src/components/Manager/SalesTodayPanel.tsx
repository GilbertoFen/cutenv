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

      <div className="overflow-x-auto rounded-3xl border border-slate-200/90 bg-white shadow-soft-xs">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
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
                <td className="px-4 py-12 text-center text-slate-400" colSpan={7}>
                  Cargando ventas…
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-slate-400" colSpan={7}>
                  Sin ventas registradas en esta fecha.
                </td>
              </tr>
            ) : (
              sales.map((s: SaleData) => {
                const isCancelled = s.status === 'cancelled';
                return (
                  <tr key={s.id} className={`hover:bg-slate-50/70 transition-colors ${isCancelled ? 'bg-rose-50/30' : ''}`}>
                    <Td className="font-black text-slate-900 font-mono">{s.folio || "—"}</Td>
                    <Td className="font-bold text-slate-800">Mesa {getTableNumber(s.table)}</Td>
                    <Td className="text-slate-500 font-medium">{s.date ? new Date(s.date).toLocaleString() : "—"}</Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                          isCancelled
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : s.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {isCancelled ? 'Cancelada' : s.status}
                        </span>
                        {s.isFacturada && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-black border border-indigo-200">
                            CFDI
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className={`font-black text-sm ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {currency(s.totalAmount || 0)}
                    </Td>
                    <Td>
                      {isCancelled ? (
                        <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-rose-900 text-[11px] max-w-xs shadow-soft-xs">
                          <p className="font-bold">Motivo: &quot;{s.cancelReason || 'Sin motivo especificado'}&quot;</p>
                          <p className="text-[10px] text-rose-700 mt-0.5">Por: {s.cancelledBy || 'Gerente'}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex gap-1.5 items-center">
                        <button
                          className="min-h-[34px] rounded-xl border border-slate-200/90 px-3 py-1 hover:bg-slate-100 text-slate-700 font-bold transition active:scale-95 bg-white shadow-soft-xs"
                          onClick={() => onOpen(s.id)}
                        >
                          Ver
                        </button>
                        {s.status === 'paid' && !s.isFacturada && (
                          <button
                            className="min-h-[34px] rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1 font-black text-[11px] flex items-center gap-1 transition active:scale-95 shadow-soft-xs"
                            onClick={() => onOpen(s.id)}
                            title="Emitir comprobante fiscal CFDI 4.0 para este ticket"
                          >
                            <AppIcon name="invoicing" size={12} className="text-indigo-600" />
                            <span>Facturar</span>
                          </button>
                        )}
                        <button
                          className="min-h-[34px] rounded-xl border border-slate-200/90 px-3 py-1 hover:bg-slate-100 text-slate-700 font-bold transition active:scale-95 bg-white shadow-soft-xs"
                          onClick={() => onPrint(s.id)}
                        >
                          Imprimir
                        </button>
                        {!isCancelled && onCancel && (
                          <button
                            className="min-h-[34px] rounded-xl border border-rose-200 px-3 py-1 hover:bg-rose-100 text-rose-700 font-bold bg-rose-50 transition active:scale-95 shadow-soft-xs"
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
