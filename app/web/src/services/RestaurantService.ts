import { apiFetch } from '@/lib/api';
import type { Restaurant, DaySchedule } from '@/types';

export interface CreateRestaurantPayload {
  name: string;
  code?: string;
  timezone?: string;
  address?: string;
  phone?: string;
  ownerName: string;
  ownerEmail: string;
  managerName: string;
  managerEmail: string;
}

export interface CreatedRestaurantResponse {
  success: boolean;
  restaurant: Restaurant;
  owner: {
    id: string;
    name: string;
    email: string;
    role: string;
    invitationToken: string;
    invitationUrl: string;
  };
  manager: {
    id: string;
    name: string;
    email: string;
    role: string;
    invitationToken: string;
    invitationUrl: string;
  };
}

export async function createRestaurant(payload: CreateRestaurantPayload): Promise<CreatedRestaurantResponse> {
  const res = await apiFetch('/restaurants', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al dar de alta el restaurante');
  }
  return res.json();
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const res = await apiFetch('/restaurants');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al consultar los restaurantes');
  }
  return res.json();
}

export async function getRestaurantById(id: string): Promise<Restaurant> {
  const res = await apiFetch(`/restaurants/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al obtener información del restaurante');
  }
  return res.json();
}

export async function updateRestaurant(
  id: string,
  payload: {
    name?: string;
    status?: 'active' | 'inactive';
    timezone?: string;
    address?: string;
    phone?: string;
  },
): Promise<Restaurant> {
  const res = await apiFetch(`/restaurants/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al actualizar el restaurante');
  }
  return res.json();
}

export async function getRestaurantSchedule(restaurantId: string): Promise<{
  weeklySchedule: DaySchedule[];
  timezone: string;
}> {
  const res = await apiFetch(`/restaurants/${encodeURIComponent(restaurantId)}/schedule`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al consultar horario de disponibilidad');
  }
  return res.json();
}

export async function updateRestaurantSchedule(
  restaurantId: string,
  payload: {
    weeklySchedule: DaySchedule[];
    timezone?: string;
  },
): Promise<{ success: boolean; schedule: any; revokedSessionsCount: number }> {
  const res = await apiFetch(`/restaurants/${encodeURIComponent(restaurantId)}/schedule`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al actualizar horario de disponibilidad');
  }
  return res.json();
}

