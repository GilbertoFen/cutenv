'use client';

import { useCallback, useMemo, useState } from "react";
import type { SaleData } from "@/types";
import type { Props } from "@/types/Manager/manager.types";
import { Kpi, Th, Td, currency, dateFormat, num, safe, translateSaleStatus } from "@/utils/Manager/manager.functions";
import { exportSalesToExcel, exportSalesToCSV } from "@/utils/Manager/salesExport";

import { AppIcon } from "@/components/icons";

export default function ReportsPanel({ allSales, defaultDate }: Props) {
  const [from, setFrom] = useState<string>(() => defaultDate ?? dateFormat(new Date()));
  const [to, setTo] = useState<string>(() => defaultDate ?? dateFormat(new Date()));
  const [orderType, setOrderType] = useState<'all' | 'local' | 'para llevar' | 'evento' | 'domicilio'>('all');

  const setToday = () => {
    const d = new Date();
    const s = dateFormat(d);
    setFrom(s);
    setTo(s);
  };
  const setThisWeek = () => {
    const d = new Date();
    const dow = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    setFrom(dateFormat(start));
    setTo(dateFormat(end));
  };
  const setThisMonth = () => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    setFrom(dateFormat(start));
    setTo(dateFormat(end));
  };

  const normalized = (t?: string) => (t ?? '').toLowerCase().trim();

  const saleHasType = useCallback((sale: SaleData, want: 'local' | 'para llevar' | 'evento' | 'domicilio') => {
    const w = normalized(want);
    if (normalized(sale.orderType) === w) return true;
    if (Array.isArray(sale.orders)) {
      return sale.orders.some((o) => normalized(o?.orderType) === w);
    }
    return false;
  }, []);

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
  }, [allSales, from, to, orderType, saleHasType]);

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

  const handleExportExcel = () => {
    exportSalesToExcel(filtered, {
      from,
      to,
      orderType,
    });
  };

  const handleExportCSV = () => {
    exportSalesToCSV(filtered, {
      from,
      to,
      orderType,
    });
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">Resumen y Reportes Contables</h2>

      <div className="flex flex-wrap items-end gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-600">Desde:</label>
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-600">Hasta:</label>
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-600">Tipo de pedido:</label>
          <select
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
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

        <div className="ml-auto flex flex-wrap gap-1.5">
          <button className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100" onClick={setToday}>
            Hoy
          </button>
          <button className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100" onClick={setThisWeek}>
            Esta semana
          </button>
          <button className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100" onClick={setThisMonth}>
            Este mes
          </button>
          <button
            className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
            onClick={handleExportExcel}
            title="Exportar archivo Excel (.xlsx) con resumen, detalle de cuentas y desglose de platillos"
          >
            <AppIcon name="download" size={13} />
            <span>Exportar XLSX</span>
          </button>
          <button
            className="rounded-lg bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
            onClick={handleExportCSV}
            title="Exportar archivo CSV con codificación UTF-8 BOM para Excel"
          >
            <AppIcon name="download" size={13} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Ventas" value={String(kpis.count)} />
        <Kpi label="Total recaudado" value={currency(kpis.total)} />
        <Kpi label="Ticket promedio" value={currency(kpis.avg)} />
        <Kpi label="Pagadas" value={String(kpis.paid)} />
        <Kpi label="Abiertas" value={String(kpis.open)} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
            <tr>
              <Th>Fecha</Th>
              <Th>Ventas</Th>
              <Th>Total</Th>
              <Th>Promedio</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {byDay.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={4}>
                  No hay datos en el rango seleccionado.
                </td>
              </tr>
            ) : (
              byDay.map((r) => (
                <tr key={r.date} className="hover:bg-slate-50 transition-colors">
                  <Td className="font-bold text-slate-900">{r.date}</Td>
                  <Td>{r.count}</Td>
                  <Td className="font-bold text-indigo-700">{currency(r.total)}</Td>
                  <Td>{currency(r.avg)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
