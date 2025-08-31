// src/components/Manager/ReportsPanel.tsx
import { useMemo, useState } from "react";
import type { SaleData } from "../../types";

type Props = {
  allSales: SaleData[];
  defaultDate?: string; // para arrancar en “Hoy”
};
// normaliza (minúsculas, sin acentos, guiones bajos a espacios)

export default function ReportsPanel({ allSales, defaultDate }: Props) {
  const [from, setFrom] = useState<string>(() => defaultDate ?? yyyymmdd(new Date()));
  const [to, setTo] = useState<string>(() => defaultDate ?? yyyymmdd(new Date()));
  const [orderType, setOrderType] = useState<'all' | 'local' | 'para llevar' | 'evento' | 'domicilio'>('all');

  // helpers “rápidos”
  const setToday = () => {
    const d = new Date();
    const s = yyyymmdd(d);
    setFrom(s); setTo(s);
  };
  const setThisWeek = () => {
    const d = new Date();
    const dow = d.getDay(); // 0 dom - 6 sab
    const start = new Date(d); start.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1)); // lunes
    const end = new Date(start); end.setDate(start.getDate() + 6);
    setFrom(yyyymmdd(start)); setTo(yyyymmdd(end));
  };
  const setThisMonth = () => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    setFrom(yyyymmdd(start)); setTo(yyyymmdd(end));
  };

  // filtra por rango (usa sale.date cuando exista)
  const normalized = (t?: string) => (t ?? '').toLowerCase().trim();

const saleHasType = (s: SaleData, want: 'local' | 'para llevar' | 'evento' | 'domicilio') => {
  const w = normalized(want);
  // 1) si la venta trae el tipo a nivel venta:
  if (normalized(s.orderType) === w) return true;
  // 2) si trae órdenes, busca coincidencia en alguna
  if (Array.isArray(s.orders)) {
    return s.orders.some(o => normalized(o?.orderType) === w);
  }
  return false;
};

const filtered = useMemo(() => {
  const start = new Date(from + "T00:00:00");
  const end   = new Date(to   + "T23:59:59");

  return (allSales || []).filter((s) => {
    if (!s?.date) return false;
    const dt = new Date(s.date);
    if (dt < start || dt > end) return false;

    if (orderType === "all") return true;
    return saleHasType(s, orderType);
  });
}, [allSales, from, to, orderType]);



  // KPIs
  const kpis = useMemo(() => {
    const count = filtered.length;
    const total = filtered.reduce((a, s) => a + (s.totalAmount || 0), 0);
    const avg = count ? total / count : 0;
    const paid = filtered.filter((s) => s.status === "paid").length;
    const open = filtered.filter((s) => s.status !== "paid").length;
    return { count, total, avg, paid, open };
  }, [filtered]);

  // Agrupar por día
  const byDay = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const s of filtered) {
      const key = s.date ? yyyymmdd(new Date(s.date)) : "—";
      if (!map[key]) map[key] = { count: 0, total: 0 };
      map[key].count += 1;
      map[key].total += (s.totalAmount || 0);
    }
    // a arreglo ordenado
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

function yyyymmdd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function currency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "MXN" });
}
function num(n: number) {
  return String(n.toFixed(2));
}
function safe(s: any) {
  const t = String(s ?? "");
  // escapar comas y saltos
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-xs font-semibold text-gray-600">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2">{children}</td>;
}
