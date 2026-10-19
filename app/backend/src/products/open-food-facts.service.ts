import { Injectable, Logger } from '@nestjs/common';

export interface OpenFoodFactsNormalizedProduct {
  barCode: string;
  name: string;
  brand: string;
  quantity: number;
  unitMesure: string;
  category: string;
  description: string;
  imageUrl?: string;
  servingSize?: string;
  nutriments?: {
    energyKcal?: number;
    proteins?: number;
    fat?: number;
    sugars?: number;
    sodium?: number;
  };
}

export interface OpenFoodFactsLookupResult {
  found: boolean;
  source: 'openfoodfacts' | 'none';
  code: string;
  data?: OpenFoodFactsNormalizedProduct;
  message?: string;
}

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);
  private readonly baseUrl = 'https://world.openfoodfacts.org/api/v3/product';
  private readonly userAgent = 'POSRestaurante - Web/1.0 (contact: admin@posrestaurante.local)';

  async lookupByBarcode(rawCode: string): Promise<OpenFoodFactsLookupResult> {
    const code = String(rawCode || '').trim();
    if (!code) {
      return { found: false, source: 'none', code: '', message: 'Código de barras no proporcionado' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const url = `${this.baseUrl}/${encodeURIComponent(code)}.json`;
      this.logger.log(`Consultando Open Food Facts API v3: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 404) {
        return {
          found: false,
          source: 'none',
          code,
          message: 'Producto no encontrado en Open Food Facts',
        };
      }

      if (response.status === 429) {
        this.logger.warn(`Open Food Facts: Límite de peticiones alcanzado (429)`);
        return {
          found: false,
          source: 'none',
          code,
          message: 'Límite de consultas externas alcanzado temporalmente. Puede registrar el producto manualmente.',
        };
      }

      if (!response.ok) {
        this.logger.warn(`Open Food Facts error HTTP ${response.status}`);
        return {
          found: false,
          source: 'none',
          code,
          message: `Servicio Open Food Facts devolvió código ${response.status}. Puede dar de alta manualmente.`,
        };
      }

      const json = await response.json();

      if (json.status === 'failure' || !json.product) {
        return {
          found: false,
          source: 'none',
          code,
          message: 'Producto no registrado en Open Food Facts.',
        };
      }

      const p = json.product;
      const normalized = this.normalizeProduct(code, p);

      return {
        found: true,
        source: 'openfoodfacts',
        code,
        data: normalized,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        this.logger.warn(`Timeout al consultar Open Food Facts para el código: ${code}`);
        return {
          found: false,
          source: 'none',
          code,
          message: 'Tiempo de espera agotado al consultar la base de datos externa. Puede continuar manualmente.',
        };
      }

      this.logger.error(`Error en consulta Open Food Facts: ${err.message}`);
      return {
        found: false,
        source: 'none',
        code,
        message: 'No fue posible conectar con Open Food Facts. Ingrese los datos manualmente.',
      };
    }
  }

  private normalizeProduct(code: string, p: any): OpenFoodFactsNormalizedProduct {
    const rawName =
      p.product_name_es ||
      p.product_name ||
      p.generic_name_es ||
      p.generic_name ||
      p.brands ||
      `Producto (${code})`;

    const brand = p.brands || p.brand_owner || 'Sin marca';

    // Parsear cantidad y unidad declarada (ej: "330 ml", "1 kg", "250 g", "1.5 L")
    const { quantity, unit } = this.parseQuantity(p.quantity, p.serving_size);

    // Categoría principal limpia
    const rawCat = p.categories_hierarchy?.[0] || p.categories || '';
    const cleanCat = this.cleanCategory(rawCat);

    // Ingredientes o descripción
    const description =
      p.ingredients_text_es ||
      p.ingredients_text ||
      p.generic_name_es ||
      p.generic_name ||
      `Importado desde Open Food Facts (${code})`;

    // Imagen
    const imageUrl =
      p.image_front_url ||
      p.image_url ||
      p.selected_images?.front?.display?.es ||
      p.selected_images?.front?.display?.en ||
      undefined;

    // Información nutricional si está disponible
    let nutriments: OpenFoodFactsNormalizedProduct['nutriments'] = undefined;
    if (p.nutriments) {
      nutriments = {
        energyKcal: p.nutriments['energy-kcal_100g'] ?? p.nutriments['energy-kcal'],
        proteins: p.nutriments['proteins_100g'] ?? p.nutriments['proteins'],
        fat: p.nutriments['fat_100g'] ?? p.nutriments['fat'],
        sugars: p.nutriments['sugars_100g'] ?? p.nutriments['sugars'],
        sodium: p.nutriments['sodium_100g'] ?? p.nutriments['sodium'],
      };
    }

    return {
      barCode: code,
      name: rawName.trim(),
      brand: brand.trim(),
      quantity,
      unitMesure: unit,
      category: cleanCat,
      description: description.trim(),
      imageUrl,
      servingSize: p.serving_size || undefined,
      nutriments,
    };
  }

  private parseQuantity(rawQty?: string, servingSize?: string): { quantity: number; unit: string } {
    const text = String(rawQty || servingSize || '').trim().toLowerCase();
    if (!text) return { quantity: 1, unit: 'pza' };

    // Ej: "330 ml", "1.5 l", "500g", "1 kg", "250 gr"
    const match = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*([a-záéíóú]+)?/i);
    if (!match) return { quantity: 1, unit: 'pza' };

    const num = parseFloat(match[1].replace(',', '.'));
    const rawUnit = (match[2] || '').trim();

    let unit = 'pza';
    if (/^(g|gr|gramos|grams)$/.test(rawUnit)) unit = 'g';
    else if (/^(kg|kilos|kilogramos)$/.test(rawUnit)) unit = 'kg';
    else if (/^(ml|mililitros)$/.test(rawUnit)) unit = 'ml';
    else if (/^(l|lt|litros|litres)$/.test(rawUnit)) unit = 'l';
    else if (/^(oz|onzas)$/.test(rawUnit)) unit = 'oz';
    else if (/^(pza|pz|pieza|piezas|unidades|unit)$/.test(rawUnit)) unit = 'pza';
    else if (rawUnit) unit = rawUnit;

    return {
      quantity: Number.isFinite(num) && num > 0 ? num : 1,
      unit,
    };
  }

  private cleanCategory(cat: string): string {
    if (!cat) return 'Abarrotes';
    // Remueve prefijos como "en:beverages", "es:lacteos"
    const cleaned = cat.split(',')[0].replace(/^[a-z]{2}:/, '').replace(/-/g, ' ').trim();
    // Capitalizar primera letra
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Abarrotes';
  }
}
