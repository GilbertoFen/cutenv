'use client';

import { Kpi, currency } from "@/utils/Manager/manager.functions";

export default function SalesSummary({
  loading,
  dateLabel,
  count,
  totalAmount,
  totalTips = 0,
  totalCollected,
  avg,
  paidCount,
  unpaidCount,
}: {
  loading: boolean;
  dateLabel: string;
  count: number;
  totalAmount: number;
  totalTips?: number;
  totalCollected?: number;
  avg: number;
  paidCount: number;
  unpaidCount: number;
}) {
  const calculatedTotalCollected = totalCollected ?? (totalAmount + totalTips);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Kpi label={`Ventas (${dateLabel})`} value={loading ? "…" : String(count)} />
      <Kpi label="Venta Neta" value={loading ? "…" : currency(totalAmount)} />
      <Kpi label="Propinas" value={loading ? "…" : currency(totalTips)} />
      <Kpi
        label="Total Cobrado"
        value={loading ? "…" : currency(calculatedTotalCollected)}
        className="bg-emerald-50/60 border-emerald-200"
        valueClassName="text-emerald-900"
      />
      <Kpi label="Ticket promedio" value={loading ? "…" : currency(avg)} />
      <Kpi label="Pagadas / Abiertas" value={loading ? "…" : `${paidCount} / ${unpaidCount}`} />
    </section>
  );
}
