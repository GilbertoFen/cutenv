import React from "react";

export function Kpi({
  label,
  value,
  className = "",
  valueClassName = "",
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`w-full min-w-0 rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 md:p-5 shadow-soft-xs bg-white hover:shadow-soft-sm transition-all duration-150 flex flex-col justify-between ${className}`}>
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1 truncate">{label}</div>
      <div className={`text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight break-normal ${valueClassName}`}>{value}</div>
    </div>
  );
}

export function translateSaleStatus(status?: string): string {
  if (!status) return "—";
  const s = status.toLowerCase().trim();
  switch (s) {
    case "paid":
      return "Pagada";
    case "unpaid":
      return "Sin pagar";
    case "partial":
      return "Pago parcial";
    case "pending":
      return "Pendiente";
    case "cancelled":
      return "Cancelada";
    case "refunded":
      return "Reembolsada";
    case "open":
      return "Abierta";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export function getSaleStatusBadgeClass(status?: string): string {
  const s = (status || "").toLowerCase().trim();
  switch (s) {
    case "paid":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "cancelled":
      return "bg-rose-50 text-rose-800 border-rose-200";
    case "partial":
    case "pending":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "unpaid":
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
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
