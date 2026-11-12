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
  type:
    | 'two_for_one'
    | 'percentage_discount'
    | 'fixed_discount'
    | 'birthday'
    | 'package_gift';
  daysOfWeek?: number[];
  startDate?: Date | string;
  endDate?: Date | string;
  startTime?: string;
  endTime?: string;
  scope?: 'all' | 'categories' | 'recipes';
  targetCategories?: string[];
  applicableCategories?: string[];
  targetRecipes?: any[];
  excludedRecipes?: any[];
  buyQuantity?: number;
  getQuantity?: number;
  triggerRecipeId?: any;
  triggerQuantity?: number;
  rewardRecipeId?: any;
  rewardQuantity?: number;
  discountValue?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  maxApplicationsPerOrder?: number;
  applyMode?: 'mix_and_match' | 'same_product';
  requiresAuth?: boolean;
  isCumulative?: boolean;
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

  // Time window check: HH:mm en horario local del restaurante
  if (promo.startTime || promo.endTime) {
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMin = currentHours * 60 + currentMinutes;

    if (promo.startTime) {
      const [sh, sm] = promo.startTime.split(':').map((v) => parseInt(v, 10));
      if (!isNaN(sh) && !isNaN(sm)) {
        const startTotalMin = sh * 60 + sm;
        if (currentTotalMin < startTotalMin) {
          return {
            valid: false,
            reason: `Esta promoción solo aplica a partir de las ${promo.startTime} hrs`,
          };
        }
      }
    }

    if (promo.endTime) {
      const [eh, em] = promo.endTime.split(':').map((v) => parseInt(v, 10));
      if (!isNaN(eh) && !isNaN(em)) {
        const endTotalMin = eh * 60 + em;
        if (currentTotalMin > endTotalMin) {
          return {
            valid: false,
            reason: `Esta promoción venció por horario a las ${promo.endTime} hrs`,
          };
        }
      }
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
  const itemRecId = item.recipeId ? String(item.recipeId) : '';

  // Exclusiones explícitas de recetas tienen prioridad máxima
  const excludedRecipeIds = (promo.excludedRecipes || []).map((r) =>
    (typeof r === 'object' && r ? (r._id || r.id || r).toString() : String(r))
  );
  if (itemRecId && excludedRecipeIds.includes(itemRecId)) {
    return false;
  }

  // Si es regalo por paquete, verificar detonante o recompensa
  if (promo.type === 'package_gift') {
    const triggerId = promo.triggerRecipeId
      ? (typeof promo.triggerRecipeId === 'object' ? promo.triggerRecipeId._id || promo.triggerRecipeId.id : promo.triggerRecipeId).toString()
      : '';
    const rewardId = promo.rewardRecipeId
      ? (typeof promo.rewardRecipeId === 'object' ? promo.rewardRecipeId._id || promo.rewardRecipeId.id : promo.rewardRecipeId).toString()
      : '';
    return itemRecId === triggerId || itemRecId === rewardId;
  }

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
    if (!itemRecId) return false;
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

  // 3. Manejo especial de promociones por paquete o producto de regalo (package_gift)
  if (promo.type === 'package_gift') {
    const triggerId = promo.triggerRecipeId
      ? (typeof promo.triggerRecipeId === 'object'
          ? promo.triggerRecipeId._id || promo.triggerRecipeId.id
          : promo.triggerRecipeId
        ).toString()
      : '';
    const rewardId = promo.rewardRecipeId
      ? (typeof promo.rewardRecipeId === 'object'
          ? promo.rewardRecipeId._id || promo.rewardRecipeId.id
          : promo.rewardRecipeId
        ).toString()
      : '';
    const triggerRequired = Math.max(1, promo.triggerQuantity || 1);
    const rewardPerSet = Math.max(1, promo.rewardQuantity || 1);

    let totalTriggerCount = 0;
    let totalRewardCount = 0;
    let triggerItemName = 'Producto requerido';
    let rewardItemName = 'Producto de regalo';
    let rewardPrice = 0;

    for (const it of items) {
      const rId = it.recipeId ? String(it.recipeId) : '';
      const qty = Math.max(0, Math.floor(it.quantity || 0));
      if (rId === triggerId) {
        totalTriggerCount += qty;
        triggerItemName = it.recipeName || triggerItemName;
      }
      if (rId === rewardId) {
        totalRewardCount += qty;
        rewardItemName = it.recipeName || rewardItemName;
        rewardPrice = Math.max(0, Number(it.price) || 0);
      }
    }

    if (totalTriggerCount < triggerRequired) {
      return {
        promotionId: promoId,
        name: promo.name,
        code: promo.code,
        type: promo.type,
        rule: `Paquete de regalo (${triggerRequired}x ${triggerItemName} + ${rewardPerSet}x ${rewardItemName})`,
        isEligible: false,
        ineligibilityReason: `La cuenta requiere al menos ${triggerRequired} unidad(es) de "${triggerItemName}" para activar este regalo (actualmente tiene ${totalTriggerCount}).`,
        eligibleUnitsCount: totalTriggerCount,
        eligibleSubtotal: 0,
        discountAmount: 0,
        benefitedItems: [],
        originalTotal: accountTotal,
        finalTotal: accountTotal,
        appliedAt: evalDate,
      };
    }

    if (totalRewardCount === 0) {
      return {
        promotionId: promoId,
        name: promo.name,
        code: promo.code,
        type: promo.type,
        rule: `Paquete de regalo (${triggerRequired}x ${triggerItemName} + ${rewardPerSet}x ${rewardItemName})`,
        isEligible: false,
        ineligibilityReason: `La orden califica con ${totalTriggerCount}x "${triggerItemName}", pero debes agregar el producto de regalo ("${rewardItemName}") al pedido para aplicar la bonificación.`,
        eligibleUnitsCount: totalTriggerCount,
        eligibleSubtotal: 0,
        discountAmount: 0,
        benefitedItems: [],
        originalTotal: accountTotal,
        finalTotal: accountTotal,
        appliedAt: evalDate,
      };
    }

    const sets = Math.floor(totalTriggerCount / triggerRequired);
    const maxSets =
      promo.maxApplicationsPerOrder && promo.maxApplicationsPerOrder > 0
        ? Math.min(sets, promo.maxApplicationsPerOrder)
        : sets;
    const rewardsToBonify = Math.min(totalRewardCount, maxSets * rewardPerSet);
    const pct =
      promo.discountValue && promo.discountValue > 0
        ? Math.min(100, promo.discountValue)
        : 100;
    let pkgDiscount =
      Math.round(
        (rewardsToBonify * rewardPrice * (pct / 100) + Number.EPSILON) * 100,
      ) / 100;

    if (
      promo.maxDiscountAmount &&
      promo.maxDiscountAmount > 0 &&
      pkgDiscount > promo.maxDiscountAmount
    ) {
      pkgDiscount = promo.maxDiscountAmount;
    }
    pkgDiscount = Math.min(pkgDiscount, accountTotal);

    const finalPkgTotal = Math.max(
      0,
      Math.round((accountTotal - pkgDiscount + Number.EPSILON) * 100) / 100,
    );

    return {
      promotionId: promoId,
      name: promo.name,
      code: promo.code,
      type: promo.type,
      rule: `Regalo: ${rewardsToBonify}x ${rewardItemName} de cortesía por compra de ${totalTriggerCount}x ${triggerItemName}`,
      isEligible: pkgDiscount > 0,
      eligibleUnitsCount: totalTriggerCount + rewardsToBonify,
      eligibleSubtotal: rewardsToBonify * rewardPrice,
      discountAmount: pkgDiscount,
      benefitedItems: [
        `${rewardsToBonify}x ${rewardItemName} ($${(rewardsToBonify * rewardPrice).toFixed(2)}) bonificado(s) de regalo al ${pct}% de descuento`,
      ],
      originalTotal: accountTotal,
      finalTotal: finalPkgTotal,
      appliedAt: evalDate,
    };
  }

  // 4. Extract eligible units for standard promotions (two_for_one, percentage, fixed, birthday)
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

  // 5. Calculate benefit strictly on eligible units
  if (promo.type === 'two_for_one') {
    const buyQty = Math.max(2, promo.buyQuantity || 2);
    const getQty = Math.max(1, Math.min(buyQty - 1, promo.getQuantity || 1));
    const payQty = buyQty - getQty;
    const applyMode = promo.applyMode || 'mix_and_match';
    const maxApplications = promo.maxApplicationsPerOrder && promo.maxApplicationsPerOrder > 0
      ? promo.maxApplicationsPerOrder
      : Infinity;

    if (applyMode === 'same_product') {
      ruleDescription = `${buyQty}x${payQty} por mismo producto`;
      const grouped = new Map<string, Unit[]>();
      for (const u of eligibleUnits) {
        const key = u.recipeId || u.name;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(u);
      }

      let applicationsDone = 0;
      for (const [, group] of grouped) {
        if (applicationsDone >= maxApplications) break;
        const setsCount = Math.floor(group.length / buyQty);
        const setsToApply = Math.min(setsCount, maxApplications - applicationsDone);

        for (let s = 0; s < setsToApply; s++) {
          for (let g = 0; g < getQty; g++) {
            const bonifiedUnit = group[s * buyQty + (buyQty - 1 - g)];
            discountAmount += bonifiedUnit.price;
            benefitedItems.push(
              `1x ${bonifiedUnit.name} ($${bonifiedUnit.price.toFixed(2)}) gratis por promoción ${buyQty}x${payQty} idéntico`
            );
          }
          applicationsDone++;
        }
      }
    } else {
      // Mix and match across eligible category/selection
      ruleDescription = `${buyQty}x${payQty} en productos participantes (Mix & Match)`;
      eligibleUnits.sort((a, b) => b.price - a.price);

      const totalSetsPossible = Math.floor(eligibleUnits.length / buyQty);
      const setsToApply = Math.min(totalSetsPossible, maxApplications);

      for (let s = 0; s < setsToApply; s++) {
        const setSlice = eligibleUnits.slice(s * buyQty, (s + 1) * buyQty);
        for (let g = 0; g < getQty; g++) {
          const secondary = setSlice[buyQty - 1 - g];
          const primary = setSlice[0];
          discountAmount += secondary.price;
          benefitedItems.push(
            `1x ${secondary.name} ($${secondary.price.toFixed(2)}) cortesía ${buyQty}x${payQty} al comprar ${primary.name} ($${primary.price.toFixed(2)})`
          );
        }
      }

      if (eligibleUnits.length < buyQty && totalSetsPossible === 0) {
        ruleDescription += ` (Se requieren al menos ${buyQty} unidades para obtener ${getQty} gratis)`;
      }
    }
  } else if (promo.type === 'birthday') {
    ruleDescription = 'Descuento de cumpleañero (100% de bonificación autorizada)';
    discountAmount = eligibleSubtotal;
    benefitedItems.push(
      `100% de bonificación por cumpleaños aplicada a ${eligibleUnits.length} producto(s) elegible(s) (Base: $${eligibleSubtotal.toFixed(2)})`
    );
  } else if (promo.type === 'percentage_discount') {
    const pct = Math.min(100, Math.max(0, promo.discountValue || 0));
    ruleDescription = `${pct}% de descuento sobre artículos participantes`;
    discountAmount = Math.round((eligibleSubtotal * (pct / 100) + Number.EPSILON) * 100) / 100;
    benefitedItems.push(
      `${pct}% de descuento aplicado exclusivamente a ${eligibleUnits.length} producto(s) elegible(s) (Base: $${eligibleSubtotal.toFixed(2)})`
    );
  } else if (promo.type === 'fixed_discount') {
    const fixedVal = Math.max(0, promo.discountValue || 0);
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

  const buyUnitsRequired = promo.buyQuantity || 2;
  const missingUnits = Math.max(0, buyUnitsRequired - eligibleUnits.length);

  return {
    promotionId: promoId,
    name: promo.name,
    code: promo.code,
    type: promo.type,
    rule: ruleDescription,
    isEligible: discountAmount > 0,
    ineligibilityReason:
      discountAmount === 0 && promo.type === 'two_for_one'
        ? `Se requieren al menos ${buyUnitsRequired} unidades participantes para aplicar esta promoción. Falta ${missingUnits} unidad adicional para completar el beneficio.`
        : discountAmount === 0
        ? 'El monto o los productos no generan descuento con las condiciones configuradas.'
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
