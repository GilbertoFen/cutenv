import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import mongoose, { Types } from 'mongoose';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../atlas-credentials.env') });

interface IngredientDefinition {
  canonicalName: string;
  category: string;
  unit: string; // 'g' | 'ml' | 'pza'
  purchaseUnit?: string;
  aliases: string[];
}

interface RecipeDefinition {
  name: string;
  category: string;
  station: 'fria' | 'caliente' | 'ninguna';
  price: number;
  steps?: string;
  ingredientKeys: string[];
}

// 1. Catálogo maestro de insumos/ingredientes necesarios para el menú Omikami Sushi 2025
const INGREDIENTS_CATALOG: IngredientDefinition[] = [
  // Pescados y Mariscos
  { canonicalName: 'Salmón fresco', category: 'Pescados y Mariscos', unit: 'g', purchaseUnit: 'kg', aliases: ['salmon', 'salmon fresco', 'salmón', 'salmón fresco', 'cubos de salmon', 'cubos de salmón', 'laminas de salmon', 'láminas de salmón fresco crudo', 'láminas de salmón'] },
  { canonicalName: 'Salmón ahumado', category: 'Pescados y Mariscos', unit: 'g', purchaseUnit: 'paquete', aliases: ['salmon ahumado', 'salmón ahumado', 'láminas de salmón ahumado', 'laminas de salmon ahumado'] },
  { canonicalName: 'Atún fresco', category: 'Pescados y Mariscos', unit: 'g', purchaseUnit: 'kg', aliases: ['atun', 'atún', 'atún fresco', 'atun fresco', 'láminas de atún fresco crudo', 'laminas de atun fresco crudo', 'atún o salmón', 'atun o salmon'] },
  { canonicalName: 'Atún spicy', category: 'Pescados y Mariscos', unit: 'g', purchaseUnit: 'kg', aliases: ['atun spicy', 'atún spicy', 'atun picante', 'atún picante'] },
  { canonicalName: 'Atún crujiente', category: 'Pescados y Mariscos', unit: 'g', purchaseUnit: 'kg', aliases: ['atun crujiente', 'atún crujiente'] },
  { canonicalName: 'Piel de salmón', category: 'Pescados y Mariscos', unit: 'g', purchaseUnit: 'paquete', aliases: ['piel de salmon', 'piel de salmón'] },
  { canonicalName: 'Camarón', category: 'Pescados y Mariscos', unit: 'g', purchaseUnit: 'kg', aliases: ['camaron', 'camarón', 'camarones', 'camarones rebozados', 'camarón a la plancha', 'camaron a la plancha', 'camaron empanizado', 'camarón empanizado', 'camarón rocka', 'camaron rocka'] },
  { canonicalName: 'Surimi (Kani)', category: 'Pescados y Mariscos', unit: 'g', purchaseUnit: 'paquete', aliases: ['surimi', 'kani', 'cangrejo', 'pasta de surimi', 'kani empanizado'] },
  { canonicalName: 'Anguila', category: 'Pescados y Mariscos', unit: 'g', purchaseUnit: 'paquete', aliases: ['anguila', 'láminas de anguila', 'laminas de anguila'] },
  { canonicalName: 'Masago (Hueva de pescado)', category: 'Pescados y Mariscos', unit: 'g', purchaseUnit: 'paquete', aliases: ['masago', 'hueva de pescado', 'hueva de pescado (masago)'] },
  { canonicalName: 'Tilapia', category: 'Pescados y Mariscos', unit: 'g', purchaseUnit: 'kg', aliases: ['tilapia', 'tilapia flameada', 'pescado', 'pescado empanizado'] },
  { canonicalName: 'Calamar', category: 'Pescados y Mariscos', unit: 'g', purchaseUnit: 'kg', aliases: ['calamar', 'baby squid'] },

  // Carnes y Aves
  { canonicalName: 'Pechuga de pollo', category: 'Carnes y Aves', unit: 'g', purchaseUnit: 'kg', aliases: ['pollo', 'pechuga', 'pechuga de pollo frita', 'pechuga asada', 'pechuga a la plancha', 'brocheta de pollo', 'láminas de pechuga empanizadas', 'laminas de pechuga empanizadas'] },
  { canonicalName: 'Filete de res', category: 'Carnes y Aves', unit: 'g', purchaseUnit: 'kg', aliases: ['filete', 'filete de res', 'carne de res', 'brocheta de filete de res', 'brocheta de filete'] },

  // Frutas, Verduras y Hortalizas
  { canonicalName: 'Vaina de soya (Edamames)', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'paquete', aliases: ['vaina de soya', 'edamames', 'edamame'] },
  { canonicalName: 'Aguacate', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['aguacate', 'porcion de aguacate', 'porción de aguacate'] },
  { canonicalName: 'Pepino fresco', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['pepino', 'pepino fresco', 'hoja de pepino', 'tsuma de pepino'] },
  { canonicalName: 'Zanahoria', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['zanahoria', 'zanahoria frita', 'poro o zanahoria frita'] },
  { canonicalName: 'Poro frito', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'paquete', aliases: ['poro', 'poro frito'] },
  { canonicalName: 'Cebollín fresco', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'manojo', aliases: ['cebollin', 'cebollín', 'cebollín fresco'] },
  { canonicalName: 'Cebolla blanca', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['cebolla', 'cebolla blanca', 'cebolla frita'] },
  { canonicalName: 'Cebolla morada', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['cebolla morada'] },
  { canonicalName: 'Lechuga', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'pieza', aliases: ['lechuga', 'ensalada'] },
  { canonicalName: 'Brócoli', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['brocoli', 'brócoli', 'brocheta de brócoli'] },
  { canonicalName: 'Calabaza', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['calabaza', 'brocheta de calabaza'] },
  { canonicalName: 'Champiñón', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['champinon', 'champiñón', 'champiñones', 'brocheta de champiñón'] },
  { canonicalName: 'Hongo', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['hongo', 'hongos', 'hongo shiitake', 'shiitake'] },
  { canonicalName: 'Pimiento rojo', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['pimiento', 'pimiento rojo'] },
  { canonicalName: 'Germen de soya', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'paquete', aliases: ['germen de soya', 'germen'] },
  { canonicalName: 'Espinaca', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'manojo', aliases: ['espinaca', 'espinacas'] },
  { canonicalName: 'Elote', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'lata', aliases: ['elote', 'granos de elote'] },
  { canonicalName: 'Cilantro', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'manojo', aliases: ['cilantro'] },
  { canonicalName: 'Mango', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['mango'] },
  { canonicalName: 'Manzana', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['manzana'] },
  { canonicalName: 'Plátano', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['platano', 'plátano', 'plátano frito', 'plátanos empanizados', 'platano empanizado'] },
  { canonicalName: 'Jitomate cherry', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'paquete', aliases: ['jitomate cherry', 'tomate cherry'] },
  { canonicalName: 'Chile serrano', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['chile serrano', 'serrano'] },
  { canonicalName: 'Chiles toreados', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'orden', aliases: ['chiles toreados', 'chile toreado'] },
  { canonicalName: 'Jugo de limón', category: 'Frutas y Verduras', unit: 'ml', purchaseUnit: 'litro', aliases: ['limon', 'limón', 'jugo de limon', 'jugo de limón'] },
  { canonicalName: 'Naranja para jugo', category: 'Frutas y Verduras', unit: 'g', purchaseUnit: 'kg', aliases: ['naranja', 'jugo de naranja', 'naranja para jugo'] },

  // Lácteos y Quesos
  { canonicalName: 'Queso crema', category: 'Lácteos', unit: 'g', purchaseUnit: 'barra', aliases: ['queso crema', 'porcion de queso crema', 'porción de queso crema'] },
  { canonicalName: 'Queso manchego', category: 'Lácteos', unit: 'g', purchaseUnit: 'kg', aliases: ['queso manchego', 'queso'] },
  { canonicalName: 'Tofu', category: 'Lácteos', unit: 'g', purchaseUnit: 'paquete', aliases: ['tofu'] },

  // Abarrotes, Semillas y Granos
  { canonicalName: 'Arroz para sushi', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'kg', aliases: ['arroz para sushi', 'arroz de sushi', 'shari', 'arroz de sushi (shari)'] },
  { canonicalName: 'Arroz blanco', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'kg', aliases: ['arroz', 'arroz blanco', 'arroz al vapor', 'arroz frito', 'gohan'] },
  { canonicalName: 'Alga nori', category: 'Abarrotes y Secos', unit: 'pza', purchaseUnit: 'paquete', aliases: ['alga nori', 'nori'] },
  { canonicalName: 'Hoja de soya', category: 'Abarrotes y Secos', unit: 'pza', purchaseUnit: 'paquete', aliases: ['hoja de soya'] },
  { canonicalName: 'Ajonjolí', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'bolsa', aliases: ['ajonjoli', 'ajonjolí', 'ajonjolí blanco', 'tostada de ajonjoli', 'tostada de ajonjolí'] },
  { canonicalName: 'Ajonjolí negro', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'bolsa', aliases: ['ajonjoli negro', 'ajonjolí negro'] },
  { canonicalName: 'Ajonjolí caramelizado', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'bolsa', aliases: ['ajonjoli caramelizado', 'ajonjolí caramelizado'] },
  { canonicalName: 'Coco caramelizado', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'bolsa', aliases: ['coco caramelizado', 'coco'] },
  { canonicalName: 'Nuez caramelizada', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'bolsa', aliases: ['nuez caramelizada', 'nuez'] },
  { canonicalName: 'Almendra', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'bolsa', aliases: ['almendra', 'almendras'] },
  { canonicalName: 'Amaranto', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'bolsa', aliases: ['amaranto'] },
  { canonicalName: 'Empanizado (Panko)', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'bolsa', aliases: ['empanizado', 'panko', 'empanizado frito', 'arroz empanizado'] },
  { canonicalName: 'Harina tempura (Capeado)', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'bolsa', aliases: ['capeado', 'tempura', 'harina tempura'] },
  { canonicalName: 'Tanuki (Tempura flakes)', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'bolsa', aliases: ['tanuki', 'hojuelas tempura'] },
  { canonicalName: 'Kakiague', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'orden', aliases: ['kakiague'] },
  { canonicalName: 'Pasta baby', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'orden', aliases: ['pasta baby'] },
  { canonicalName: 'Pasta udon', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'paquete', aliases: ['pasta udon', 'udon'] },
  { canonicalName: 'Pasta ramen', category: 'Abarrotes y Secos', unit: 'g', purchaseUnit: 'paquete', aliases: ['pasta ramen', 'ramen', 'tallarines'] },
  { canonicalName: 'Tortilla de harina', category: 'Abarrotes y Secos', unit: 'pza', purchaseUnit: 'paquete', aliases: ['tortilla de harina'] },
  { canonicalName: 'Huevo', category: 'Abarrotes y Secos', unit: 'pza', purchaseUnit: 'caja', aliases: ['huevo', 'huevo cocido'] },

  // Salsas, Aderezos y Condimentos Compuestos
  { canonicalName: 'Pasta Tampico', category: 'Salsas y Condimentos', unit: 'g', purchaseUnit: 'kg', aliases: ['tampico', 'pasta tampico', 'pasta de surimi con mayonesa y chile', 'salsa tampico'] },
  { canonicalName: 'Salsa chipotle', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['chipotle', 'salsa chipotle', 'aderezo chipotle', 'mayonesa con chile chipotle'] },
  { canonicalName: 'Salsa dulce (Anguila)', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['salsa dulce', 'salsa de anguila', 'salsa de anguila / dulce'] },
  { canonicalName: 'Salsa rocka', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['salsa rocka'] },
  { canonicalName: 'Salsa de tamarindo', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['salsa de tamarindo', 'salsa tamarindo', 'tamarindo'] },
  { canonicalName: 'Salsa teriyaki', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['salsa teriyaki', 'teriyaki'] },
  { canonicalName: 'Mayonesa trufada', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['mayonesa trufada', 'mayonesa trufa', 'mayonesa con aceite de trufa'] },
  { canonicalName: 'Salsa spicy', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['salsa spicy', 'spicy'] },
  { canonicalName: 'Salsa kushiage', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['salsa kushiage'] },
  { canonicalName: 'Salsa de cacahuate', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['salsa de cacahuate'] },
  { canonicalName: 'Salsa de chile', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['salsa de chile', 'salsa a base de aceite y chile'] },
  { canonicalName: 'Salsa sriracha', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['shiracha', 'sriracha', 'salsa sriracha'] },
  { canonicalName: 'Salsa de soya', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['soya', 'salsa de soya'] },
  { canonicalName: 'Caldo miso', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['caldo miso', 'fondo miso', 'caldo'] },
  { canonicalName: 'Chamoy', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['chamoy'] },
  { canonicalName: 'Condimento de camarón', category: 'Salsas y Condimentos', unit: 'g', purchaseUnit: 'frasco', aliases: ['condimento de camaron', 'condimento de camarón', 'furikake de camaron'] },
  { canonicalName: 'Condimento de salmón', category: 'Salsas y Condimentos', unit: 'g', purchaseUnit: 'frasco', aliases: ['condimento de salmon', 'condimento de salmón', 'furikake de salmon'] },
  { canonicalName: 'Shichimi togarashi', category: 'Salsas y Condimentos', unit: 'g', purchaseUnit: 'frasco', aliases: ['shichimi', 'shichimi togarashi'] },
  { canonicalName: 'Aderezo especial', category: 'Salsas y Condimentos', unit: 'ml', purchaseUnit: 'litro', aliases: ['aderezo especial', 'salsa especial'] },
  { canonicalName: 'Sal', category: 'Salsas y Condimentos', unit: 'g', purchaseUnit: 'kg', aliases: ['sal'] },
  { canonicalName: 'Azúcar y canela', category: 'Salsas y Condimentos', unit: 'g', purchaseUnit: 'kg', aliases: ['azucar y canela', 'azúcar y canela', 'azucar', 'azúcar'] },

  // Postres y Dulces
  { canonicalName: 'Helado de vainilla', category: 'Panadería y Postres', unit: 'g', purchaseUnit: 'bote', aliases: ['helado de vainilla', 'helado de vainilla (3 bolas)'] },
  { canonicalName: 'Jarabe de chocolate', category: 'Panadería y Postres', unit: 'ml', purchaseUnit: 'botella', aliases: ['chocolate', 'jarabe de chocolate', 'topping de chocolate'] },
  { canonicalName: 'Cajeta', category: 'Panadería y Postres', unit: 'ml', purchaseUnit: 'botella', aliases: ['cajeta', 'topping de cajeta'] },
  { canonicalName: 'Jarabe de fresa', category: 'Panadería y Postres', unit: 'ml', purchaseUnit: 'botella', aliases: ['fresa', 'topping de fresa', 'jarabe de fresa'] },
  { canonicalName: 'Pan choux', category: 'Panadería y Postres', unit: 'pza', purchaseUnit: 'paquete', aliases: ['pan choux', 'pan choux capeado'] },
  { canonicalName: 'Galleta Oreo', category: 'Panadería y Postres', unit: 'pza', purchaseUnit: 'paquete', aliases: ['galleta oreo', 'galletas oreo', 'galletas oreo capeadas'] },

  // Bebidas e Insumos de Barra
  { canonicalName: 'Agua purificada', category: 'Bebidas e Insumos de Barra', unit: 'ml', purchaseUnit: 'garrafón', aliases: ['agua purificada', 'agua natural', 'agua natural embotellada'] },
  { canonicalName: 'Té verde', category: 'Bebidas e Insumos de Barra', unit: 'g', purchaseUnit: 'caja', aliases: ['te verde', 'té verde', 'infusión de té verde', 'te verde frio', 'té verde frío'] },
  { canonicalName: 'Refresco embotellado', category: 'Bebidas e Insumos de Barra', unit: 'pza', purchaseUnit: 'caja', aliases: ['refresco embotellado', 'refrescos (línea coca-cola)', 'refresco'] },
  { canonicalName: 'Nestea limón', category: 'Bebidas e Insumos de Barra', unit: 'pza', purchaseUnit: 'caja', aliases: ['nestea', 'té helado sabor limón'] },
  { canonicalName: 'Agua mineral Topo Chico', category: 'Bebidas e Insumos de Barra', unit: 'pza', purchaseUnit: 'caja', aliases: ['topo chico', 'agua mineral', 'agua mineral topo chico'] },
  { canonicalName: 'Calpis concentrado', category: 'Bebidas e Insumos de Barra', unit: 'ml', purchaseUnit: 'botella', aliases: ['calpis', 'calpis natural'] },
  { canonicalName: 'Pulpa de mango', category: 'Bebidas e Insumos de Barra', unit: 'ml', purchaseUnit: 'botella', aliases: ['pulpa de mango', 'pulpa/sabor mango'] },
  { canonicalName: 'Jarabe mora azul', category: 'Bebidas e Insumos de Barra', unit: 'ml', purchaseUnit: 'botella', aliases: ['mora azul', 'jarabe mora azul', 'blue citrus'] },
  { canonicalName: 'Cerveza clara', category: 'Bebidas e Insumos de Barra', unit: 'pza', purchaseUnit: 'cartón', aliases: ['cerveza clara', 'cerveza embotellada'] },
  { canonicalName: 'Cerveza oscura', category: 'Bebidas e Insumos de Barra', unit: 'pza', purchaseUnit: 'cartón', aliases: ['cerveza oscura'] },
  { canonicalName: 'Refresco japonés Ramune', category: 'Bebidas e Insumos de Barra', unit: 'pza', purchaseUnit: 'caja', aliases: ['ramune', 'refresco japonés gasificado'] },
  { canonicalName: 'Presentación foco para bebida', category: 'Bebidas e Insumos de Barra', unit: 'pza', purchaseUnit: 'caja', aliases: ['focos', 'presentación foco'] },
];

