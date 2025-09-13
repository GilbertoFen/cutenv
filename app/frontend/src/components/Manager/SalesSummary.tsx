import { Kpi , currency} from "../../utils/Manager/manager.functions";
export default function SalesSummary({
  loading,
  dateLabel,
  count,
  totalAmount,
  avg,
  paidCount,
  unpaidCount,
}: {
  loading: boolean;
  dateLabel: string;
  count: number;
  totalAmount: number;
  avg: number;
  paidCount: number;
  unpaidCount: number;
}) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <Kpi label={`Ventas (${dateLabel})`} value={loading ? "…" : String(count)} />
      <Kpi label="Total del día" value={loading ? "…" : currency(totalAmount)} />
      <Kpi label="Ticket promedio" value={loading ? "…" : currency(avg)} />
      <Kpi label="Pagadas" value={loading ? "…" : String(paidCount)} />
      <Kpi label="Abiertas" value={loading ? "…" : String(unpaidCount)} />
    </section>
  );
}

