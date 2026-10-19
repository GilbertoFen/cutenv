import {
  LucideIcon,
  UtensilsCrossed,
  Salad,
  Soup,
  CookingPot,
  Beef,
  Drumstick,
  Fish,
  Sun,
  Sandwich,
  Pizza,
  Carrot,
  Cake,
  Coffee,
  Droplets,
  Croissant,
  Utensils,
  Apple,
  Milk,
  Egg,
  Wheat,
  Flame,
  Cookie,
  Snowflake,
  Sparkles,
  Box,
  Package,
} from 'lucide-react';

/**
 * Normaliza nombres de categoría eliminando acentos, caracteres especiales, espacios extras y pasando a minúsculas.
 */
export function normalizeCategory(category?: string | null): string {
  if (!category) return '';
  return category
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
    .replace(/[^a-z0-9\s]/g, '')     // Remueve caracteres no alfanuméricos
    .replace(/\s+/g, ' ');           // Colapsa múltiples espacios
}

/**
 * Mapeo de categorías de recetas a iconos SVG de Lucide
 */
const RECIPE_CATEGORY_MAP: Record<string, LucideIcon> = {
  // Entradas y aperitivos
  entradas: UtensilsCrossed,
  entrada: UtensilsCrossed,
  aperitivos: UtensilsCrossed,
  botanas: UtensilsCrossed,
  antojitos: UtensilsCrossed,
  starters: UtensilsCrossed,

  // Ensaladas
  ensaladas: Salad,
  ensalada: Salad,
  salads: Salad,

  // Sopas, cremas y caldos
  sopas: Soup,
  sopa: Soup,
  cremas: Soup,
  crema: Soup,
  caldos: Soup,
  caldo: Soup,
  soups: Soup,

  // Pastas
  pastas: CookingPot,
  pasta: CookingPot,
  fideos: CookingPot,
  espagueti: CookingPot,
  lasana: CookingPot,

  // Carnes y cortes
  carnes: Beef,
  carne: Beef,
  cortes: Beef,
  res: Beef,
  cerdo: Beef,
  parrilladas: Beef,
  meat: Beef,
  steak: Beef,

  // Pollo y aves
  pollo: Drumstick,
  pollos: Drumstick,
  alitas: Drumstick,
  aves: Drumstick,
  chicken: Drumstick,

  // Pescados y mariscos
  pescados: Fish,
  pescado: Fish,
  mariscos: Fish,
  marisco: Fish,
  seafood: Fish,
  fish: Fish,
  ceviche: Fish,

  // Desayunos
  desayunos: Sun,
  desayuno: Sun,
  huevos: Sun,
  chilaquiles: Sun,
  hotcakes: Sun,
  breakfast: Sun,

  // Hamburguesas, sándwiches y tortas
  hamburguesas: Sandwich,
  hamburguesa: Sandwich,
  sandwiches: Sandwich,
  sandwich: Sandwich,
  tortas: Sandwich,
  torta: Sandwich,
  burgers: Sandwich,
  hotdogs: Sandwich,

  // Pizzas
  pizzas: Pizza,
  pizza: Pizza,

  // Guarniciones
  guarniciones: Carrot,
  guarnicion: Carrot,
  acompanamientos: Carrot,
  sides: Carrot,
  papas: Carrot,

  // Postres y repostería
  postres: Cake,
  postre: Cake,
  pasteles: Cake,
  pastel: Cake,
  helados: Cake,
  dulces: Cake,
  dessert: Cake,

  // Bebidas
  bebidas: Coffee,
  bebida: Coffee,
  refrescos: Coffee,
  cocteles: Coffee,
  cervezas: Coffee,
  vinos: Coffee,
  jugos: Coffee,
  cafe: Coffee,
  drinks: Coffee,

  // Salsas y aderezos
  salsas: Droplets,
  salsa: Droplets,
  aderezos: Droplets,
  aderezo: Droplets,
  dips: Droplets,
  sauces: Droplets,

  // Panadería
  panaderia: Croissant,
  pan: Croissant,
  panes: Croissant,
  bakery: Croissant,
};

/**
 * Mapeo de categorías de insumos/ingredientes a iconos SVG de Lucide
 */
