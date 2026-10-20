import React from "react";

export function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[170px] rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-soft-xs bg-white hover:shadow-soft-sm transition-all duration-150">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className="text-xl sm:text-2xl font-black text-slate-900 whitespace-nowrap tracking-tight">{value}</div>
    </div>
  );
}

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-600 ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-xs text-slate-800 ${className}`}>{children}</td>;
}

export function fmtNum(n: number): string {
  return Number.isFinite(n) ? new Intl.NumberFormat().format(n) : "0";
}

export function currency(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "MXN" });
}

export function dateFormat(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function num(n: number): string {
  return String(n.toFixed(2));
}

export function safe(s: unknown): string {
  const t = String(s ?? "");
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function getTableNumber(table: { number?: number } | string | undefined): string {
  if (!table) return "—";
  if (typeof table === "string") return table;
  if (typeof table.number === "number") return String(table.number);
  return "—";
}