// Helper para normalizar cadenas
function normalizeText(str: string): string {
  return (str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

// 2. Definición completa del menú Omikami Sushi 2025 (24 secciones, todas las variantes y precios exactos)
const OMIKAMI_RECIPES: RecipeDefinition[] = [
  // --- ENTRADAS ---
  {
    name: 'Edamames al Vapor (150 gr)',
    category: 'Entradas',
    station: 'caliente',
    price: 76,
    steps: 'Vaina de soya cocida al vapor (150 gr). Servir caliente.',
    ingredientKeys: ['Vaina de soya (Edamames)'],
  },
  {
    name: 'Edamames Asados (150 gr)',
    category: 'Entradas',
    station: 'caliente',
    price: 85,
    steps: 'Vaina de soya asada a la plancha (150 gr).',
    ingredientKeys: ['Vaina de soya (Edamames)'],
  },
  {
    name: 'Edamames Capeados (150 gr)',
    category: 'Entradas',
    station: 'caliente',
    price: 85,
    steps: 'Vaina de soya capeada y crujiente (150 gr).',
    ingredientKeys: ['Vaina de soya (Edamames)', 'Harina tempura (Capeado)'],
  },
  {
    name: 'Edamames Spicy (150 gr)',
    category: 'Entradas',
    station: 'caliente',
    price: 85,
    steps: 'Vaina de soya salteada con salsa spicy de la casa (150 gr).',
    ingredientKeys: ['Vaina de soya (Edamames)', 'Salsa spicy'],
  },
  {
    name: 'Tostadas de Atún o Salmón (2 piezas)',
    category: 'Entradas',
    station: 'fria',
    price: 105,
    steps: 'Tostada de ajonjolí con atún fresco o salmón fresco, pasta tampico, salsa chipotle, aguacate, zanahoria o poro frito y cebollín.',
    ingredientKeys: ['Ajonjolí', 'Atún fresco', 'Salmón fresco', 'Pasta Tampico', 'Salsa chipotle', 'Aguacate', 'Zanahoria', 'Poro frito', 'Cebollín fresco'],
  },
  {
    name: 'Conos de Atún Trufa (2 piezas)',
    category: 'Entradas',
    station: 'fria',
    price: 125,
    steps: 'Hoja de soya con atún crujiente y mayonesa trufada (2 piezas).',
    ingredientKeys: ['Hoja de soya', 'Atún crujiente', 'Mayonesa trufada'],
  },
  {
    name: 'Baby Squid',
    category: 'Entradas',
    station: 'caliente',
    price: 130,
    steps: 'Calamar relleno de pasta baby, bañado en salsa dulce y espolvoreado con ajonjolí.',
    ingredientKeys: ['Calamar', 'Pasta baby', 'Salsa dulce (Anguila)', 'Ajonjolí'],
  },
  {
    name: 'Camarón Rocka (150 gr)',
    category: 'Entradas',
    station: 'caliente',
    price: 174,
    steps: 'Camarones rebozados y bañados en salsa rocka sobre cama de lechuga, cebollín y ajonjolí.',
    ingredientKeys: ['Camarón', 'Empanizado (Panko)', 'Salsa rocka', 'Lechuga', 'Cebollín fresco', 'Ajonjolí'],
  },
  {
    name: 'Pollo Tamarindo (260 gr)',
    category: 'Entradas',
    station: 'caliente',
    price: 175,
    steps: 'Pechuga de pollo frita crujiente con salsa agridulce de tamarindo (260 gr).',
    ingredientKeys: ['Pechuga de pollo', 'Empanizado (Panko)', 'Salsa de tamarindo'],
  },
  {
    name: 'Sushi Cake (6 bocadillos)',
    category: 'Entradas',
    station: 'caliente',
    price: 180,
    steps: 'Bloques de arroz frito crujiente cubiertos con atún spicy, aguacate, cebollín y salsa dulce.',
    ingredientKeys: ['Arroz para sushi', 'Atún spicy', 'Aguacate', 'Cebollín fresco', 'Salsa dulce (Anguila)'],
  },

  // --- KUSHIAGUES ---
  {
    name: 'Kushiague de Plátano (1 pieza)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 30,
    steps: 'Brocheta de plátano empanizado (1 pieza).',
    ingredientKeys: ['Plátano', 'Empanizado (Panko)'],
  },
  {
    name: 'Kushiague de Plátano (Orden 3 piezas)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 85,
    steps: 'Orden de tres brochetas de plátano empanizado.',
    ingredientKeys: ['Plátano', 'Empanizado (Panko)'],
  },
  {
    name: 'Kushiague de Queso Manchego (1 pieza)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 40,
    steps: 'Brocheta de queso manchego empanizado (1 pieza).',
    ingredientKeys: ['Queso manchego', 'Empanizado (Panko)'],
  },
  {
    name: 'Kushiague de Queso Manchego (Orden 3 piezas)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 108,
    steps: 'Orden de tres brochetas de queso manchego empanizado.',
    ingredientKeys: ['Queso manchego', 'Empanizado (Panko)'],
  },
  {
    name: 'Kushiague de Plátano con Queso Manchego (1 pieza)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 40,
    steps: 'Brocheta combinada de plátano y queso manchego empanizados (1 pieza).',
    ingredientKeys: ['Plátano', 'Queso manchego', 'Empanizado (Panko)'],
  },
  {
    name: 'Kushiague de Plátano con Queso Manchego (Orden 3 piezas)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 108,
    steps: 'Orden de tres brochetas combinadas de plátano y queso manchego empanizados.',
    ingredientKeys: ['Plátano', 'Queso manchego', 'Empanizado (Panko)'],
  },
  {
    name: 'Kushiague de Queso Crema (1 pieza)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 40,
    steps: 'Brocheta de queso crema empanizado (1 pieza).',
    ingredientKeys: ['Queso crema', 'Empanizado (Panko)'],
  },
  {
    name: 'Kushiague de Queso Crema (Orden 3 piezas)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 108,
    steps: 'Orden de tres brochetas de queso crema empanizado.',
    ingredientKeys: ['Queso crema', 'Empanizado (Panko)'],
  },
  {
    name: 'Kushiague de Camarón con Queso Crema (1 pieza)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 53,
    steps: 'Brocheta de camarón relleno de queso crema y empanizado (1 pieza).',
    ingredientKeys: ['Camarón', 'Queso crema', 'Empanizado (Panko)'],
  },
  {
    name: 'Kushiague de Camarón con Queso Crema (Orden 3 piezas)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 149,
    steps: 'Orden de tres brochetas de camarón relleno de queso crema y empanizado.',
    ingredientKeys: ['Camarón', 'Queso crema', 'Empanizado (Panko)'],
  },
  {
    name: 'Kushiague de Salmón con Queso (1 pieza)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 53,
    steps: 'Brocheta de salmón fresco con queso crema empanizado (1 pieza).',
    ingredientKeys: ['Salmón fresco', 'Queso crema', 'Empanizado (Panko)'],
  },
  {
    name: 'Kushiague de Salmón con Queso (Orden 3 piezas)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 149,
    steps: 'Orden de tres brochetas de salmón fresco con queso crema empanizado.',
    ingredientKeys: ['Salmón fresco', 'Queso crema', 'Empanizado (Panko)'],
  },
  {
    name: 'Kushiague de Surimi con Queso (1 pieza)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 53,
    steps: 'Brocheta de surimi con queso crema empanizado (1 pieza).',
    ingredientKeys: ['Surimi (Kani)', 'Queso crema', 'Empanizado (Panko)'],
  },
  {
    name: 'Kushiague de Surimi con Queso (Orden 3 piezas)',
    category: 'Kushiagues',
    station: 'caliente',
    price: 149,
    steps: 'Orden de tres brochetas de surimi con queso crema empanizado.',
    ingredientKeys: ['Surimi (Kani)', 'Queso crema', 'Empanizado (Panko)'],
  },

  // --- YAKITORI ---
  {
    name: 'Yakitori de Brócoli',
    category: 'Yakitori',
    station: 'caliente',
    price: 60,
    steps: 'Brocheta de brócoli fresco a la parrilla con salsa tare.',
    ingredientKeys: ['Brócoli'],
  },
  {
    name: 'Yakitori de Calabaza con Queso',
    category: 'Yakitori',
    station: 'caliente',
    price: 66,
    steps: 'Brocheta de calabaza y queso a la parrilla.',
    ingredientKeys: ['Calabaza', 'Queso manchego'],
  },
  {
    name: 'Yakitori de Champiñón',
    category: 'Yakitori',
    station: 'caliente',
    price: 70,
    steps: 'Brocheta de champiñones enteros a la parrilla.',
    ingredientKeys: ['Champiñón'],
  },
  {
    name: 'Yakitori de Pollo',
    category: 'Yakitori',
    station: 'caliente',
    price: 122,
    steps: 'Brocheta de pollo marinado con cebolla y pimiento rojo a la parrilla.',
    ingredientKeys: ['Pechuga de pollo', 'Cebolla blanca', 'Pimiento rojo'],
  },
  {
    name: 'Yakitori de Filete',
    category: 'Yakitori',
    station: 'caliente',
    price: 130,
    steps: 'Brocheta de filete de res con cebolla y pimiento rojo a la parrilla.',
    ingredientKeys: ['Filete de res', 'Cebolla blanca', 'Pimiento rojo'],
  },

  // --- ARROZ ---
  {
    name: 'Gohan',
    category: 'Arroz',
    station: 'caliente',
    price: 54,
    steps: 'Tazón de arroz blanco al vapor.',
    ingredientKeys: ['Arroz blanco'],
  },
  {
    name: 'Yakimeshi de Verduras',
    category: 'Arroz',
    station: 'caliente',
    price: 87,
    steps: 'Arroz frito al wok con calabaza, zanahoria, germen de soya y cebollín.',
    ingredientKeys: ['Arroz blanco', 'Calabaza', 'Zanahoria', 'Germen de soya', 'Cebollín fresco'],
  },
  {
    name: 'Yakimeshi Mixto',
    category: 'Arroz',
    station: 'caliente',
    price: 117,
    steps: 'Arroz frito al wok con filete de res, pechuga de pollo, camarón, huevo, verduras mixtas y cebollín.',
    ingredientKeys: ['Arroz blanco', 'Filete de res', 'Pechuga de pollo', 'Camarón', 'Huevo', 'Calabaza', 'Zanahoria', 'Cebollín fresco'],
  },
  {
    name: 'Gohan Especial',
    category: 'Arroz',
    station: 'fria',
    price: 125,
    steps: 'Tazón de arroz blanco coronado con surimi, queso crema, aguacate, pasta tampico y salsa dulce.',
    ingredientKeys: ['Arroz blanco', 'Surimi (Kani)', 'Queso crema', 'Aguacate', 'Pasta Tampico', 'Salsa dulce (Anguila)'],
  },
  {
    name: 'Pollo Teriyaki',
    category: 'Arroz',
    station: 'caliente',
    price: 140,
    steps: 'Cama de arroz blanco con pechuga de pollo asada al teriyaki y ajonjolí.',
    ingredientKeys: ['Arroz blanco', 'Pechuga de pollo', 'Salsa teriyaki', 'Ajonjolí'],
  },
  {
    name: 'Tuna Tower',
    category: 'Arroz',
    station: 'fria',
    price: 230,
    steps: 'Torre de arroz shari, atún fresco, aguacate, pepino, cebollín, tanuki, masago, alga nori y salsa sriracha.',
    ingredientKeys: ['Arroz para sushi', 'Atún fresco', 'Aguacate', 'Pepino fresco', 'Cebollín fresco', 'Tanuki (Tempura flakes)', 'Masago (Hueva de pescado)', 'Alga nori', 'Salsa sriracha'],
  },
  {
    name: 'Trufa Tower',
    category: 'Arroz',
    station: 'fria',
    price: 230,
    steps: 'Torre de arroz shari con aguacate, pepino, cebollín, tanuki, masago, alga nori y mayonesa trufada.',
    ingredientKeys: ['Arroz para sushi', 'Aguacate', 'Pepino fresco', 'Cebollín fresco', 'Tanuki (Tempura flakes)', 'Masago (Hueva de pescado)', 'Alga nori', 'Mayonesa trufada'],
  },
  {
    name: 'Acompañamiento adicional de Arroz',
    category: 'Arroz',
    station: 'ninguna',
    price: 27,
    steps: 'Porción adicional a elegir: salsa tampico, salsa chipotle, condimento de salmón o camarón, queso crema o aguacate.',
    ingredientKeys: ['Pasta Tampico', 'Salsa chipotle', 'Condimento de salmón', 'Condimento de camarón', 'Queso crema', 'Aguacate'],
  },

  // --- PASTAS ---
  {
    name: 'Salmón Udon',
    category: 'Pastas',
    station: 'caliente',
    price: 170,
    steps: 'Pasta udon salteada con cubos de salmón fresco, brócoli, zanahoria y aderezo chipotle.',
    ingredientKeys: ['Pasta udon', 'Salmón fresco', 'Brócoli', 'Zanahoria', 'Salsa chipotle'],
  },
  {
    name: 'Camarón Udon',
    category: 'Pastas',
    station: 'caliente',
    price: 170,
    steps: 'Pasta udon salteada con camarones, brócoli, zanahoria y aderezo chipotle.',
    ingredientKeys: ['Pasta udon', 'Camarón', 'Brócoli', 'Zanahoria', 'Salsa chipotle'],
  },

  // --- CONOS ESPECIALES ---
  {
    name: 'Cono Tampico',
    category: 'Conos Especiales',
    station: 'fria',
    price: 78,
    steps: 'Cono de alga nori con arroz, pasta tampico y kakiague.',
    ingredientKeys: ['Alga nori', 'Arroz para sushi', 'Pasta Tampico', 'Kakiague'],
  },
  {
    name: 'Cono Natural',
    category: 'Conos Especiales',
    station: 'fria',
    price: 82,
    steps: 'Cono envuelto en hoja de pepino con aguacate, queso crema, kakiague y salsa chipotle.',
    ingredientKeys: ['Pepino fresco', 'Aguacate', 'Queso crema', 'Kakiague', 'Salsa chipotle'],
  },
  {
    name: 'Cono Tampico Especial',
    category: 'Conos Especiales',
    station: 'fria',
    price: 110,
    steps: 'Cono de alga nori con arroz, surimi (kani), pasta tampico y masago.',
    ingredientKeys: ['Alga nori', 'Arroz para sushi', 'Surimi (Kani)', 'Pasta Tampico', 'Masago (Hueva de pescado)'],
  },
  {
    name: 'Cono Especial',
    category: 'Conos Especiales',
    station: 'fria',
    price: 120,
    steps: 'Cono envuelto en hoja de pepino con salmón fresco, surimi, aguacate, queso crema y tampico.',
    ingredientKeys: ['Pepino fresco', 'Salmón fresco', 'Surimi (Kani)', 'Aguacate', 'Queso crema', 'Pasta Tampico'],
  },

  // --- CONOS TRADICIONALES ---
  {
    name: 'Cono de Atún',
    category: 'Conos Tradicionales',
    station: 'fria',
    price: 80,
    steps: 'Cono de alga nori con arroz, pepino, aguacate y atún fresco.',
    ingredientKeys: ['Alga nori', 'Arroz para sushi', 'Pepino fresco', 'Aguacate', 'Atún fresco'],
  },
  {
    name: 'Cono de Salmón Fresco',
    category: 'Conos Tradicionales',
    station: 'fria',
    price: 80,
    steps: 'Cono de alga nori con arroz, pepino, aguacate y salmón fresco.',
    ingredientKeys: ['Alga nori', 'Arroz para sushi', 'Pepino fresco', 'Aguacate', 'Salmón fresco'],
  },
  {
    name: 'Cono de Camarón',
    category: 'Conos Tradicionales',
    station: 'fria',
    price: 80,
    steps: 'Cono de alga nori con arroz, pepino, aguacate y camarón.',
    ingredientKeys: ['Alga nori', 'Arroz para sushi', 'Pepino fresco', 'Aguacate', 'Camarón'],
  },
  {
    name: 'Cono de Masago',
    category: 'Conos Tradicionales',
    station: 'fria',
    price: 82,
    steps: 'Cono de alga nori con arroz, pepino, aguacate y hueva masago.',
    ingredientKeys: ['Alga nori', 'Arroz para sushi', 'Pepino fresco', 'Aguacate', 'Masago (Hueva de pescado)'],
  },
  {
    name: 'Cono de Cangrejo',
    category: 'Conos Tradicionales',
    station: 'fria',
    price: 86,
    steps: 'Cono de alga nori con arroz, pepino, aguacate y surimi (cangrejo).',
    ingredientKeys: ['Alga nori', 'Arroz para sushi', 'Pepino fresco', 'Aguacate', 'Surimi (Kani)'],
  },
  {
    name: 'Cono de Salmón Ahumado',
    category: 'Conos Tradicionales',
    station: 'fria',
    price: 90,
    steps: 'Cono de alga nori con arroz, pepino, aguacate y salmón ahumado.',
    ingredientKeys: ['Alga nori', 'Arroz para sushi', 'Pepino fresco', 'Aguacate', 'Salmón ahumado'],
  },
  {
    name: 'Cono de Anguila',
    category: 'Conos Tradicionales',
    station: 'fria',
    price: 100,
    steps: 'Cono de alga nori con arroz, pepino, aguacate y anguila.',
    ingredientKeys: ['Alga nori', 'Arroz para sushi', 'Pepino fresco', 'Aguacate', 'Anguila'],
  },

  // --- SASHIMIS ---
  {
    name: 'Sashimi Salmón Fresco (Corte fino 90 gr)',
    category: 'Sashimis',
    station: 'fria',
    price: 152,
    steps: 'Láminas de salmón fresco crudo en corte fino (90 gr).',
    ingredientKeys: ['Salmón fresco'],
  },
  {
    name: 'Sashimi Salmón Fresco (Corte grueso 140 gr)',
    category: 'Sashimis',
    station: 'fria',
    price: 219,
    steps: 'Láminas de salmón fresco crudo en corte grueso (140 gr).',
    ingredientKeys: ['Salmón fresco'],
  },
  {
    name: 'Sashimi Atún (Corte fino 90 gr)',
    category: 'Sashimis',
    station: 'fria',
    price: 152,
    steps: 'Láminas de atún fresco crudo en corte fino (90 gr).',
    ingredientKeys: ['Atún fresco'],
  },
  {
    name: 'Sashimi Atún (Corte grueso 140 gr)',
    category: 'Sashimis',
    station: 'fria',
    price: 219,
    steps: 'Láminas de atún fresco crudo en corte grueso (140 gr).',
    ingredientKeys: ['Atún fresco'],
  },
  {
    name: 'Sashimi Salmón Ahumado (Corte fino 90 gr)',
    category: 'Sashimis',
    station: 'fria',
    price: 190,
    steps: 'Láminas de salmón ahumado en corte fino (90 gr).',
    ingredientKeys: ['Salmón ahumado'],
  },
  {
    name: 'Sashimi Salmón Ahumado (Corte grueso 140 gr)',
    category: 'Sashimis',
    station: 'fria',
    price: 260,
    steps: 'Láminas de salmón ahumado en corte grueso (140 gr).',
    ingredientKeys: ['Salmón ahumado'],
  },
  {
    name: 'Sashimi Anguila (Corte fino 90 gr)',
    category: 'Sashimis',
    station: 'fria',
    price: 210,
    steps: 'Láminas de anguila en corte fino (90 gr).',
    ingredientKeys: ['Anguila'],
  },
  {
    name: 'Salsa especial adicional (Sashimi)',
    category: 'Sashimis',
    station: 'ninguna',
    price: 24,
    steps: 'Porción de salsa especial adicional para sashimi.',
    ingredientKeys: ['Aderezo especial'],
  },

  // --- TEPPANYAKI ---
  {
    name: 'Teppanyaki de Verduras',
    category: 'Teppanyaki',
    station: 'caliente',
    price: 170,
    steps: 'Verduras a la plancha (calabaza, cebolla, espinaca, zanahoria, champiñón, pimiento, germen de soya, brócoli), acompañado de gohan y salsa de cacahuate.',
    ingredientKeys: ['Calabaza', 'Cebolla blanca', 'Espinaca', 'Zanahoria', 'Champiñón', 'Pimiento rojo', 'Germen de soya', 'Brócoli', 'Arroz blanco', 'Salsa de cacahuate'],
  },
  {
    name: 'Teppanyaki de Pollo',
    category: 'Teppanyaki',
    station: 'caliente',
    price: 220,
    steps: 'Pollo y verduras a la plancha, servido con arroz gohan y salsa de cacahuate.',
    ingredientKeys: ['Pechuga de pollo', 'Calabaza', 'Cebolla blanca', 'Espinaca', 'Zanahoria', 'Champiñón', 'Pimiento rojo', 'Germen de soya', 'Brócoli', 'Arroz blanco', 'Salsa de cacahuate'],
  },
  {
    name: 'Teppanyaki de Tilapia',
    category: 'Teppanyaki',
    station: 'caliente',
    price: 240,
    steps: 'Filete de tilapia y verduras a la plancha, servido con arroz gohan y salsa de cacahuate.',
    ingredientKeys: ['Tilapia', 'Calabaza', 'Cebolla blanca', 'Espinaca', 'Zanahoria', 'Champiñón', 'Pimiento rojo', 'Germen de soya', 'Brócoli', 'Arroz blanco', 'Salsa de cacahuate'],
  },
  {
    name: 'Teppanyaki de Filete de Res',
    category: 'Teppanyaki',
    station: 'caliente',
    price: 251,
    steps: 'Filete de res y verduras a la plancha, servido con arroz gohan y salsa de cacahuate.',
    ingredientKeys: ['Filete de res', 'Calabaza', 'Cebolla blanca', 'Espinaca', 'Zanahoria', 'Champiñón', 'Pimiento rojo', 'Germen de soya', 'Brócoli', 'Arroz blanco', 'Salsa de cacahuate'],
  },
  {
    name: 'Teppanyaki de Camarón',
    category: 'Teppanyaki',
    station: 'caliente',
    price: 270,
    steps: 'Camarones y verduras a la plancha, servido con arroz gohan y salsa de cacahuate.',
    ingredientKeys: ['Camarón', 'Calabaza', 'Cebolla blanca', 'Espinaca', 'Zanahoria', 'Champiñón', 'Pimiento rojo', 'Germen de soya', 'Brócoli', 'Arroz blanco', 'Salsa de cacahuate'],
  },
  {
    name: 'Teppanyaki Mixto',
    category: 'Teppanyaki',
    station: 'caliente',
    price: 280,
    steps: 'Camarón, filete de res, pollo y verduras a la plancha, servido con arroz gohan y salsa de cacahuate.',
    ingredientKeys: ['Camarón', 'Filete de res', 'Pechuga de pollo', 'Calabaza', 'Cebolla blanca', 'Espinaca', 'Zanahoria', 'Champiñón', 'Pimiento rojo', 'Germen de soya', 'Brócoli', 'Arroz blanco', 'Salsa de cacahuate'],
  },
  {
    name: 'Teppanyaki de Salmón o Atún',
    category: 'Teppanyaki',
    station: 'caliente',
    price: 290,
    steps: 'Salmón o atún con verduras a la plancha, servido con arroz gohan y salsa de cacahuate.',
    ingredientKeys: ['Salmón fresco', 'Atún fresco', 'Calabaza', 'Cebolla blanca', 'Espinaca', 'Zanahoria', 'Champiñón', 'Pimiento rojo', 'Germen de soya', 'Brócoli', 'Arroz blanco', 'Salsa de cacahuate'],
  },

  // --- SOPAS Y ENSALADAS ---
  {
    name: 'Sopa Miso',
    category: 'Sopas y Ensaladas',
    station: 'caliente',
    price: 73,
    steps: 'Fondo tradicional de caldo miso con hongos, cubos de tofu, cebollín y espinaca fresca.',
    ingredientKeys: ['Caldo miso', 'Hongo', 'Tofu', 'Cebollín fresco', 'Espinaca'],
  },
  {
    name: 'Sopa Kany',
    category: 'Sopas y Ensaladas',
    station: 'caliente',
    price: 73,
    steps: 'Caldo claro con surimi (kani), champiñones, cebollín y hojas de espinaca.',
    ingredientKeys: ['Caldo miso', 'Surimi (Kani)', 'Cebollín fresco', 'Champiñón', 'Espinaca'],
  },
  {
    name: 'Ramen de Pollo',
    category: 'Sopas y Ensaladas',
    station: 'caliente',
    price: 98,
    steps: 'Fondo de miso con pasta ramen, pechuga de pollo asada, cebolla morada, granos de elote y cilantro.',
    ingredientKeys: ['Caldo miso', 'Pasta ramen', 'Pechuga de pollo', 'Cebolla morada', 'Elote', 'Cilantro'],
  },
  {
    name: 'Sopa Ramen Miso',
    category: 'Sopas y Ensaladas',
    station: 'caliente',
    price: 100,
    steps: 'Caldo miso concentrado con tallarines, camarón, hongos, cebollín, espinaca y huevo cocido.',
    ingredientKeys: ['Caldo miso', 'Pasta ramen', 'Camarón', 'Hongo', 'Cebollín fresco', 'Espinaca', 'Huevo'],
  },
  {
    name: 'Sopa de Mariscos',
    category: 'Sopas y Ensaladas',
    station: 'caliente',
    price: 100,
    steps: 'Caldo con trozos de pescado (tilapia), camarón, calamar, espinaca y hongos.',
    ingredientKeys: ['Caldo miso', 'Tilapia', 'Camarón', 'Calamar', 'Espinaca', 'Hongo'],
  },
  {
    name: 'Tori Sozui',
    category: 'Sopas y Ensaladas',
    station: 'caliente',
    price: 110,
    steps: 'Caldo caliente con pollo deshebrado, arroz blanco, espinaca, huevo revuelto, cebollín y champiñón.',
    ingredientKeys: ['Caldo miso', 'Pechuga de pollo', 'Arroz blanco', 'Espinaca', 'Huevo', 'Cebollín fresco', 'Champiñón'],
  },
  {
    name: 'Ensalada de Cangrejo',
    category: 'Sopas y Ensaladas',
    station: 'fria',
    price: 143,
    steps: 'Zanahoria, pepino en julianas, kani, pasta tampico, aguacate y queso crema.',
    ingredientKeys: ['Zanahoria', 'Pepino fresco', 'Surimi (Kani)', 'Pasta Tampico', 'Aguacate', 'Queso crema'],
  },
  {
    name: 'Ensalada de Atún o Salmón',
    category: 'Sopas y Ensaladas',
    station: 'fria',
    price: 154,
    steps: 'Atún fresco o salmón fresco sobre mezcla de lechuga, aguacate, cubos de mango, jitomate cherry, nuez caramelizada y aderezo especial.',
    ingredientKeys: ['Atún fresco', 'Salmón fresco', 'Lechuga', 'Aguacate', 'Mango', 'Jitomate cherry', 'Nuez caramelizada', 'Aderezo especial'],
  },

  // --- MAKY BOWLS ---
  {
    name: 'Bowl de Cangrejo',
    category: 'Maky Bowls',
    station: 'fria',
    price: 250,
    steps: 'Base de arroz shari, proteína: cangrejo (surimi), 4 toppings y 2 salsas a elegir. Extra de topping o salsa: +$27 | Extra de proteína (50 gr): +$75.',
    ingredientKeys: ['Arroz para sushi', 'Surimi (Kani)'],
  },
  {
    name: 'Bowl de Camarón',
    category: 'Maky Bowls',
    station: 'fria',
    price: 252,
    steps: 'Base de arroz shari, proteína: camarón, 4 toppings y 2 salsas a elegir.',
    ingredientKeys: ['Arroz para sushi', 'Camarón'],
  },
  {
    name: 'Bowl de Atún',
    category: 'Maky Bowls',
    station: 'fria',
    price: 256,
    steps: 'Base de arroz shari, proteína: atún fresco, 4 toppings y 2 salsas a elegir.',
    ingredientKeys: ['Arroz para sushi', 'Atún fresco'],
  },
  {
    name: 'Bowl de Salmón',
    category: 'Maky Bowls',
    station: 'fria',
    price: 256,
    steps: 'Base de arroz shari, proteína: salmón fresco, 4 toppings y 2 salsas a elegir.',
    ingredientKeys: ['Arroz para sushi', 'Salmón fresco'],
  },
  {
    name: 'Bowl de Anguila',
    category: 'Maky Bowls',
    station: 'fria',
    price: 260,
    steps: 'Base de arroz shari, proteína: anguila, 4 toppings y 2 salsas a elegir.',
    ingredientKeys: ['Arroz para sushi', 'Anguila'],
  },
  {
    name: 'Bowl de Salmón Ahumado',
    category: 'Maky Bowls',
    station: 'fria',
    price: 260,
    steps: 'Base de arroz shari, proteína: salmón ahumado, 4 toppings y 2 salsas a elegir.',
    ingredientKeys: ['Arroz para sushi', 'Salmón ahumado'],
  },
  {
    name: 'Extra de Topping o Salsa para Bowl',
    category: 'Maky Bowls',
    station: 'ninguna',
    price: 27,
    steps: 'Topping o salsa adicional para Maky Bowl.',
    ingredientKeys: ['Aderezo especial'],
  },
  {
    name: 'Extra de Proteína para Bowl (50 gr)',
    category: 'Maky Bowls',
    station: 'ninguna',
    price: 75,
    steps: 'Porción extra de 50 gramos de proteína para Maky Bowl.',
    ingredientKeys: ['Salmón fresco', 'Atún fresco', 'Camarón'],
  },

  // --- NIGIRIS ---
  {
    name: 'Nigiri Cangrejo (2 piezas)',
    category: 'Nigiris',
    station: 'fria',
    price: 80,
    steps: 'Bocadillos de arroz de sushi coronados con surimi / cangrejo (2 piezas).',
    ingredientKeys: ['Arroz para sushi', 'Surimi (Kani)'],
  },
  {
    name: 'Nigiri Tampico (2 piezas)',
    category: 'Nigiris',
    station: 'fria',
    price: 80,
    steps: 'Bocadillos de arroz de sushi coronados con pasta tampico (2 piezas).',
    ingredientKeys: ['Arroz para sushi', 'Pasta Tampico'],
  },
  {
    name: 'Nigiri Camarón (2 piezas)',
    category: 'Nigiris',
    station: 'fria',
    price: 88,
    steps: 'Bocadillos de arroz de sushi con camarón abierto (2 piezas).',
    ingredientKeys: ['Arroz para sushi', 'Camarón'],
  },
  {
    name: 'Nigiri Atún (2 piezas)',
    category: 'Nigiris',
    station: 'fria',
    price: 90,
    steps: 'Bocadillos de arroz de sushi con lámina de atún fresco (2 piezas).',
    ingredientKeys: ['Arroz para sushi', 'Atún fresco'],
  },
  {
    name: 'Nigiri Salmón Fresco (2 piezas)',
    category: 'Nigiris',
    station: 'fria',
    price: 90,
    steps: 'Bocadillos de arroz de sushi con lámina de salmón fresco (2 piezas).',
    ingredientKeys: ['Arroz para sushi', 'Salmón fresco'],
  },
  {
    name: 'Nigiri Anguila (2 piezas)',
    category: 'Nigiris',
    station: 'fria',
    price: 100,
    steps: 'Bocadillos de arroz de sushi con lámina de anguila y toque de salsa dulce (2 piezas).',
    ingredientKeys: ['Arroz para sushi', 'Anguila', 'Salsa dulce (Anguila)'],
  },
  {
    name: 'Nigiri Masago (2 piezas)',
    category: 'Nigiris',
    station: 'fria',
    price: 100,
    steps: 'Gunkan / bocadillos de arroz de sushi con hueva de masago (2 piezas).',
    ingredientKeys: ['Arroz para sushi', 'Masago (Hueva de pescado)', 'Alga nori'],
  },
  {
    name: 'Nigiri Salmón Ahumado (2 piezas)',
    category: 'Nigiris',
    station: 'fria',
    price: 100,
    steps: 'Bocadillos de arroz de sushi con salmón ahumado (2 piezas).',
    ingredientKeys: ['Arroz para sushi', 'Salmón ahumado'],
  },

  // --- ONIGIRIS ---
  {
    name: 'Onigiri Chipotle',
    category: 'Onigiris',
    station: 'fria',
    price: 48,
    steps: 'Triángulo de arroz con alga nori relleno de salsa chipotle.',
    ingredientKeys: ['Arroz para sushi', 'Alga nori', 'Salsa chipotle'],
  },
  {
    name: 'Onigiri Tampico',
    category: 'Onigiris',
    station: 'fria',
    price: 48,
    steps: 'Triángulo de arroz con alga nori relleno de pasta tampico.',
    ingredientKeys: ['Arroz para sushi', 'Alga nori', 'Pasta Tampico'],
  },
  {
    name: 'Onigiri Chamoy',
    category: 'Onigiris',
    station: 'fria',
    price: 48,
    steps: 'Triángulo de arroz con alga nori bañado o relleno de chamoy.',
    ingredientKeys: ['Arroz para sushi', 'Alga nori', 'Chamoy'],
  },
  {
    name: 'Onigiri Queso Crema',
    category: 'Onigiris',
    station: 'fria',
    price: 48,
    steps: 'Triángulo de arroz con alga nori relleno de queso crema.',
    ingredientKeys: ['Arroz para sushi', 'Alga nori', 'Queso crema'],
  },
  {
    name: 'Onigiri Queso Manchego',
    category: 'Onigiris',
    station: 'fria',
    price: 48,
    steps: 'Triángulo de arroz con alga nori relleno de queso manchego.',
    ingredientKeys: ['Arroz para sushi', 'Alga nori', 'Queso manchego'],
  },
  {
    name: 'Onigiri Condimento de Camarón',
    category: 'Onigiris',
    station: 'fria',
    price: 48,
    steps: 'Triángulo de arroz con alga nori y sazonador de condimento de camarón.',
    ingredientKeys: ['Arroz para sushi', 'Alga nori', 'Condimento de camarón'],
  },
  {
    name: 'Onigiri Condimento de Salmón',
    category: 'Onigiris',
    station: 'fria',
    price: 48,
    steps: 'Triángulo de arroz con alga nori y sazonador de condimento de salmón.',
    ingredientKeys: ['Arroz para sushi', 'Alga nori', 'Condimento de salmón'],
  },
  {
    name: 'Onigiri Empanizado',
    category: 'Onigiris',
    station: 'caliente',
    price: 53,
    steps: 'Triángulo de arroz empanizado frito crujiente con relleno a elegir.',
    ingredientKeys: ['Arroz para sushi', 'Empanizado (Panko)'],
  },

  // --- OMITACO ---
  {
    name: 'Omitaco de Pollo',
    category: 'Omitaco',
    station: 'caliente',
    price: 165,
    steps: 'Tortilla de harina con pechuga de pollo a la plancha, cebolla, cebollín, salsa chipotle y ensalada.',
    ingredientKeys: ['Tortilla de harina', 'Pechuga de pollo', 'Cebolla blanca', 'Cebollín fresco', 'Salsa chipotle', 'Lechuga'],
  },
  {
    name: 'Omitaco de Camarón',
    category: 'Omitaco',
    station: 'caliente',
    price: 190,
    steps: 'Tortilla de harina con camarón a la plancha, cebolla, cebollín, salsa chipotle y ensalada.',
    ingredientKeys: ['Tortilla de harina', 'Camarón', 'Cebolla blanca', 'Cebollín fresco', 'Salsa chipotle', 'Lechuga'],
  },

  // --- MAKYS ---
  {
    name: 'Vegetariano Roll',
    category: 'Makys',
    station: 'fria',
    price: 95,
    steps: 'Rollo con arroz, ajonjolí, aguacate, pepino y zanahoria.',
    ingredientKeys: ['Arroz para sushi', 'Ajonjolí', 'Aguacate', 'Pepino fresco', 'Zanahoria'],
  },
  {
    name: 'Garapiñado',
    category: 'Makys',
    station: 'fria',
    price: 100,
    steps: 'Rollo con arroz, ajonjolí caramelizado, mango, pepino, queso crema, salsa dulce y salsa chipotle.',
    ingredientKeys: ['Arroz para sushi', 'Ajonjolí caramelizado', 'Mango', 'Pepino fresco', 'Queso crema', 'Salsa dulce (Anguila)', 'Salsa chipotle'],
  },
  {
    name: 'Mango Tango',
    category: 'Makys',
    station: 'fria',
    price: 100,
    steps: 'Rollo con arroz, mango, queso crema, pepino, aguacate y salsa tamarindo.',
    ingredientKeys: ['Arroz para sushi', 'Mango', 'Queso crema', 'Pepino fresco', 'Aguacate', 'Salsa de tamarindo'],
  },
  {
    name: 'Kappa Especial',
    category: 'Makys',
    station: 'fria',
    price: 100,
    steps: 'Rollo con arroz, alga nori, pepino, queso crema, salsa chipotle y lechuga.',
    ingredientKeys: ['Arroz para sushi', 'Alga nori', 'Pepino fresco', 'Queso crema', 'Salsa chipotle', 'Lechuga'],
  },
  {
    name: 'Skin Roll',
    category: 'Makys',
    station: 'fria',
    price: 100,
    steps: 'Rollo con arroz, alga nori, queso crema, pepino y piel de salmón tostada.',
    ingredientKeys: ['Arroz para sushi', 'Alga nori', 'Queso crema', 'Pepino fresco', 'Piel de salmón'],
  },
  {
    name: 'Tampico Roll',
    category: 'Makys',
    station: 'fria',
    price: 100,
    steps: 'Rollo con arroz, alga nori, pepino, pasta tampico y kakiague.',
    ingredientKeys: ['Arroz para sushi', 'Alga nori', 'Pepino fresco', 'Pasta Tampico', 'Kakiague'],
  },
  {
    name: 'California con Cangrejo',
    category: 'Makys',
    station: 'fria',
    price: 112,
    steps: 'Rollo con arroz por fuera, ajonjolí, aguacate, pepino y kani (cangrejo).',
    ingredientKeys: ['Arroz para sushi', 'Ajonjolí', 'Aguacate', 'Pepino fresco', 'Surimi (Kani)'],
  },
  {
    name: 'Filadelfia',
    category: 'Makys',
    station: 'fria',
    price: 112,
    steps: 'Rollo clásico con arroz, ajonjolí, salmón fresco y queso crema.',
    ingredientKeys: ['Arroz para sushi', 'Ajonjolí', 'Salmón fresco', 'Queso crema'],
  },
  {
    name: 'California',
    category: 'Makys',
    station: 'fria',
    price: 115,
    steps: 'Rollo con arroz, ajonjolí, aguacate, pepino y camarón.',
    ingredientKeys: ['Arroz para sushi', 'Ajonjolí', 'Aguacate', 'Pepino fresco', 'Camarón'],
  },
  {
    name: 'Tampico Especial Maky',
    category: 'Makys',
    station: 'fria',
    price: 125,
    steps: 'Rollo con arroz, alga nori, pasta tampico, masago y kani.',
    ingredientKeys: ['Arroz para sushi', 'Alga nori', 'Pasta Tampico', 'Masago (Hueva de pescado)', 'Surimi (Kani)'],
  },

  // --- URAMAKI ---
  {
    name: 'Coco Roll',
    category: 'Uramaki',
    station: 'fria',
    price: 128,
    steps: 'Rollo con arroz, queso crema, coco caramelizado, pepino, kani y salsa chipotle.',
    ingredientKeys: ['Arroz para sushi', 'Queso crema', 'Coco caramelizado', 'Pepino fresco', 'Surimi (Kani)', 'Salsa chipotle'],
  },
  {
    name: 'Apple Roll',
    category: 'Uramaki',
    station: 'fria',
    price: 142,
    steps: 'Rollo con arroz, queso crema, láminas de manzana, pescado empanizado, aguacate, salsa dulce y salsa chipotle.',
    ingredientKeys: ['Arroz para sushi', 'Queso crema', 'Manzana', 'Tilapia', 'Empanizado (Panko)', 'Aguacate', 'Salsa dulce (Anguila)', 'Salsa chipotle'],
  },
  {
    name: 'Tropical',
    category: 'Uramaki',
    station: 'fria',
    price: 143,
    steps: 'Rollo con arroz, queso crema, mango, aguacate, pepino, salmón fresco y salsa de tamarindo.',
    ingredientKeys: ['Arroz para sushi', 'Queso crema', 'Mango', 'Aguacate', 'Pepino fresco', 'Salmón fresco', 'Salsa de tamarindo'],
  },
  {
    name: 'Monky Roll',
    category: 'Uramaki',
    station: 'fria',
    price: 144,
    steps: 'Rollo con arroz, plátano frito, camarón empanizado, queso crema, aguacate y salsa chipotle.',
    ingredientKeys: ['Arroz para sushi', 'Plátano', 'Camarón', 'Empanizado (Panko)', 'Queso crema', 'Aguacate', 'Salsa chipotle'],
  },
  {
    name: 'Mix Maky',
    category: 'Uramaki',
    station: 'fria',
    price: 144,
    steps: 'Rollo con arroz, atún fresco, salmón fresco, aguacate, pepino, cebollín y salsa spicy.',
    ingredientKeys: ['Arroz para sushi', 'Atún fresco', 'Salmón fresco', 'Aguacate', 'Pepino fresco', 'Cebollín fresco', 'Salsa spicy'],
  },
  {
    name: 'Nemo',
    category: 'Uramaki',
    station: 'fria',
    price: 145,
    steps: 'Rollo con arroz, salmón fresco, aguacate, tampico, tanuki y shichimi togarashi.',
    ingredientKeys: ['Arroz para sushi', 'Salmón fresco', 'Aguacate', 'Pasta Tampico', 'Tanuki (Tempura flakes)', 'Shichimi togarashi'],
  },
  {
    name: 'El Rey',
    category: 'Uramaki',
    station: 'fria',
    price: 147,
    steps: 'Rollo con arroz, cebolla frita, camarón empanizado, aguacate, queso crema y salsa chipotle.',
    ingredientKeys: ['Arroz para sushi', 'Cebolla blanca', 'Camarón', 'Empanizado (Panko)', 'Aguacate', 'Queso crema', 'Salsa chipotle'],
  },
  {
    name: 'Nevado',
    category: 'Uramaki',
    station: 'fria',
    price: 147,
    steps: 'Rollo con arroz, cubierto de queso crema, camarón empanizado por dentro, aguacate y pasta tampico.',
    ingredientKeys: ['Arroz para sushi', 'Queso crema', 'Camarón', 'Empanizado (Panko)', 'Aguacate', 'Pasta Tampico'],
  },
  {
    name: 'Calavera Roll',
    category: 'Uramaki',
    station: 'fria',
    price: 152,
    steps: 'Rollo con arroz, salmón fresco, kakiague, aguacate, queso crema, cebollín y salsa chipotle.',
    ingredientKeys: ['Arroz para sushi', 'Salmón fresco', 'Kakiague', 'Aguacate', 'Queso crema', 'Cebollín fresco', 'Salsa chipotle'],
  },
  {
    name: 'Dragón Roll',
    category: 'Uramaki',
    station: 'fria',
    price: 152,
    steps: 'Rollo con arroz, mango, aguacate, camarón empanizado, queso crema, pepino, salsa chipotle y salsa dulce.',
    ingredientKeys: ['Arroz para sushi', 'Mango', 'Aguacate', 'Camarón', 'Empanizado (Panko)', 'Queso crema', 'Pepino fresco', 'Salsa chipotle', 'Salsa dulce (Anguila)'],
  },
  {
    name: 'Ebi Green',
    category: 'Uramaki',
    station: 'fria',
    price: 160,
    steps: 'Rollo con arroz, cubierta de aguacate, queso crema, camarón empanizado, tampico y salsa kushiage.',
    ingredientKeys: ['Arroz para sushi', 'Aguacate', 'Queso crema', 'Camarón', 'Empanizado (Panko)', 'Pasta Tampico', 'Salsa kushiage'],
  },
  {
    name: 'Consentido Roll',
    category: 'Uramaki',
    station: 'fria',
    price: 166,
    steps: 'Rollo con arroz, kani, aguacate, queso crema y pepino fresco.',
    ingredientKeys: ['Arroz para sushi', 'Surimi (Kani)', 'Aguacate', 'Queso crema', 'Pepino fresco'],
  },
  {
    name: 'White Ebi',
    category: 'Uramaki',
    station: 'fria',
    price: 170,
    steps: 'Rollo con arroz, queso crema, camarón, aguacate, pepino y kani.',
    ingredientKeys: ['Arroz para sushi', 'Queso crema', 'Camarón', 'Aguacate', 'Pepino fresco', 'Surimi (Kani)'],
  },
  {
    name: 'Smoke Roll',
    category: 'Uramaki',
    station: 'fria',
    price: 190,
    steps: 'Rollo con arroz, salmón ahumado, aguacate, queso crema, cebollín y salsa chipotle.',
    ingredientKeys: ['Arroz para sushi', 'Salmón ahumado', 'Aguacate', 'Queso crema', 'Cebollín fresco', 'Salsa chipotle'],
  },

  // --- ROLLOS ESPECIALES ---
  {
    name: 'Tokyo Roll',
    category: 'Rollos Especiales',
    station: 'fria',
    price: 155,
    steps: 'Rollo con arroz, aguacate, salmón, atún, kani empanizado, tampico, salsa chipotle y cebollín.',
    ingredientKeys: ['Arroz para sushi', 'Aguacate', 'Salmón fresco', 'Atún fresco', 'Surimi (Kani)', 'Empanizado (Panko)', 'Pasta Tampico', 'Salsa chipotle', 'Cebollín fresco'],
  },
  {
    name: 'Pink Roll',
    category: 'Rollos Especiales',
    station: 'fria',
    price: 173,
    steps: 'Rollo con arroz, queso crema, salmón fresco, aguacate, pepino, anguila, pasta baby y salsa dulce.',
    ingredientKeys: ['Arroz para sushi', 'Queso crema', 'Salmón fresco', 'Aguacate', 'Pepino fresco', 'Anguila', 'Pasta baby', 'Salsa dulce (Anguila)'],
  },
  {
    name: 'Filadelfia Especial',
    category: 'Rollos Especiales',
    station: 'fria',
    price: 175,
    steps: 'Rollo cubierto con masago, salmón fresco, queso crema, aguacate y pepino.',
    ingredientKeys: ['Arroz para sushi', 'Masago (Hueva de pescado)', 'Salmón fresco', 'Queso crema', 'Aguacate', 'Pepino fresco'],
  },
  {
    name: 'California Especial',
    category: 'Rollos Especiales',
    station: 'fria',
    price: 175,
    steps: 'Rollo cubierto de masago con camarón, pepino, aguacate y queso crema.',
    ingredientKeys: ['Arroz para sushi', 'Masago (Hueva de pescado)', 'Camarón', 'Pepino fresco', 'Aguacate', 'Queso crema'],
  },
  {
    name: 'Kyuri Roll',
    category: 'Rollos Especiales',
    station: 'fria',
    price: 180,
    steps: 'Rollo envuelto en tsuma de pepino con aguacate, queso crema, kani, tampico, camarón empanizado y salsa dulce.',
    ingredientKeys: ['Pepino fresco', 'Aguacate', 'Queso crema', 'Surimi (Kani)', 'Pasta Tampico', 'Camarón', 'Empanizado (Panko)', 'Salsa dulce (Anguila)'],
  },
  {
    name: 'Rocka Roll',
    category: 'Rollos Especiales',
    station: 'fria',
    price: 180,
    steps: 'Rollo con arroz, cebollín, atún spicy, camarón rocka, rodajas de chile serrano y salsa sriracha.',
    ingredientKeys: ['Arroz para sushi', 'Cebollín fresco', 'Atún spicy', 'Camarón', 'Salsa rocka', 'Chile serrano', 'Salsa sriracha'],
  },
  {
    name: 'Kuro Spicy',
    category: 'Rollos Especiales',
    station: 'fria',
    price: 183,
    steps: 'Rollo con arroz cubierto de ajonjolí negro, pepino, queso crema, kani, atún spicy y cebollín.',
    ingredientKeys: ['Arroz para sushi', 'Ajonjolí negro', 'Pepino fresco', 'Queso crema', 'Surimi (Kani)', 'Atún spicy', 'Cebollín fresco'],
  },
  {
    name: 'Arcoíris',
    category: 'Rollos Especiales',
    station: 'fria',
    price: 184,
    steps: 'Rollo multicolor con atún, salmón, kani, aguacate, kakiague, salsa spicy y tanuki.',
    ingredientKeys: ['Arroz para sushi', 'Atún fresco', 'Salmón fresco', 'Surimi (Kani)', 'Aguacate', 'Kakiague', 'Salsa spicy', 'Tanuki (Tempura flakes)'],
  },

  // --- ROLLOS DULCES ---
  {
    name: 'Zanahoria Krispy',
    category: 'Rollos Dulces',
    station: 'fria',
    price: 145,
    steps: 'Rollo con arroz, kakiague de zanahoria, kani, aguacate, queso crema y salsa dulce.',
    ingredientKeys: ['Arroz para sushi', 'Kakiague', 'Surimi (Kani)', 'Aguacate', 'Queso crema', 'Salsa dulce (Anguila)'],
  },
  {
    name: 'Sake Furikake',
    category: 'Rollos Dulces',
    station: 'fria',
    price: 174,
    steps: 'Rollo con arroz, queso crema, condimento de salmón, pasta baby, camarón empanizado, aguacate y salsa dulce.',
    ingredientKeys: ['Arroz para sushi', 'Queso crema', 'Condimento de salmón', 'Pasta baby', 'Camarón', 'Empanizado (Panko)', 'Aguacate', 'Salsa dulce (Anguila)'],
  },
  {
    name: 'Electric Roll',
    category: 'Rollos Dulces',
    station: 'fria',
    price: 203,
    steps: 'Rollo con arroz, anguila, kani, queso crema, aguacate, salsa dulce y ajonjolí.',
    ingredientKeys: ['Arroz para sushi', 'Anguila', 'Surimi (Kani)', 'Queso crema', 'Aguacate', 'Salsa dulce (Anguila)', 'Ajonjolí'],
  },
  {
    name: 'Almond Roll',
    category: 'Rollos Dulces',
    station: 'fria',
    price: 220,
    steps: 'Rollo con arroz, anguila, camarón empanizado, pepino, aguacate, salsa de anguila y almendra fileteada.',
    ingredientKeys: ['Arroz para sushi', 'Anguila', 'Camarón', 'Empanizado (Panko)', 'Pepino fresco', 'Aguacate', 'Salsa dulce (Anguila)', 'Almendra'],
  },

  // --- ROLLOS EMPANIZADOS (COCINA CALIENTE) ---
  {
    name: 'Yasai Roll',
    category: 'Rollos Empanizados',
    station: 'caliente',
    price: 100,
    steps: 'Rollo empanizado crujiente relleno de pepino, aguacate y queso crema.',
    ingredientKeys: ['Arroz para sushi', 'Empanizado (Panko)', 'Pepino fresco', 'Aguacate', 'Queso crema'],
  },
  {
    name: 'Tori Empanizado',
    category: 'Rollos Empanizados',
    station: 'caliente',
    price: 132,
    steps: 'Rollo con láminas de pechuga empanizadas, aguacate, queso crema y salsa kushiage.',
    ingredientKeys: ['Arroz para sushi', 'Pechuga de pollo', 'Empanizado (Panko)', 'Aguacate', 'Queso crema', 'Salsa kushiage'],
  },
  {
    name: 'Nevado Empanizado',
    category: 'Rollos Empanizados',
    station: 'caliente',
    price: 152,
    steps: 'Rollo de arroz y queso crema empanizados, relleno de camarón empanizado, aguacate y tampico.',
    ingredientKeys: ['Arroz para sushi', 'Queso crema', 'Camarón', 'Empanizado (Panko)', 'Aguacate', 'Pasta Tampico'],
  },
  {
    name: 'Empanizado Especial',
    category: 'Rollos Empanizados',
    station: 'caliente',
    price: 162,
    steps: 'Rollo empanizado con camarón empanizado, aguacate, zanahoria, queso manchego y salsa dulce.',
    ingredientKeys: ['Arroz para sushi', 'Camarón', 'Empanizado (Panko)', 'Aguacate', 'Zanahoria', 'Queso manchego', 'Salsa dulce (Anguila)'],
  },
  {
    name: 'Amaranto',
    category: 'Rollos Empanizados',
    station: 'caliente',
    price: 170,
    steps: 'Rollo de arroz empanizado con costra de amaranto, aguacate, queso crema, mango, kani y salsa dulce.',
    ingredientKeys: ['Arroz para sushi', 'Amaranto', 'Empanizado (Panko)', 'Aguacate', 'Queso crema', 'Mango', 'Surimi (Kani)', 'Salsa dulce (Anguila)'],
  },

  // --- ROLLOS FLAMEADOS ---
  {
    name: 'Truffita Roll',
    category: 'Rollos Flameados',
    station: 'fria',
    price: 160,
    steps: 'Rollo de arroz cubierto de tilapia flameada, relleno de atún picante, pepino, aguacate y mayonesa trufada.',
    ingredientKeys: ['Arroz para sushi', 'Tilapia', 'Atún spicy', 'Pepino fresco', 'Aguacate', 'Mayonesa trufada'],
  },
  {
    name: 'Bronceado Maky',
    category: 'Rollos Flameados',
    station: 'fria',
    price: 170,
    steps: 'Rollo de arroz con salmón fresco flameado, kani, aguacate, queso crema y salsa de chile.',
    ingredientKeys: ['Arroz para sushi', 'Salmón fresco', 'Surimi (Kani)', 'Aguacate', 'Queso crema', 'Salsa de chile'],
  },

  // --- ROLLOS PICANTES ---
  {
    name: 'Emperador',
    category: 'Rollos Picantes',
    station: 'fria',
    price: 148,
    steps: 'Rollo con arroz, queso manchego, chiles toreados, aguacate, kani empanizado, cebollín y salsa chipotle.',
    ingredientKeys: ['Arroz para sushi', 'Queso manchego', 'Chiles toreados', 'Aguacate', 'Surimi (Kani)', 'Empanizado (Panko)', 'Cebollín fresco', 'Salsa chipotle'],
  },
  {
    name: 'Xtrem Roll',
    category: 'Rollos Picantes',
    station: 'fria',
    price: 148,
    steps: 'Rollo con arroz, pasta tampico, kakiague, queso crema, chiles toreados, aguacate, kani y salsa chipotle.',
    ingredientKeys: ['Arroz para sushi', 'Pasta Tampico', 'Kakiague', 'Queso crema', 'Chiles toreados', 'Aguacate', 'Surimi (Kani)', 'Salsa chipotle'],
  },

  // --- COMBOS (SIN COCINA ASIGNADA) ---
  {
    name: 'Combo Omikami',
    category: 'Combos',
    station: 'ninguna',
    price: 250,
    steps: '1 rollo a elegir (Coco Roll, Xtrem Roll, Nevado, Nevado Empanizado, Zanahoria Krispy o Emperador), 1/2 orden de edamames al vapor, 1/2 orden de yakimeshi mixto o verdura, 2 brochetas de plátano y 1 Nestea o té verde frío.',
    ingredientKeys: ['Arroz para sushi', 'Vaina de soya (Edamames)', 'Plátano', 'Arroz blanco', 'Té verde'],
  },

  // --- POSTRES ---
  {
    name: 'Helado de Vainilla',
    category: 'Postres',
    station: 'fria',
    price: 73,
    steps: 'Tres bolas de helado de vainilla servidas con jarabe de chocolate.',
    ingredientKeys: ['Helado de vainilla', 'Jarabe de chocolate'],
  },
  {
    name: 'Tempura Helado',
    category: 'Postres',
    station: 'caliente',
    price: 75,
    steps: 'Pan choux capeado caliente con centro de helado de vainilla y topping a elegir: chocolate, cajeta o fresa.',
    ingredientKeys: ['Pan choux', 'Harina tempura (Capeado)', 'Helado de vainilla', 'Jarabe de chocolate', 'Cajeta', 'Jarabe de fresa'],
  },
  {
    name: 'Platanitos',
    category: 'Postres',
    station: 'caliente',
    price: 75,
    steps: 'Plátanos empanizados crujientes acompañados de helado de vainilla y topping de fresa, cajeta o chocolate.',
    ingredientKeys: ['Plátano', 'Empanizado (Panko)', 'Helado de vainilla', 'Jarabe de fresa', 'Cajeta', 'Jarabe de chocolate'],
  },
  {
    name: 'Oreo Tempura',
    category: 'Postres',
    station: 'caliente',
    price: 88,
    steps: 'Galletas Oreo capeadas en tempura caliente con helado de vainilla y topping de fresa, cajeta o chocolate.',
    ingredientKeys: ['Galleta Oreo', 'Harina tempura (Capeado)', 'Helado de vainilla', 'Jarabe de fresa', 'Cajeta', 'Jarabe de chocolate'],
  },
  {
    name: 'Churro Maky',
    category: 'Postres',
    station: 'caliente',
    price: 95,
    steps: 'Rollo empanizado espolvoreado con azúcar y canela, relleno de mango y queso crema con cajeta o chocolate.',
    ingredientKeys: ['Arroz para sushi', 'Empanizado (Panko)', 'Azúcar y canela', 'Mango', 'Queso crema', 'Cajeta', 'Jarabe de chocolate'],
  },

  // --- BEBIDAS (SIN COCINA ASIGNADA) ---
  {
    name: 'Agua (Natural)',
    category: 'Bebidas',
    station: 'ninguna',
    price: 40,
    steps: 'Agua natural purificada embotellada.',
    ingredientKeys: ['Agua purificada'],
  },
  {
    name: 'Té Verde (Frío)',
    category: 'Bebidas',
    station: 'ninguna',
    price: 44,
    steps: 'Infusión de té verde servida fría con hielo.',
    ingredientKeys: ['Té verde'],
  },
  {
    name: 'Té Verde (Caliente)',
    category: 'Bebidas',
    station: 'ninguna',
    price: 44,
    steps: 'Infusión tradicional de té verde caliente.',
    ingredientKeys: ['Té verde'],
  },
  {
    name: 'Refrescos (Línea Coca-Cola)',
    category: 'Bebidas',
    station: 'ninguna',
    price: 44,
    steps: 'Refresco embotellado de 355/600 ml a elegir.',
    ingredientKeys: ['Refresco embotellado'],
  },
  {
    name: 'Nestea',
    category: 'Bebidas',
    station: 'ninguna',
    price: 44,
    steps: 'Té helado embotellado sabor limón.',
    ingredientKeys: ['Nestea limón'],
  },
  {
    name: 'Topo Chico',
    category: 'Bebidas',
    station: 'ninguna',
    price: 45,
    steps: 'Botella de agua mineral de manantial Topo Chico.',
    ingredientKeys: ['Agua mineral Topo Chico'],
  },
  {
    name: 'Calpis Natural',
    category: 'Bebidas',
    station: 'ninguna',
    price: 47,
    steps: 'Bebida japonesa tradicional a base de concentrado lácteo y agua purificada.',
    ingredientKeys: ['Calpis concentrado', 'Agua purificada'],
  },
  {
    name: 'Limonada (Natural o Mineral)',
    category: 'Bebidas',
    station: 'ninguna',
    price: 47,
    steps: 'Jugo de limón natural recién exprimido con agua natural o mineral Topo Chico.',
    ingredientKeys: ['Jugo de limón', 'Agua purificada', 'Agua mineral Topo Chico', 'Azúcar y canela'],
  },
  {
    name: 'Naranjada (Natural o Mineral)',
    category: 'Bebidas',
    station: 'ninguna',
    price: 47,
    steps: 'Jugo de naranja natural recién exprimido con agua natural o mineral Topo Chico.',
    ingredientKeys: ['Naranja para jugo', 'Agua purificada', 'Agua mineral Topo Chico', 'Azúcar y canela'],
  },
  {
    name: 'Agua Mineral Preparada',
    category: 'Bebidas',
    station: 'ninguna',
    price: 49,
    steps: 'Agua mineral con jugo de limón fresco y escarchado de sal.',
    ingredientKeys: ['Agua mineral Topo Chico', 'Jugo de limón', 'Sal'],
  },
  {
    name: 'Calpis Mango',
    category: 'Bebidas',
    station: 'ninguna',
    price: 52,
    steps: 'Bebida calpis natural combinada con pulpa de mango.',
    ingredientKeys: ['Calpis concentrado', 'Pulpa de mango', 'Agua purificada'],
  },
  {
    name: 'Blue Citrus',
    category: 'Bebidas',
    station: 'ninguna',
    price: 52,
    steps: 'Limonada refrescante infusionada con jarabe de mora azul.',
    ingredientKeys: ['Jugo de limón', 'Jarabe mora azul', 'Agua purificada'],
  },
  {
    name: 'Cerveza Clara',
    category: 'Bebidas',
    station: 'ninguna',
    price: 56,
    steps: 'Cerveza clara nacional embotellada de 355 ml.',
    ingredientKeys: ['Cerveza clara'],
  },
  {
    name: 'Cerveza Oscura',
    category: 'Bebidas',
    station: 'ninguna',
    price: 56,
    steps: 'Cerveza oscura nacional embotellada de 355 ml.',
    ingredientKeys: ['Cerveza oscura'],
  },
  {
    name: 'Michelada',
    category: 'Bebidas',
    station: 'ninguna',
    price: 62,
    steps: 'Cerveza servida con vaso escarchado en sal, jugo de limón y mezcla de salsas.',
    ingredientKeys: ['Cerveza clara', 'Jugo de limón', 'Sal', 'Salsa de soya', 'Salsa chipotle'],
  },
  {
    name: 'Focos',
    category: 'Bebidas',
    station: 'ninguna',
    price: 66,
    steps: 'Bebida preparada especial servida en presentación de vaso tipo foco.',
    ingredientKeys: ['Presentación foco para bebida', 'Jugo de limón', 'Agua purificada'],
  },
  {
    name: 'Ramune',
    category: 'Bebidas',
    station: 'ninguna',
    price: 68,
    steps: 'Refresco japonés tradicional gasificado con canica de apertura sellada.',
    ingredientKeys: ['Refresco japonés Ramune'],
  },

  // --- ORDEN ADICIONAL (SIN COCINA ASIGNADA) ---
  {
    name: 'Soya (Orden adicional)',
    category: 'Orden Adicional',
    station: 'ninguna',
    price: 12,
    steps: 'Porción adicional de salsa de soya tradicional.',
    ingredientKeys: ['Salsa de soya'],
  },
  {
    name: 'Salsa Dulce (Orden adicional)',
    category: 'Orden Adicional',
    station: 'ninguna',
    price: 27,
    steps: 'Porción de salsa de anguila dulce.',
    ingredientKeys: ['Salsa dulce (Anguila)'],
  },
  {
    name: 'Aguacate (Orden adicional)',
    category: 'Orden Adicional',
    station: 'ninguna',
    price: 27,
    steps: 'Porción adicional de rebanadas de aguacate fresco.',
    ingredientKeys: ['Aguacate'],
  },
  {
    name: 'Queso Crema (Orden adicional)',
    category: 'Orden Adicional',
    station: 'ninguna',
    price: 27,
    steps: 'Porción adicional de queso crema.',
    ingredientKeys: ['Queso crema'],
  },
  {
    name: 'Tampico (Orden adicional)',
    category: 'Orden Adicional',
    station: 'ninguna',
    price: 30,
    steps: 'Porción adicional de pasta tampico de surimi.',
    ingredientKeys: ['Pasta Tampico'],
  },
  {
    name: 'Salsa Chipotle (Orden adicional)',
    category: 'Orden Adicional',
    station: 'ninguna',
    price: 30,
    steps: 'Porción adicional de mayonesa con chile chipotle.',
    ingredientKeys: ['Salsa chipotle'],
  },
  {
    name: 'Salsa Kushiage (Orden adicional)',
    category: 'Orden Adicional',
    station: 'ninguna',
    price: 30,
    steps: 'Porción adicional de salsa agridulce especial para brochetas kushiage.',
    ingredientKeys: ['Salsa kushiage'],
  },
  {
    name: 'Salsa Tamarindo (Orden adicional)',
    category: 'Orden Adicional',
    station: 'ninguna',
    price: 30,
    steps: 'Porción adicional de salsa artesanal de tamarindo agridulce.',
    ingredientKeys: ['Salsa de tamarindo'],
  },
  {
    name: 'Salsa Spicy (Orden adicional)',
    category: 'Orden Adicional',
    station: 'ninguna',
    price: 30,
    steps: 'Porción adicional de salsa picante cremosa.',
    ingredientKeys: ['Salsa spicy'],
  },
  {
    name: 'Salsa de Chile (Orden adicional)',
    category: 'Orden Adicional',
    station: 'ninguna',
    price: 30,
    steps: 'Porción adicional de salsa a base de aceite y chiles dorados.',
    ingredientKeys: ['Salsa de chile'],
  },
  {
    name: 'Shiracha (Orden adicional)',
    category: 'Orden Adicional',
    station: 'ninguna',
    price: 30,
    steps: 'Porción de salsa picante tipo sriracha.',
    ingredientKeys: ['Salsa sriracha'],
  },
  {
    name: 'Mayonesa Trufada (Orden adicional)',
    category: 'Orden Adicional',
    station: 'ninguna',
    price: 32,
    steps: 'Porción adicional de mayonesa emulsionada con aceite de trufa.',
    ingredientKeys: ['Mayonesa trufada'],
  },
  {
    name: 'Condimento de Salmón o Camarón (Orden adicional)',
    category: 'Orden Adicional',
    station: 'ninguna',
    price: 33,
    steps: 'Porción adicional de sazonador furikake de salmón o camarón.',
    ingredientKeys: ['Condimento de salmón', 'Condimento de camarón'],
  },
];

export async function seedOmikamiSushiMenu(options: { dryRun?: boolean; log?: boolean } = {}) {
  const { dryRun = false, log = true } = options;

  let uri = process.env.MONGODB_PATH || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('No se encontró MONGODB_PATH ni MONGODB_URI en el entorno.');
  }

  const dbName = process.env.MONGODB_DB_NAME || 'restaurant';
  if (uri.startsWith('mongodb+srv://') && !uri.includes('.mongodb.net/') && !uri.includes('.mongodb.net/' + dbName)) {
    uri = uri.replace('.mongodb.net', `.mongodb.net/${dbName}?retryWrites=true&w=majority`);
  } else if (uri.startsWith('mongodb+srv://') && uri.endsWith('.mongodb.net')) {
    uri = `${uri}/${dbName}?retryWrites=true&w=majority`;
  }

  const isAlreadyConnected = mongoose.connection.readyState === 1;
  if (!isAlreadyConnected) {
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 10000,
    });
  }

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('No se pudo conectar a la base de datos.');
  }

  const productsCollection = db.collection('products');
  const recipesCollection = db.collection('recipes');

  // Asegurar índices necesarios
  try {
    await recipesCollection.createIndex({ name: 1 }, { unique: true });
    await productsCollection.createIndex({ name: 1 }, { unique: true });
  } catch (idxErr: any) {
    // Si ya existen o hay conflicto de opciones se continúa de forma segura
  }

  if (log) {
    console.log('\n======================================================');
    console.log('🍣 [OMIKAMI SUSHI] Carga del Menú Oficial 2025');
    console.log(`📦 Base de Datos: ${db.databaseName}`);
    console.log(`🚀 Modo: ${dryRun ? 'DRY-RUN (Simulación sin escrituras)' : 'PRODUCCIÓN / IDEMPOTENTE'}`);
    console.log('======================================================\n');
  }

  // 1. Cargar productos existentes para reutilización y mapeo
  const existingProducts = await productsCollection.find().toArray();
  const productMapByName = new Map<string, any>(); // clave normalizada -> document
  for (const p of existingProducts) {
    productMapByName.set(normalizeText(p.name), p);
  }

  let reusedIngredientsCount = 0;
  let newIngredientsCreatedCount = 0;
  const canonicalToProductId = new Map<string, Types.ObjectId>();

  if (log) console.log('--- 1. Identificación, Reutilización y Alta de Insumos ---');

  for (const itemDef of INGREDIENTS_CATALOG) {
    const canonicalNorm = normalizeText(itemDef.canonicalName);

    // Buscar si ya existe por nombre canónico o por cualquiera de sus alias
    let matchedDoc: any = productMapByName.get(canonicalNorm);

    if (!matchedDoc) {
      for (const alias of itemDef.aliases) {
        const aliasNorm = normalizeText(alias);
        if (productMapByName.has(aliasNorm)) {
          matchedDoc = productMapByName.get(aliasNorm);
          break;
        }
      }
    }

    if (!matchedDoc) {
      // Buscar coincidencia parcial inteligente con productos existentes en DB
      for (const [key, pDoc] of productMapByName.entries()) {
        if (key === canonicalNorm || itemDef.aliases.some(a => normalizeText(a) === key)) {
          matchedDoc = pDoc;
          break;
        }
      }
    }

    if (matchedDoc) {
      canonicalToProductId.set(itemDef.canonicalName, matchedDoc._id);
      reusedIngredientsCount++;
      // Mapear también aliases al mismo doc
      for (const alias of itemDef.aliases) {
        productMapByName.set(normalizeText(alias), matchedDoc);
      }
    } else {
      // No existe: Crear nuevo insumo en inventario con valores no ficticios (stock: 0, costo: 0)
      const newProductDoc: any = {
        name: itemDef.canonicalName,
        price: 0,
        category: itemDef.category,
        stock: 0,
        unitMesure: itemDef.unit,
        baseUnit: itemDef.unit,
        purchaseUnit: itemDef.purchaseUnit || 'paquete',
        contentPerUnit: 1,
        contentUnit: itemDef.unit,
        description: `Insumo para recetas del menú Omikami Sushi (Categoría: ${itemDef.category})`,
        acquisitionCost: 0,
        unitCost: 0,
        isGeneric: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (!dryRun) {
        const insertRes = await productsCollection.insertOne(newProductDoc);
        newProductDoc._id = insertRes.insertedId;
      } else {
        newProductDoc._id = new Types.ObjectId();
      }

      canonicalToProductId.set(itemDef.canonicalName, newProductDoc._id);
      productMapByName.set(canonicalNorm, newProductDoc);
      for (const alias of itemDef.aliases) {
        productMapByName.set(normalizeText(alias), newProductDoc);
      }
      newIngredientsCreatedCount++;
    }
  }

  if (log) {
    console.log(`✅ Insumos verificados en inventario:`);
    console.log(`   - Reutilizados de registros existentes: ${reusedIngredientsCount}`);
    console.log(`   - Nuevos insumos registrados (stock 0, costo 0): ${newIngredientsCreatedCount}`);
  }

  // 2. Registro e idempotencia de recetas del menú
  if (log) console.log('\n--- 2. Registro y Actualización Idempotente de Recetas ---');

  const existingRecipes = await recipesCollection.find().toArray();
  const recipeMapByName = new Map<string, any>();
  for (const r of existingRecipes) {
    recipeMapByName.set(normalizeText(r.name), r);
  }

  let recipesUpdatedCount = 0;
  let recipesCreatedCount = 0;
  const stationCounts = {
    fria: 0,
    caliente: 0,
    ninguna: 0,
  };
  const categoryCounts: Record<string, number> = {};

  for (const rDef of OMIKAMI_RECIPES) {
    stationCounts[rDef.station]++;
    categoryCounts[rDef.category] = (categoryCounts[rDef.category] || 0) + 1;

    // Resolver los ObjectIds de los ingredientes para esta receta
    const formattedIngredients: Array<{
      ingredientId: Types.ObjectId;
      quantity: number;
      unitMesure: string;
    }> = [];

    for (const key of rDef.ingredientKeys) {
      let prodId = canonicalToProductId.get(key);
      let matchedItemDef = INGREDIENTS_CATALOG.find(i => i.canonicalName === key);

      if (!prodId) {
        // Intentar búsqueda por normalización
        const keyNorm = normalizeText(key);
        const pDoc = productMapByName.get(keyNorm);
        if (pDoc) {
          prodId = pDoc._id;
          matchedItemDef = INGREDIENTS_CATALOG.find(i => normalizeText(i.canonicalName) === keyNorm || i.aliases.some(a => normalizeText(a) === keyNorm));
        }
      }

      if (prodId) {
        // Evitar duplicados de un mismo ingrediente dentro de la misma receta
        if (!formattedIngredients.some(ing => ing.ingredientId.equals(prodId!))) {
          formattedIngredients.push({
            ingredientId: prodId,
            quantity: 0, // 0 = pendiente de configuración de gramaje real por administrador, sin consumos falsos
            unitMesure: matchedItemDef?.unit || 'g',
          });
        }
      } else {
        console.warn(`⚠️ Insumo no encontrado para receta "${rDef.name}": "${key}"`);
      }
    }

    const rNorm = normalizeText(rDef.name);
    const existing = recipeMapByName.get(rNorm);

    if (existing) {
      if (!dryRun) {
        await recipesCollection.updateOne(
          { _id: existing._id },
          {
            $set: {
              name: rDef.name,
              category: rDef.category,
              station: rDef.station,
              price: rDef.price,
              steps: rDef.steps || existing.steps || '',
              ingredients: formattedIngredients,
              isActive: true,
              updatedAt: new Date(),
            },
          }
        );
      }
      recipesUpdatedCount++;
    } else {
      if (!dryRun) {
        await recipesCollection.insertOne({
          name: rDef.name,
          category: rDef.category,
          station: rDef.station,
          price: rDef.price,
          steps: rDef.steps || '',
          ingredients: formattedIngredients,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      recipesCreatedCount++;
    }
  }

  if (log) {
    console.log(`✅ Recetas procesadas con éxito:`);
    console.log(`   - Creadas nuevas: ${recipesCreatedCount}`);
    console.log(`   - Actualizadas / Sincronizadas: ${recipesUpdatedCount}`);
    console.log(`   - Total de recetas en el menú Omikami: ${OMIKAMI_RECIPES.length}`);
    console.log(`\n📊 Distribución por estación de cocina:`);
    console.log(`   - Cocina Fría (fria): ${stationCounts.fria}`);
    console.log(`   - Cocina Caliente (caliente): ${stationCounts.caliente}`);
    console.log(`   - Sin Cocina Asignada (ninguna): ${stationCounts.ninguna}`);
    console.log(`\n📂 Distribución por categorías (${Object.keys(categoryCounts).length} secciones):`);
    for (const [cat, count] of Object.entries(categoryCounts)) {
      console.log(`   - ${cat}: ${count} productos`);
    }
    console.log('======================================================\n');
  }

  if (!isAlreadyConnected) {
    await mongoose.disconnect();
  }

  return {
    totalRecipes: OMIKAMI_RECIPES.length,
    recipesCreated: recipesCreatedCount,
    recipesUpdated: recipesUpdatedCount,
    reusedIngredients: reusedIngredientsCount,
    newIngredientsCreated: newIngredientsCreatedCount,
    stationCounts,
    categoryCounts,
  };
}

if (require.main === module) {
  seedOmikamiSushiMenu()
    .then(() => {
      console.log('🎉 Menú Omikami Sushi 2025 cargado exitosamente.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error cargando el menú Omikami Sushi:', err);
      process.exit(1);
    });
}
