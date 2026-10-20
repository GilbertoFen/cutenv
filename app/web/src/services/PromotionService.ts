import { apiFetch } from '@/lib/api';
import type { Promotion } from '@/types';

export async function getAllPromotions(activeOnly = false): Promise<Promotion[]> {
  const res = await apiFetch(`/promotions?activeOnly=${activeOnly}`);
  if (!res.ok) throw new Error('Error al cargar promociones');
  return res.json();
}

export async function getValidPromotionsToday(): Promise<Promotion[]> {
  const res = await apiFetch('/promotions/valid-today');
  if (!res.ok) throw new Error('Error al consultar promociones vigentes hoy');
  return res.json();
}

export async function createPromotion(data: {
  name: string;
  code?: string;
  type: string;
  daysOfWeek?: number[];
  startDate?: string;
  endDate?: string;
  scope?: string;
  targetCategories?: string[];
  targetRecipes?: string[];
  discountValue: number;
  minOrderAmount?: number;
  description?: string;
  authUsername: string;
  authPassword: string;
}): Promise<Promotion> {
  const res = await apiFetch('/promotions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al crear la promoción');
  }
  return res.json();
}

export async function updatePromotion(
  id: string,
  data: Partial<Promotion> & { authUsername: string; authPassword: string }
): Promise<Promotion> {
  const res = await apiFetch(`/promotions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al actualizar la promoción');
  }
  return res.json();
}

export async function deletePromotion(
  id: string,
  auth: { authUsername: string; authPassword: string }
): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch(`/promotions/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(auth),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al dar de baja la promoción');
  }
  return res.json();
}

export async function calculatePromotionDiscount(
  promotionId: string,
  items: Array<{ recipeId?: string; recipeName: string; category?: string; price: number; quantity: number }>,
  accountTotal: number
): Promise<{
  promotionId: string;
  name: string;
  type: string;
  discountAmount: number;
  eligibleUnitsCount: number;
  benefitedItems: string[];
  finalTotal: number;
  message?: string;
}> {
  const res = await apiFetch('/promotions/calculate', {
    method: 'POST',
    body: JSON.stringify({ promotionId, items, accountTotal }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al calcular la promoción');
  }
  return res.json();
}
