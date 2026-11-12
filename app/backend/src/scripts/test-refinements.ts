import { evaluatePromotion, isPromotionActiveToday, EvaluatedItem, PromotionRuleDefinition } from '../promotions/engine/promotions-engine';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

async function runTests() {
  console.log('--- TEST 1: 2x1 Mix & Match (cheapest bonified) ---');
  const promo2x1: PromotionRuleDefinition = {
    name: 'Sushi 2x1 Martes',
    type: 'two_for_one',
    buyQuantity: 2,
    getQuantity: 1,
    applyMode: 'mix_and_match',
    scope: 'all',
    isActive: true,
  };

  const items1: EvaluatedItem[] = [
    { recipeId: 'rec1', recipeName: 'Roll Especial', price: 150, quantity: 1 },
    { recipeId: 'rec2', recipeName: 'Roll California', price: 100, quantity: 1 },
  ];

  const res1 = evaluatePromotion(promo2x1, items1, 250, { ignoreScheduleValidation: true });
  assert(res1.isEligible === true, '2x1 is eligible with 2 items');
  assert(res1.discountAmount === 100, `Discount amount should be 100 (cheapest roll), got ${res1.discountAmount}`);
  assert(res1.finalTotal === 150, `Final total should be 150, got ${res1.finalTotal}`);

  console.log('--- TEST 2: Category discount with Excluded Recipes ---');
  const promoCategory: PromotionRuleDefinition = {
    name: 'Descuento Bebidas excepto Premium',
    type: 'percentage_discount',
    discountValue: 20,
    scope: 'categories',
    targetCategories: ['bebidas'],
    excludedRecipes: ['rec_champagne'],
    isActive: true,
  };

  const items2: EvaluatedItem[] = [
    { recipeId: 'rec_soda', recipeName: 'Refresco', category: 'bebidas', price: 40, quantity: 2 }, // 80 -> 20% = 16
    { recipeId: 'rec_champagne', recipeName: 'Champagne Moët', category: 'bebidas', price: 2000, quantity: 1 }, // Excluded!
    { recipeId: 'rec_taco', recipeName: 'Taco', category: 'comida', price: 50, quantity: 2 }, // Different cat
  ];

  const res2 = evaluatePromotion(promoCategory, items2, 2180, { ignoreScheduleValidation: true });
  assert(res2.isEligible === true, 'Category promotion eligible');
  assert(res2.eligibleUnitsCount === 2, `Eligible units should be 2 (sodas), got ${res2.eligibleUnitsCount}`);
  assert(res2.discountAmount === 16, `Discount should be 16 (20% of 80), got ${res2.discountAmount}`);
  assert(res2.finalTotal === 2164, `Final total should be 2164, got ${res2.finalTotal}`);

  console.log('--- TEST 3: Birthday Promotion (100% bonification) ---');
  const promoBday: PromotionRuleDefinition = {
    name: 'Cortesía de Cumpleaños',
    type: 'birthday',
    scope: 'all',
    requiresAuth: true,
    isActive: true,
  };

  const items3: EvaluatedItem[] = [
    { recipeId: 'rec_burger', recipeName: 'Hamburguesa Deluxe', price: 180, quantity: 2 }, // 360
  ];

  const res3 = evaluatePromotion(promoBday, items3, 360, { ignoreScheduleValidation: true });
  assert(res3.isEligible === true, 'Birthday promotion eligible');
  assert(res3.discountAmount === 360, `Birthday discount should be 360, got ${res3.discountAmount}`);
  assert(res3.finalTotal === 0, `Final total should be 0, got ${res3.finalTotal}`);

  console.log('--- TEST 4: Package Gift Promotion (Buy Burger, get free soda) ---');
  const promoGift: PromotionRuleDefinition = {
    name: 'Combo Burger + Refresco gratis',
    type: 'package_gift',
    triggerRecipeId: 'rec_burger',
    triggerQuantity: 1,
    rewardRecipeId: 'rec_soda',
    rewardQuantity: 1,
    discountValue: 100, // 100% off reward
    isActive: true,
  };

  // Case 4a: Burger + Soda present
  const items4a: EvaluatedItem[] = [
    { recipeId: 'rec_burger', recipeName: 'Hamburguesa', price: 150, quantity: 2 },
    { recipeId: 'rec_soda', recipeName: 'Refresco', price: 35, quantity: 2 },
  ];
  const res4a = evaluatePromotion(promoGift, items4a, 370, { ignoreScheduleValidation: true });
  assert(res4a.isEligible === true, 'Gift promotion eligible');
  assert(res4a.discountAmount === 70, `Discount should be 70 (2 free sodas for 2 burgers), got ${res4a.discountAmount}`);
  assert(res4a.finalTotal === 300, `Final total should be 300, got ${res4a.finalTotal}`);

  // Case 4b: Only Burger, no soda yet -> Ineligible with clear message
  const items4b: EvaluatedItem[] = [
    { recipeId: 'rec_burger', recipeName: 'Hamburguesa', price: 150, quantity: 1 },
  ];
  const res4b = evaluatePromotion(promoGift, items4b, 150, { ignoreScheduleValidation: true });
  assert(res4b.isEligible === false, 'Gift promotion ineligible when reward not added to ticket');
  assert(Boolean(res4b.ineligibilityReason && res4b.ineligibilityReason.includes('producto de regalo')), 'Clear ineligibility reason for reward missing');

  console.log('--- TEST 5: Time window schedule check ---');
  const promoHours: PromotionRuleDefinition = {
    name: 'Happy Hour',
    type: 'percentage_discount',
    discountValue: 50,
    startTime: '14:00',
    endTime: '18:00',
    isActive: true,
  };

  const beforeTime = new Date('2026-11-02T10:00:00');
  const inTime = new Date('2026-11-02T16:00:00');
  const afterTime = new Date('2026-11-02T20:00:00');

  assert(isPromotionActiveToday(promoHours, beforeTime).valid === false, 'Before window rejected');
  assert(isPromotionActiveToday(promoHours, inTime).valid === true, 'Inside window accepted');
  assert(isPromotionActiveToday(promoHours, afterTime).valid === false, 'After window rejected');

  console.log('\n🎉 ALL REFINEMENT UNIT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});

