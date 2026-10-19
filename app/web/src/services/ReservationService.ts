import type { Reservation, ReservationInfoForTable } from "@/types";
import { getApiUrl } from "@/lib/config";

export function localToUTCISO(localValue: string): string {
  return new Date(localValue).toISOString();
}

export async function createReservation(payload: {
  table?: string;
  customerName?: string;
  phone?: string;
  partySize?: number;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  notes?: string;
}): Promise<Reservation> {
  const res = await fetch(getApiUrl("/reservations"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getReservationsByDate(dateYYYYMMDD: string): Promise<Reservation[]> {
  const res = await fetch(getApiUrl(`/reservations?date=${dateYYYYMMDD}`));
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getReservationInfoForTable(tableId: string, dateYYYYMMDD: string): Promise<ReservationInfoForTable> {
  const res = await fetch(getApiUrl(`/reservations/for-table/${tableId}?date=${dateYYYYMMDD}`));
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getUpcomingReservations(
  hours = 48,
  status?: 'programada' | 'sentada'
): Promise<Reservation[]> {
  const qs = new URLSearchParams();
  qs.set('hours', String(hours));
  if (status) qs.set('status', status);
  const res = await fetch(getApiUrl(`/reservations/upcoming?${qs.toString()}`));
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function seatReservation(id: string) {
  const res = await fetch(getApiUrl(`/reservations/${id}/seat`), { method: "PATCH" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function cancelReservation(id: string) {
  const res = await fetch(getApiUrl(`/reservations/${id}/cancel`), { method: "PATCH" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function noShowReservation(id: string) {
  const res = await fetch(getApiUrl(`/reservations/${id}/noshow`), { method: "PATCH" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function assignReservationTable(id: string, tableId: string) {
  const res = await fetch(getApiUrl(`/reservations/${id}/assign-table`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
