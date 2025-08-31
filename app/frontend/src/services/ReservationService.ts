import type { Reservation , ReservationInfoForTable} from "../types";

// convierte "datetime-local" a ISO UTC
export function localToUTCISO(localValue: string): string {
  return new Date(localValue).toISOString();
}
export async function createReservation(payload: {
  table?: string;             // ObjectId de mesa
  customerName?: string;
  phone?: string;
  partySize?: number;
  startTime: string;          // ISO UTC
  endTime?: string;           // ISO UTC
  durationMinutes?: number;   // si no mandas endTime
  notes?: string;
}): Promise<Reservation> {
  const res = await fetch(`/api/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getReservationsByDate(dateYYYYMMDD: string): Promise<Reservation[]> {
  const res = await fetch(`/api/reservations?date=${dateYYYYMMDD}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// NUEVO: info compacta para una mesa en una fecha (usa el endpoint nuevo)
export async function getReservationInfoForTable(tableId: string, dateYYYYMMDD: string): Promise<ReservationInfoForTable> {
  const res = await fetch(`/api/reservations/for-table/${tableId}?date=${dateYYYYMMDD}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// NUEVO: próximas N horas
export async function getUpcomingReservations(
  hours = 48,
  status?: 'programada' | 'sentada'
) {
  const qs = new URLSearchParams();
  qs.set('hours', String(hours));
  if (status) qs.set('status', status);
  const res = await fetch(`/api/reservations/upcoming?${qs.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}



export async function seatReservation(id: string) {
  const res = await fetch(`/api/reservations/${id}/seat`, { method: "PATCH" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function cancelReservation(id: string) {
  const res = await fetch(`/api/reservations/${id}/cancel`, { method: "PATCH" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// NUEVO: no-show
export async function noShowReservation(id: string) {
  const res = await fetch(`/api/reservations/${id}/noshow`, { method: "PATCH" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// NUEVO: asignar mesa a una reservación
export async function assignReservationTable(id: string, tableId: string) {
  const res = await fetch(`/api/reservations/${id}/assign-table`, { // 👈 aquí
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

