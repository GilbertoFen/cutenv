/**
 * Centralized Promotions Engine for Restaurant POS
 * Single Source of Truth for promotions, discounts, eligibility and calculation.
 */

export interface EvaluatedItem {
  recipeId?: string;
  recipeName: string;
  category?: string;
  price: number;
  quantity: number;
}

export interface PromotionRuleDefinition {
  id?: string;
  _id?: any;
  name: string;
  code?: string;
  type: 'two_for_one' | 'percentage_discount' | 'fixed_discount';
  daysOfWeek?: number[];
  startDate?: Date | string;
  endDate?: Date | string;
  scope?: 'all' | 'categories' | 'recipes';
  targetCategories?: string[];
  applicableCategories?: string[];
  targetRecipes?: any[];
  discountValue?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  maxApplicationsPerOrder?: number;
  applyMode?: 'mix_and_match' | 'same_product';
  isActive?: boolean;
}

export interface PromotionEvaluationResult {
  promotionId: string;
  name: string;
  code?: string;
  type: string;
  rule: string;
  isEligible: boolean;
  ineligibilityReason?: string;
  eligibleUnitsCount: number;
  eligibleSubtotal: number;
  discountAmount: number;
  benefitedItems: string[];
  originalTotal: number;
  finalTotal: number;
  appliedAt: Date;
}

export interface PromotionEngineOptions {
  evaluationDate?: Date;
  ignoreScheduleValidation?: boolean; // Useful for simulated previews or manager audits
}

/**
 * Validates whether a promotion is currently in its active schedule.
 */
export function isPromotionActiveToday(
  promo: PromotionRuleDefinition,
  now: Date = new Date()
): { valid: boolean; reason?: string } {
  if (promo.isActive === false) {
    return { valid: false, reason: 'La promoción se encuentra inactiva' };
  }

  // Date range check
  if (promo.startDate) {
    const start = new Date(promo.startDate);
    if (now < start) {
      return { valid: false, reason: `La promoción inicia a partir del ${start.toLocaleDateString('es-MX')}` };
    }
  }

  if (promo.endDate) {
    const end = new Date(promo.endDate);
    end.setHours(23, 59, 59, 999);
    if (now > end) {
      return { valid: false, reason: `La promoción venció el ${end.toLocaleDateString('es-MX')}` };
    }
  }

  // Day of week check: 0=Domingo, 1=Lunes, ..., 6=Sábado
  if (promo.daysOfWeek && promo.daysOfWeek.length > 0) {
    const currentDay = now.getDay();
    if (!promo.daysOfWeek.includes(currentDay)) {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const allowedDays = promo.daysOfWeek.map((d) => dayNames[d]).join(', ');
      return { valid: false, reason: `Esta promoción solo aplica en días: ${allowedDays}` };
    }
  }

  return { valid: true };
}

/**
 * Determines whether a given line item is eligible for the promotion.
 * Uses exact IDs and categories — never keywords in item names.
 */
export function isItemEligible(
  item: EvaluatedItem,
  promo: PromotionRuleDefinition
): boolean {
  // Combine both targetCategories and legacy applicableCategories
  const categories = [
    ...(promo.targetCategories || []),
    ...(promo.applicableCategories || []),
  ].map((c) => c.trim().toLowerCase());

  const targetRecipeIds = (promo.targetRecipes || []).map((r) =>
    (typeof r === 'object' && r ? (r._id || r.id || r).toString() : String(r))
  );

  // If explicit categories are provided, category matching takes precedence
  if (promo.scope === 'categories' || (categories.length > 0 && promo.scope !== 'recipes')) {
    if (!item.category) return false;
    const itemCat = item.category.trim().toLowerCase();
    return categories.includes(itemCat);
  }

  // If explicit recipes are provided
  if (promo.scope === 'recipes' || targetRecipeIds.length > 0) {
    if (!item.recipeId) return false;
    const itemRecId = String(item.recipeId);
    return targetRecipeIds.includes(itemRecId);
  }

  // If scope is explicitly 'all' and no categories/recipes restricting it
  if (promo.scope === 'all') {
    return true;
  }

  return false;
}