const INGREDIENT_CATEGORY_MAP: Record<string, LucideIcon> = {
  // Frutas
  frutas: Apple,
  fruta: Apple,
  fruits: Apple,

  // Verduras y hortalizas
  verduras: Carrot,
  verdura: Carrot,
  vegetales: Carrot,
  vegetal: Carrot,
  hortalizas: Carrot,
  hortaliza: Carrot,
  legumbres: Carrot,
  vegetables: Carrot,

  // Carnes
  carnes: Beef,
  carne: Beef,
  res: Beef,
  cerdo: Beef,
  meat: Beef,

  // Pollo
  pollo: Drumstick,
  aves: Drumstick,
  poultry: Drumstick,

  // Pescados y mariscos
  pescados: Fish,
  pescado: Fish,
  mariscos: Fish,
  marisco: Fish,
  seafood: Fish,

  // Lácteos
  lacteos: Milk,
  lacteo: Milk,
  leche: Milk,
  quesos: Milk,
  queso: Milk,
  crema: Milk,
  mantequilla: Milk,
  dairy: Milk,

  // Huevos
  huevos: Egg,
  huevo: Egg,
  blanquillos: Egg,
  eggs: Egg,

  // Cereales y granos
  cereales: Wheat,
  cereal: Wheat,
  granos: Wheat,
  semillas: Wheat,
  arroz: Wheat,
  frijol: Wheat,
  grains: Wheat,

  // Harinas y masas
  harinas: Wheat,
  harina: Wheat,
  masas: Wheat,
  flour: Wheat,

  // Aceites y grasas
  aceites: Droplets,
  aceite: Droplets,
  grasas: Droplets,
  manteca: Droplets,
  oils: Droplets,

  // Especias y condimentos
  especias: Flame,
  especia: Flame,
  condimentos: Flame,
  condimento: Flame,
  hierbas: Flame,
  chiles: Flame,
  pimienta: Flame,
  sal: Flame,
  spices: Flame,

  // Azúcares y endulzantes
  azucares: Cookie,
  azucar: Cookie,
  endulzantes: Cookie,
  miel: Cookie,
  sugar: Cookie,

  // Bebidas e insumos líquidos
  bebidas: Coffee,
  bebida: Coffee,
  liquidos: Coffee,
  jarabes: Coffee,
  drinks: Coffee,

  // Productos congelados
  congelados: Snowflake,
  congelado: Snowflake,
  frozen: Snowflake,

  // Productos de limpieza
  limpieza: Sparkles,
  quimicos: Sparkles,
  detergentes: Sparkles,
  cleaning: Sparkles,

  // Empaques y desechables
  empaques: Box,
  empaque: Box,
  desechables: Box,
  desechable: Box,
  cajas: Box,
  bolsas: Box,
  packaging: Box,
};

/**
 * Obtiene el icono SVG predeterminado para una receta según su categoría
 */
export function getRecipeCategoryIcon(category?: string | null): LucideIcon {
  const norm = normalizeCategory(category);
  if (!norm) return Utensils;

  // Búsqueda directa
  if (RECIPE_CATEGORY_MAP[norm]) {
    return RECIPE_CATEGORY_MAP[norm];
  }

  // Búsqueda por subcadena / inclusión
  for (const [key, icon] of Object.entries(RECIPE_CATEGORY_MAP)) {
    if (norm.includes(key) || key.includes(norm)) {
      return icon;
    }
  }

  return Utensils;
}

/**
 * Obtiene el icono SVG predeterminado para un insumo según su categoría
 */
export function getIngredientCategoryIcon(category?: string | null): LucideIcon {
  const norm = normalizeCategory(category);
  if (!norm) return Package;

  // Búsqueda directa
  if (INGREDIENT_CATEGORY_MAP[norm]) {
    return INGREDIENT_CATEGORY_MAP[norm];
  }

  // Búsqueda por subcadena / inclusión
  for (const [key, icon] of Object.entries(INGREDIENT_CATEGORY_MAP)) {
    if (norm.includes(key) || key.includes(norm)) {
      return icon;
    }
  }

  return Package;
}
