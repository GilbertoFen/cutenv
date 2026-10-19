import type { Reservation, Table } from "../../types";

export function fmt(dtIso?: string): string {
  if (!dtIso) return "—";
  const d = new Date(dtIso);
  return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export function dateFormat(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getTableNumberStr(t: Reservation["table"]): string {
  if (t && typeof t === "object" && "number" in t) {
    return String((t as Table).number);
  }
  return "";
}