/**
 * Pure evaluation function for promotions against real account items.
 * Guarantees determinism, strict eligibility, and no unpermitted spillover to non-eligible products.
 */
export function evaluatePromotion(
  promo: PromotionRuleDefinition,
  items: EvaluatedItem[],
  accountTotal: number,
  options: PromotionEngineOptions = {}
): PromotionEvaluationResult {
  const evalDate = options.evaluationDate || new Date();
  const promoId = String(promo._id || promo.id || '');

  // 1. Verify schedule and active state
  if (!options.ignoreScheduleValidation) {
    const scheduleCheck = isPromotionActiveToday(promo, evalDate);
    if (!scheduleCheck.valid) {
      return {
        promotionId: promoId,
        name: promo.name,
        code: promo.code,
        type: promo.type,
        rule: scheduleCheck.reason || 'No activa',
        isEligible: false,
        ineligibilityReason: scheduleCheck.reason,
        eligibleUnitsCount: 0,
        eligibleSubtotal: 0,
        discountAmount: 0,
        benefitedItems: [],
        originalTotal: accountTotal,
        finalTotal: accountTotal,
        appliedAt: evalDate,
      };
    }
  }

  // 2. Minimum order amount check
  if (promo.minOrderAmount && promo.minOrderAmount > 0 && accountTotal < promo.minOrderAmount) {
    return {
      promotionId: promoId,
      name: promo.name,
      code: promo.code,
      type: promo.type,
      rule: `Monto mínimo de $${promo.minOrderAmount.toFixed(2)}`,
      isEligible: false,
      ineligibilityReason: `El pedido ($${accountTotal.toFixed(2)}) no alcanza el consumo mínimo de $${promo.minOrderAmount.toFixed(2)} para esta promoción.`,
      eligibleUnitsCount: 0,
      eligibleSubtotal: 0,
      discountAmount: 0,
      benefitedItems: [],
      originalTotal: accountTotal,
      finalTotal: accountTotal,
      appliedAt: evalDate,
    };
  }

  // 3. Extract eligible units
  interface Unit {
    recipeId?: string;
    name: string;
    category?: string;
    price: number;
  }

  const eligibleUnits: Unit[] = [];

  for (const it of items) {
    const qty = Math.max(0, Math.floor(it.quantity || 0));
    if (qty <= 0) continue;

    if (isItemEligible(it, promo)) {
      const price = Math.max(0, Number(it.price) || 0);
      for (let i = 0; i < qty; i++) {
        eligibleUnits.push({
          recipeId: it.recipeId ? String(it.recipeId) : undefined,
          name: it.recipeName || 'Producto',
          category: it.category,
          price,
        });
      }
    }
  }

  const eligibleSubtotal = Math.round(
    (eligibleUnits.reduce((acc, u) => acc + u.price, 0) + Number.EPSILON) * 100
  ) / 100;

  if (eligibleUnits.length === 0) {
    return {
      promotionId: promoId,
      name: promo.name,
      code: promo.code,
      type: promo.type,
      rule: 'Sin artículos participantes',
      isEligible: false,
      ineligibilityReason: 'La cuenta no contiene productos o bebidas participantes de esta promoción.',
      eligibleUnitsCount: 0,
      eligibleSubtotal: 0,
      discountAmount: 0,
      benefitedItems: [],
      originalTotal: accountTotal,
      finalTotal: accountTotal,
      appliedAt: evalDate,
    };
  }

  let discountAmount = 0;
  const benefitedItems: string[] = [];
  let ruleDescription = '';

  // 4. Calculate benefit strictly on eligible units
  if (promo.type === 'two_for_one') {
    const applyMode = promo.applyMode || 'mix_and_match';
    const maxApplications = promo.maxApplicationsPerOrder && promo.maxApplicationsPerOrder > 0
      ? promo.maxApplicationsPerOrder
      : Infinity;

    if (applyMode === 'same_product') {
      // Each product recipe must pair with identical product
      ruleDescription = '2x1 por mismo producto';
      const grouped = new Map<string, Unit[]>();
      for (const u of eligibleUnits) {
        const key = u.recipeId || u.name;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(u);
      }

      let applicationsDone = 0;
      for (const [, group] of grouped) {
        if (applicationsDone >= maxApplications) break;
        const pairsCount = Math.floor(group.length / 2);
        const pairsToApply = Math.min(pairsCount, maxApplications - applicationsDone);

        for (let i = 0; i < pairsToApply; i++) {
          const bonifiedUnit = group[i * 2 + 1];
          discountAmount += bonifiedUnit.price;
          benefitedItems.push(
            `1x ${bonifiedUnit.name} ($${bonifiedUnit.price.toFixed(2)}) gratis por 2x1 idéntico`
          );
          applicationsDone++;
        }
      }
    } else {
      // Mix and match across eligible category/selection
      // Pairwise matching: sort descending by price, cheaper unit in each pair is discounted
      ruleDescription = '2x1 en productos participantes (Mix & Match)';
      eligibleUnits.sort((a, b) => b.price - a.price);

      const totalPairsPossible = Math.floor(eligibleUnits.length / 2);
      const pairsToApply = Math.min(totalPairsPossible, maxApplications);

      for (let k = 0; k < pairsToApply; k++) {
        const primary = eligibleUnits[k * 2];
        const secondary = eligibleUnits[k * 2 + 1];

        // The lower or equal priced item is discounted
        discountAmount += secondary.price;
        benefitedItems.push(
          `1x ${secondary.name} ($${secondary.price.toFixed(2)}) cortesía 2x1 al comprar ${primary.name} ($${primary.price.toFixed(2)})`
        );
      }

      if (eligibleUnits.length % 2 !== 0 && totalPairsPossible === 0) {
        ruleDescription += ' (Se requiere al menos 2 unidades para obtener 1 gratis)';
      }
    }
  } else if (promo.type === 'percentage_discount') {
    const pct = Math.min(100, Math.max(0, promo.discountValue || 0));
    ruleDescription = `${pct}% de descuento sobre artículos participantes`;
    discountAmount = Math.round((eligibleSubtotal * (pct / 100) + Number.EPSILON) * 100) / 100;
    benefitedItems.push(
      `${pct}% de descuento aplicado exclusivamente a ${eligibleUnits.length} producto(s) elegible(s) (Base: $${eligibleSubtotal.toFixed(2)})`
    );
  } else if (promo.type === 'fixed_discount') {
    const fixedVal = Math.max(0, promo.discountValue || 0);
    // Fixed discount can never exceed the eligible items subtotal
    discountAmount = Math.min(fixedVal, eligibleSubtotal);
    ruleDescription = `Descuento fijo de $${fixedVal.toFixed(2)} sobre artículos participantes`;
    benefitedItems.push(
      `Descuento directo de $${discountAmount.toFixed(2)} aplicado a ${eligibleUnits.length} producto(s) elegible(s) (Base: $${eligibleSubtotal.toFixed(2)})`
    );
  }

  // 5. Apply max discount cap if configured
  if (promo.maxDiscountAmount && promo.maxDiscountAmount > 0 && discountAmount > promo.maxDiscountAmount) {
    discountAmount = promo.maxDiscountAmount;
    benefitedItems.push(`(Ajustado al tope máximo de descuento permitido: $${promo.maxDiscountAmount.toFixed(2)})`);
  }

  // 6. Hard safety: Discount cannot exceed eligible subtotal nor account total
  discountAmount = Math.min(discountAmount, eligibleSubtotal, accountTotal);
  discountAmount = Math.max(0, Math.round((discountAmount + Number.EPSILON) * 100) / 100);

  const finalTotal = Math.max(
    0,
    Math.round((accountTotal - discountAmount + Number.EPSILON) * 100) / 100
  );

  return {
    promotionId: promoId,
    name: promo.name,
    code: promo.code,
    type: promo.type,
    rule: ruleDescription,
    isEligible: discountAmount > 0 || eligibleUnits.length >= 2,
    ineligibilityReason: discountAmount === 0 && promo.type === 'two_for_one'
      ? 'Falta 1 unidad adicional para completar la pareja 2x1.'
      : undefined,
    eligibleUnitsCount: eligibleUnits.length,
    eligibleSubtotal,
    discountAmount,
    benefitedItems,
    originalTotal: accountTotal,
    finalTotal,
    appliedAt: evalDate,
  };
}
