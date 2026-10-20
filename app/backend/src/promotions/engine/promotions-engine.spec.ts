import {
  evaluatePromotion,
  isPromotionActiveToday,
  isItemEligible,
  PromotionRuleDefinition,
  EvaluatedItem,
} from './promotions-engine';

describe('PromotionsEngine (Dominio de Promociones y Descuentos)', () => {
  describe('Caso de Negocio Específico: 2x1 en Bebidas', () => {
    const promo2x1Bebidas: PromotionRuleDefinition = {
      _id: 'promo_bebidas_2x1',
      name: '2x1 en Bebidas',
      type: 'two_for_one',
      scope: 'categories',
      targetCategories: ['Bebidas'],
      daysOfWeek: [], // Aplica todos los días
      isActive: true,
      applyMode: 'mix_and_match',
    };

    it('debe aplicar 2x1 exclusivamente a las bebidas (3 refrescos de $35, 2 hamburguesas de $120, 1 ensalada de $85)', () => {
      // 3 refrescos de $35 (Bebidas) -> subtotal $105
      // 2 hamburguesas de $120 (Comida) -> subtotal $240
      // 1 ensalada de $85 (Comida) -> subtotal $85
      // Total general: $430
      const items: EvaluatedItem[] = [
        { recipeId: 'refresco_1', recipeName: 'Refresco Cola', category: 'Bebidas', price: 35, quantity: 3 },
        { recipeId: 'burger_1', recipeName: 'Hamburguesa Especial', category: 'Comida', price: 120, quantity: 2 },
        { recipeId: 'salad_1', recipeName: 'Ensalada César', category: 'Comida', price: 85, quantity: 1 },
      ];

      const accountTotal = 3 * 35 + 2 * 120 + 1 * 85; // 430
      expect(accountTotal).toBe(430);

      const result = evaluatePromotion(promo2x1Bebidas, items, accountTotal);

      // Reglas estrictas:
      // Unidades elegibles = 3 refrescos
      expect(result.eligibleUnitsCount).toBe(3);
      expect(result.eligibleSubtotal).toBe(105);

      // Descuento = $35 (1 pareja válida, 1 unidad bonificada, el 3er refresco sin pareja)
      expect(result.discountAmount).toBe(35);

      // El total final debe ser $395 ($430 - $35)
      expect(result.finalTotal).toBe(395);

      // Las hamburguesas y la ensalada no deben verse afectadas
      expect(result.benefitedItems.length).toBe(1);
      expect(result.benefitedItems[0]).toContain('Refresco Cola');
      expect(result.benefitedItems[0]).not.toContain('Hamburguesa');
      expect(result.benefitedItems[0]).not.toContain('Ensalada');
    });

    it('debe bonificar la unidad de menor precio dentro de cada pareja cuando los precios son distintos', () => {
      // 1 cerveza artesanal de $70 y 1 agua mineral de $30
      const items: EvaluatedItem[] = [
        { recipeId: 'beer_1', recipeName: 'Cerveza Artesanal', category: 'Bebidas', price: 70, quantity: 1 },
        { recipeId: 'water_1', recipeName: 'Agua Mineral', category: 'Bebidas', price: 30, quantity: 1 },
      ];

      const total = 100;
      const result = evaluatePromotion(promo2x1Bebidas, items, total);

      expect(result.eligibleUnitsCount).toBe(2);
      expect(result.eligibleSubtotal).toBe(100);
      // La unidad bonificada debe ser la de menor precio ($30)
      expect(result.discountAmount).toBe(30);
      expect(result.finalTotal).toBe(70);
      expect(result.benefitedItems[0]).toContain('Agua Mineral ($30.00) cortesía 2x1 al comprar Cerveza Artesanal ($70.00)');
    });

    it('no debe otorgar descuento si solo hay 1 bebida (sin pareja)', () => {
      const items: EvaluatedItem[] = [
        { recipeId: 'beer_1', recipeName: 'Cerveza', category: 'Bebidas', price: 50, quantity: 1 },
        { recipeId: 'burger_1', recipeName: 'Hamburguesa', category: 'Comida', price: 120, quantity: 1 },
      ];

      const result = evaluatePromotion(promo2x1Bebidas, items, 170);
      expect(result.eligibleUnitsCount).toBe(1);
      expect(result.discountAmount).toBe(0);
      expect(result.finalTotal).toBe(170);
      expect(result.ineligibilityReason).toContain('Falta 1 unidad adicional');
    });

    it('no debe otorgar descuento si no hay bebidas en el pedido', () => {
      const items: EvaluatedItem[] = [
        { recipeId: 'burger_1', recipeName: 'Hamburguesa', category: 'Comida', price: 120, quantity: 2 },
      ];

      const result = evaluatePromotion(promo2x1Bebidas, items, 240);
      expect(result.eligibleUnitsCount).toBe(0);
      expect(result.discountAmount).toBe(0);
      expect(result.finalTotal).toBe(240);
      expect(result.isEligible).toBe(false);
    });

    it('debe respetar el límite de aplicaciones máximas por pedido si está configurado', () => {
      const promoConLimite: PromotionRuleDefinition = {
        ...promo2x1Bebidas,
        maxApplicationsPerOrder: 1, // Máximo 1 beneficio 2x1 por orden
      };

      // 4 refrescos de $40 (normalmente 2 gratis, pero el límite es 1)
      const items: EvaluatedItem[] = [
        { recipeId: 'refresco_1', recipeName: 'Refresco', category: 'Bebidas', price: 40, quantity: 4 },
      ];

      const result = evaluatePromotion(promoConLimite, items, 160);
      expect(result.eligibleUnitsCount).toBe(4);
      expect(result.discountAmount).toBe(40); // Solo 1 par bonificado
      expect(result.finalTotal).toBe(120);
    });

    it('debe respetar modo same_product cuando la promoción exige parejas del mismo producto', () => {
      const promoSameProduct: PromotionRuleDefinition = {
        ...promo2x1Bebidas,
        applyMode: 'same_product',
      };

      // 1 Cerveza ($50) y 1 Vino ($100). No forman pareja por ser platillos diferentes
      const items: EvaluatedItem[] = [
        { recipeId: 'beer_1', recipeName: 'Cerveza', category: 'Bebidas', price: 50, quantity: 1 },
        { recipeId: 'wine_1', recipeName: 'Vino', category: 'Bebidas', price: 100, quantity: 1 },
      ];

      const result = evaluatePromotion(promoSameProduct, items, 150);
      expect(result.discountAmount).toBe(0);
      expect(result.finalTotal).toBe(150);

      // Ahora si agrega otra cerveza (2 cervezas de $50), se bonifica 1 cerveza
      const itemsConPareja: EvaluatedItem[] = [
        { recipeId: 'beer_1', recipeName: 'Cerveza', category: 'Bebidas', price: 50, quantity: 2 },
        { recipeId: 'wine_1', recipeName: 'Vino', category: 'Bebidas', price: 100, quantity: 1 },
      ];

      const resultConPareja = evaluatePromotion(promoSameProduct, itemsConPareja, 200);
      expect(resultConPareja.discountAmount).toBe(50);
      expect(resultConPareja.finalTotal).toBe(150);
    });
  });

  describe('Descuento Porcentual y Fijo por Categoría', () => {
    it('debe calcular 20% de descuento exclusivamente sobre la categoría Postres', () => {
      const promo20Postres: PromotionRuleDefinition = {
        _id: 'promo_postres_20',
        name: '20% en Postres',
        type: 'percentage_discount',
        discountValue: 20,
        scope: 'categories',
        targetCategories: ['Postres'],
        isActive: true,
      };

      const items: EvaluatedItem[] = [
        { recipeId: 'pastel_1', recipeName: 'Pastel de Chocolate', category: 'Postres', price: 80, quantity: 2 }, // $160
        { recipeId: 'corte_1', recipeName: 'Corte Ribeye', category: 'Carnes', price: 400, quantity: 1 }, // $400
      ];

      const accountTotal = 560;
      const result = evaluatePromotion(promo20Postres, items, accountTotal);

      // Base elegible: $160. Descuento: 20% de $160 = $32
      expect(result.eligibleSubtotal).toBe(160);
      expect(result.discountAmount).toBe(32);
      expect(result.finalTotal).toBe(528); // 560 - 32
    });

    it('debe limitar el descuento fijo para no superar el subtotal elegible', () => {
      const promoFija: PromotionRuleDefinition = {
        _id: 'promo_fija_100',
        name: '$100 en Café',
        type: 'fixed_discount',
        discountValue: 100,
        scope: 'categories',
        targetCategories: ['Cafetería'],
        isActive: true,
      };

      // Si solo compra 1 café de $45, el descuento no puede ser de $100
      const items: EvaluatedItem[] = [
        { recipeId: 'cafe_1', recipeName: 'Capuccino', category: 'Cafetería', price: 45, quantity: 1 },
      ];

      const result = evaluatePromotion(promoFija, items, 45);
      expect(result.discountAmount).toBe(45); // Limitado a la base
      expect(result.finalTotal).toBe(0);
    });
  });

  describe('Validación de Horarios y Días de la Semana', () => {
    it('debe rechazar una promoción si el día de la semana no coincide', () => {
      const promoMartes: PromotionRuleDefinition = {
        _id: 'promo_martes',
        name: 'Solo Martes',
        type: 'two_for_one',
        daysOfWeek: [2], // Solo martes
        isActive: true,
      };

      // Evaluar en un lunes (día 1)
      const fechaLunes = new Date('2026-10-19T12:00:00'); // Lunes
      const check = isPromotionActiveToday(promoMartes, fechaLunes);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('solo aplica en días: Martes');
    });

    it('debe aprobar una promoción si el día de la semana coincide', () => {
      const promoMartes: PromotionRuleDefinition = {
        _id: 'promo_martes',
        name: 'Solo Martes',
        type: 'two_for_one',
        daysOfWeek: [2],
        isActive: true,
      };

      // Evaluar en un martes (día 2)
      const fechaMartes = new Date('2026-10-20T12:00:00'); // Martes
      const check = isPromotionActiveToday(promoMartes, fechaMartes);
      expect(check.valid).toBe(true);
    });

    it('debe rechazar una promoción si la fecha actual es posterior a la fecha de término', () => {
      const promoVencida: PromotionRuleDefinition = {
        _id: 'promo_vencida',
        name: 'Promoción Fin de Verano',
        type: 'fixed_discount',
        endDate: new Date('2026-08-31'),
        isActive: true,
      };

      const fechaOctubre = new Date('2026-10-19T12:00:00');
      const check = isPromotionActiveToday(promoVencida, fechaOctubre);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('venció el');
    });
  });
});
