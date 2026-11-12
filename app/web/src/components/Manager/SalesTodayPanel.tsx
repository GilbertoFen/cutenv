'use client';

import type { SaleData } from "@/types";
import { getTableNumber, Th, Td, currency, translateSaleStatus, getSaleStatusBadgeClass } from "@/utils/Manager/manager.functions";
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
  const formatDateCompact = (d?: string | Date) => {
    if (!d) return "—";
    try {
      const dateObj = new Date(d);
      return dateObj.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(d);
    }
  };

  return (
    <section className="space-y-4 w-full min-w-0">
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

      <div className="w-full max-w-full overflow-x-auto rounded-3xl border border-slate-200/90 bg-white shadow-soft-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
            <tr>
              <Th className="px-2.5 sm:px-3 py-2.5">Folio</Th>
              <Th className="px-2 sm:px-2.5 py-2.5">Mesa</Th>
              <Th className="px-2 sm:px-2.5 py-2.5">Fecha y hora</Th>
              <Th className="px-2 sm:px-2.5 py-2.5">Estado</Th>
              <Th className="px-2 sm:px-2.5 py-2.5 text-right">Total</Th>
              <Th className="px-2 sm:px-2.5 py-2.5">Nota / Justificación</Th>
              <Th className="px-2 sm:px-3 py-2.5 text-right">Acciones</Th>
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
                    <Td className="px-2.5 sm:px-3 py-2.5 font-black text-slate-900 font-mono whitespace-nowrap">{s.folio || "—"}</Td>
                    <Td className="px-2 sm:px-2.5 py-2.5 font-bold text-slate-800 whitespace-nowrap">Mesa {getTableNumber(s.table)}</Td>
                    <Td className="px-2 sm:px-2.5 py-2.5 text-slate-500 font-medium whitespace-nowrap">{formatDateCompact(s.date)}</Td>
                    <Td className="px-2 sm:px-2.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                          isCancelled
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : getSaleStatusBadgeClass(s.status)
                          }`}>
                          {isCancelled ? 'Cancelada' : translateSaleStatus(s.status)}
                        </span>
                        {s.isFacturada ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-black border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Facturada</span>
                          </span>
                        ) : s.invoiceStatus === 'cancelled' ? (
                          <span className="text-[10px] bg-rose-50 text-rose-800 px-2 py-0.5 rounded-full font-bold border border-rose-200">
                            Factura cancelada
                          </span>
                        ) : s.status === 'paid' ? (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold border border-slate-200">
                            Sin facturar
                          </span>
                        ) : null}
                      </div>
                    </Td>
                    <Td className={`px-2 sm:px-2.5 py-2.5 text-right font-black text-xs sm:text-sm whitespace-nowrap ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {currency(s.totalAmount || 0)}
                    </Td>
                    <Td className="px-2 sm:px-2.5 py-2.5 max-w-[140px] sm:max-w-[180px]">
                      {isCancelled ? (
                        <div className="bg-rose-50 border border-rose-200 p-1.5 rounded-xl text-rose-900 text-[11px] shadow-soft-xs">
                          <p className="font-bold truncate" title={s.cancelReason || 'Sin motivo'}>
                            Motivo: &quot;{s.cancelReason || 'Sin motivo'}&quot;
                          </p>
                          <p className="text-[10px] text-rose-700 mt-0.5 truncate">Por: {s.cancelledBy || 'Gerente'}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </Td>
                    <Td className="px-2 sm:px-3 py-2.5 whitespace-nowrap text-right">
                      <div className="flex gap-1 items-center justify-end">
                        <button
                          className="min-h-[28px] rounded-lg border border-slate-200/90 px-2 py-0.5 hover:bg-slate-100 text-slate-700 font-bold transition active:scale-95 bg-white shadow-soft-xs text-[11px]"
                          onClick={() => onOpen(s.id)}
                        >
                          Ver
                        </button>
                        {s.status === 'paid' && !s.isFacturada && (
                          <button
                            className="min-h-[28px] rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 font-black text-[10px] flex items-center gap-1 transition active:scale-95 shadow-soft-xs"
                            onClick={() => onOpen(s.id)}
                            title="Emitir comprobante fiscal CFDI 4.0 para este ticket"
                          >
                            <AppIcon name="invoicing" size={11} className="text-indigo-600" />
                            <span>Facturar</span>
                          </button>
                        )}
                        <button
                          className="min-h-[28px] rounded-lg border border-slate-200/90 px-2 py-0.5 hover:bg-slate-100 text-slate-700 font-bold transition active:scale-95 bg-white shadow-soft-xs text-[11px]"
                          onClick={() => onPrint(s.id)}
                        >
                          Imprimir
                        </button>
                        {!isCancelled && onCancel && (
                          <button
                            className="min-h-[28px] rounded-lg border border-rose-200 px-2 py-0.5 hover:bg-rose-100 text-rose-700 font-bold bg-rose-50 transition active:scale-95 shadow-soft-xs text-[11px]"
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
