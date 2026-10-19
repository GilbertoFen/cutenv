import React from "react";

export function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[180px] rounded-2xl border p-4 shadow-sm bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold whitespace-nowrap">{value}</div>
    </div>
  );
}

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-xs font-semibold text-gray-600 ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
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
