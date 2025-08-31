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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[180px] rounded-2xl border p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold whitespace-nowrap">{value}</div>
    </div>
  );
}
function currency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "MXN" });
}
