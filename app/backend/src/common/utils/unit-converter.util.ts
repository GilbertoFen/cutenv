export type UnitDimension = 'mass' | 'volume' | 'count' | 'unknown';

const UNIT_ALIASES: Record<string, { dimension: UnitDimension; factorToBase: number; standard: string }> = {
  // Volumen (Base: ml)
  ml: { dimension: 'volume', factorToBase: 1, standard: 'ml' },
  mililitro: { dimension: 'volume', factorToBase: 1, standard: 'ml' },
  mililitros: { dimension: 'volume', factorToBase: 1, standard: 'ml' },
  l: { dimension: 'volume', factorToBase: 1000, standard: 'ml' },
  lt: { dimension: 'volume', factorToBase: 1000, standard: 'ml' },
  litro: { dimension: 'volume', factorToBase: 1000, standard: 'ml' },
  litros: { dimension: 'volume', factorToBase: 1000, standard: 'ml' },
  oz_fl: { dimension: 'volume', factorToBase: 29.5735, standard: 'ml' },
  taza: { dimension: 'volume', factorToBase: 240, standard: 'ml' },
  cucharada: { dimension: 'volume', factorToBase: 15, standard: 'ml' },
  cucharadita: { dimension: 'volume', factorToBase: 5, standard: 'ml' },

  // Masa (Base: g)
  g: { dimension: 'mass', factorToBase: 1, standard: 'g' },
  gr: { dimension: 'mass', factorToBase: 1, standard: 'g' },
  gramo: { dimension: 'mass', factorToBase: 1, standard: 'g' },
  gramos: { dimension: 'mass', factorToBase: 1, standard: 'g' },
  kg: { dimension: 'mass', factorToBase: 1000, standard: 'g' },
  kilo: { dimension: 'mass', factorToBase: 1000, standard: 'g' },
  kilos: { dimension: 'mass', factorToBase: 1000, standard: 'g' },
  kilogramo: { dimension: 'mass', factorToBase: 1000, standard: 'g' },
  kilogramos: { dimension: 'mass', factorToBase: 1000, standard: 'g' },
  mg: { dimension: 'mass', factorToBase: 0.001, standard: 'g' },
  oz: { dimension: 'mass', factorToBase: 28.3495, standard: 'g' },
  onza: { dimension: 'mass', factorToBase: 28.3495, standard: 'g' },
  onzas: { dimension: 'mass', factorToBase: 28.3495, standard: 'g' },
  lb: { dimension: 'mass', factorToBase: 453.592, standard: 'g' },
  libra: { dimension: 'mass', factorToBase: 453.592, standard: 'g' },
  libras: { dimension: 'mass', factorToBase: 453.592, standard: 'g' },

  // Conteo (Base: pieza)
  pza: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  pieza: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  piezas: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  unidad: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  unidades: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  porcion: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  porciones: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  rebanada: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  rebanadas: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  huevo: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  huevos: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  lata: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  latas: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  sobre: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
  sobres: { dimension: 'count', factorToBase: 1, standard: 'pieza' },
};

export function normalizeUnit(unit?: string): string {
  if (!unit) return '';
  return unit.toLowerCase().trim().replace(/[\s_.-]+/g, '');
}

export function getUnitInfo(unit?: string) {
  const norm = normalizeUnit(unit);
  return UNIT_ALIASES[norm] || { dimension: 'unknown' as UnitDimension, factorToBase: 1, standard: norm || 'unidad' };
}

/**
 * Convierte una cantidad de una unidad a otra siempre que pertenezcan a la misma dimensión.
 * Si son incompatibles (ej. gramos a mililitros), lanza un error o devuelve cantidad original según strict.
 */
export function convertUnit(quantity: number, fromUnit?: string, toUnit?: string, strict = false): number {
  if (!Number.isFinite(quantity) || quantity === 0) return 0;

  const from = getUnitInfo(fromUnit);
  const to = getUnitInfo(toUnit);

  const normFrom = normalizeUnit(fromUnit);
  const normTo = normalizeUnit(toUnit);

  if (normFrom === normTo || !normFrom || !normTo) {
    return quantity;
  }

  // Si ambas unidades son conocidas
  if (from.dimension !== 'unknown' && to.dimension !== 'unknown') {
    if (from.dimension !== to.dimension) {
      if (strict) {
        throw new Error(`Conversión incompatible: no es posible convertir ${fromUnit} (${from.dimension}) a ${toUnit} (${to.dimension})`);
      }
      console.warn(`[unit-converter] Advertencia: magnitudes incompatibles ${fromUnit} (${from.dimension}) -> ${toUnit} (${to.dimension}). Usando cantidad original.`);
      return quantity;
    }

    // Convertir de origen a base, luego de base a destino
    const inBase = quantity * from.factorToBase;
    const inTarget = inBase / to.factorToBase;
    return +inTarget.toFixed(4);
  }

  // Compatibilidad legacy directa
  if ((normFrom === 'g' || normFrom === 'gr') && (normTo === 'kg' || normTo === 'kilos')) return +(quantity / 1000).toFixed(4);
  if ((normFrom === 'kg' || normFrom === 'kilos') && (normTo === 'g' || normTo === 'gr')) return +(quantity * 1000).toFixed(4);
  if ((normFrom === 'ml') && (normTo === 'l' || normTo === 'lt')) return +(quantity / 1000).toFixed(4);
  if ((normFrom === 'l' || normFrom === 'lt') && normTo === 'ml') return +(quantity * 1000).toFixed(4);

  return quantity;
}

/**
 * Calcula la existencia resultante a partir de paquetes comprados, contenido y unidad base.
 * Ej: 1 caja de 12 botellas de 1.5 L con baseUnit 'ml':
 * packages = 1, contentPerUnit = 12 * 1.5 = 18, contentUnit = 'l', baseUnit = 'ml'
 * Resultado = 18 * 1000 = 18000 ml.
 */
export function computeTotalBaseStock(
  packagesBought: number,
  contentPerPackage: number,
  contentUnit?: string,
  baseUnit?: string
): number {
  const totalContent = (packagesBought || 0) * (contentPerPackage || 1);
  return convertUnit(totalContent, contentUnit, baseUnit);
}
