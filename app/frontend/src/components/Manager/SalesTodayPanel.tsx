import type { SaleData } from "../../types";
import { getTableNumber, Th, Td, currency } from "../../utils/Manager/manager.functions";

export default function SalesTodayPanel({
  loading,
  sales,
  onPrint,
  onOpen,
  onGoToSummary,
}: {
  loading: boolean;
  sales: SaleData[];           
  onPrint: (id: string) => void;
  onOpen: (id: string) => void;
  onGoToSummary?: () => void; 
}) {
  return (
    <section className="mt-2">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ventas del día</h2>
      </div>
      {onGoToSummary && (
          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={onGoToSummary}
          >
            Ver reporte (día)
          </button>
        )}

      <div className="overflow-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <Th>Folio</Th>
              <Th>Mesa</Th>
              <Th>Fecha</Th>
              <Th>Estado</Th>
              <Th>Total</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={6}>Cargando…</td></tr>
            ) : sales.length === 0 ? (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={6}>Sin ventas en esta fecha.</td></tr>
            ) : (
              sales.map((s: SaleData) => (
                <tr key={s.id || s.id} className="border-t">
                  <Td>{s.folio || "—"}</Td>
                  <Td>{getTableNumber(s.table)}</Td>
                  <Td>{s.date ? new Date(s.date).toLocaleString() : "—"}</Td>
                  <Td>
                    <span className="rounded-full border px-2 py-0.5 text-xs">
                      {s.status}
                    </span>
                  </Td>
                  <Td>{currency(s.totalAmount || 0)}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border px-2 py-1 hover:bg-gray-50"
                        onClick={() => onOpen(s.id || s.id)}
                      >
                        Ver
                      </button>
                      <button
                        className="rounded-lg border px-2 py-1 hover:bg-gray-50"
                        onClick={() => onPrint(s.id || s.id)}
                      >
                        Imprimir
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}