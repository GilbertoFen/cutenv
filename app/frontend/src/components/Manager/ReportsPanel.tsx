import { useMemo, useState } from "react";
import type { SaleData } from "../../types";
import type { Props } from "../../types/Manager/manager.types";
import { Kpi, Th, Td, currency, dateFormat, num, safe } from "../../utils/Manager/manager.functions";
export default function ReportsPanel({ allSales, defaultDate }: Props) {
  const [from, setFrom] = useState<string>(() => defaultDate ?? dateFormat(new Date()));
  const [to, setTo] = useState<string>(() => defaultDate ?? dateFormat(new Date()));
  const [orderType, setOrderType] = useState<'all' | 'local' | 'para llevar' | 'evento' | 'domicilio'>('all');

  const setToday = () => {
    const d = new Date();
    const s = dateFormat(d);
    setFrom(s); setTo(s);
  };
  const setThisWeek = () => {
    const d = new Date();
    const dow = d.getDay();
    const start = new Date(d); start.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const end = new Date(start); end.setDate(start.getDate() + 6);
    setFrom(dateFormat(start)); setTo(dateFormat(end));
  };
  const setThisMonth = () => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    setFrom(dateFormat(start)); setTo(dateFormat(end));
  };

  const normalized = (t?: string) => (t ?? '').toLowerCase().trim();

  const saleHasType = (sale: SaleData, want: 'local' | 'para llevar' | 'evento' | 'domicilio') => {
    const w = normalized(want);
    if (normalized(sale.orderType) === w) return true;
    if (Array.isArray(sale.orders)) {
      return sale.orders.some(o => normalized(o?.orderType) === w);
    }
    return false;
  };

  const filtered = useMemo(() => {
    const start = new Date(from + "T00:00:00");
    const end = new Date(to + "T23:59:59");

    return (allSales || []).filter((s) => {
      if (!s?.date) return false;
      const dt = new Date(s.date);
      if (dt < start || dt > end) return false;

      if (orderType === "all") return true;
      return saleHasType(s, orderType);
    });
  }, [allSales, from, to, orderType]);

  const kpis = useMemo(() => {
    const count = filtered.length;
    const total = filtered.reduce((a, sale) => a + (sale.totalAmount || 0), 0);
    const avg = count ? total / count : 0;
    const paid = filtered.filter((s) => s.status === "paid").length;
    const open = filtered.filter((s) => s.status !== "paid").length;
    return { count, total, avg, paid, open };
  }, [filtered]);

  const byDay = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const s of filtered) {
      const key = s.date ? dateFormat(new Date(s.date)) : "—";
      if (!map[key]) map[key] = { count: 0, total: 0 };
      map[key].count += 1;
      map[key].total += (s.totalAmount || 0);
    }
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, ...v, avg: v.count ? v.total / v.count : 0 }));
  }, [filtered]);

  const exportCSV = () => {
    const rows = [
      ["Fecha desde", from],
      ["Fecha hasta", to],
      [],
      ["KPIs"],
      ["Ventas", String(kpis.count)],
      ["Total", currency(kpis.total)],
      ["Ticket promedio", currency(kpis.avg)],
      ["Pagadas", String(kpis.paid)],
      ["Abiertas", String(kpis.open)],
      [],
      ["Detalle por día"],
      ["Fecha", "Ventas", "Total", "Promedio"],
      ...byDay.map(r => [r.date, String(r.count), num(r.total), num(r.avg)]),
    ];
    const csv = rows.map(r => r.map(safe).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_${from}_a_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Resumen / Reportes</h2>

      {/* Controles */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Desde</label>
          <input type="date" className="rounded-xl border px-3 py-2 text-sm" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Hasta</label>
          <input type="date" className="rounded-xl border px-3 py-2 text-sm" value={to} onChange={e => setTo(e.target.value)} />
        </div>

        <div className="ml-auto flex gap-2">
          <button className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50" onClick={setToday}>Hoy</button>
          <button className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50" onClick={setThisWeek}>Esta semana</button>
          <button className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50" onClick={setThisMonth}>Este mes</button>
          <button className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50" onClick={exportCSV}>Exportar CSV</button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Tipo de pedido</label>
          <select
            className="rounded-xl border px-3 py-2 text-sm"
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as any)}
          >
            <option value="all">Todos</option>
            <option value="local">Local</option>
            <option value="para llevar">Para llevar</option>
            <option value="evento">Evento</option>
            <option value="domicilio">Domicilio</option>
          </select>
        </div>

      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Ventas" value={String(kpis.count)} />
        <Kpi label="Total" value={currency(kpis.total)} />
        <Kpi label="Ticket promedio" value={currency(kpis.avg)} />
        <Kpi label="Pagadas" value={String(kpis.paid)} />
        <Kpi label="Abiertas" value={String(kpis.open)} />
      </div>

      {/* Tabla por día */}
      <div className="overflow-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <Th>Fecha</Th>
              <Th>Ventas</Th>
              <Th>Total</Th>
              <Th>Promedio</Th>
            </tr>
          </thead>
          <tbody>
            {byDay.length === 0 ? (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>No hay datos en este rango.</td></tr>
            ) : byDay.map((r) => (
              <tr key={r.date} className="border-t">
                <Td>{r.date}</Td>
                <Td>{r.count}</Td>
                <Td>{currency(r.total)}</Td>
                <Td>{currency(r.avg)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


