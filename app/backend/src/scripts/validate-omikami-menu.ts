import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../atlas-credentials.env') });

async function validateOmikamiMenu() {
  let uri = process.env.MONGODB_PATH || process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_PATH / URI');
  const dbName = process.env.MONGODB_DB_NAME || 'restaurant';

  if (uri.startsWith('mongodb+srv://') && !uri.includes('.mongodb.net/') && !uri.includes('.mongodb.net/' + dbName)) {
    uri = uri.replace('.mongodb.net', `.mongodb.net/${dbName}?retryWrites=true&w=majority`);
  } else if (uri.startsWith('mongodb+srv://') && uri.endsWith('.mongodb.net')) {
    uri = `${uri}/${dbName}?retryWrites=true&w=majority`;
  }

  await mongoose.connect(uri, { dbName });
  const db = mongoose.connection.db;
  if (!db) throw new Error('No DB');

  console.log('\n======================================================');
  console.log('🔍 [VALIDACIÓN Y AUDITORÍA DEL MENÚ OMIKAMI SUSHI]');
  console.log('======================================================\n');

  const productsCollection = db.collection('products');
  const recipesCollection = db.collection('recipes');

  const products = await productsCollection.find().toArray();
  const recipes = await recipesCollection.find({ isActive: { $ne: false } }).toArray();

  console.log(`📦 Total de insumos (inventario): ${products.length}`);
  console.log(`🍽️ Total de recetas activas en el POS: ${recipes.length}`);

  // 1. Validar no duplicados en productos (por nombre normalizado)
  const productNames = new Map<string, number>();
  for (const p of products) {
    const norm = p.name.trim().toLowerCase();
    productNames.set(norm, (productNames.get(norm) || 0) + 1);
  }
  const duplicateProducts = Array.from(productNames.entries()).filter(([_, count]) => count > 1);
  console.log(`\n1️⃣ Duplicados en inventario: ${duplicateProducts.length === 0 ? '✅ NINGUNO' : `❌ ${duplicateProducts.length} duplicados`}`);
  if (duplicateProducts.length > 0) {
    console.log('   Duplicados:', duplicateProducts);
  }

  // 2. Validar no duplicados en recetas (por nombre normalizado)
  const recipeNames = new Map<string, number>();
  for (const r of recipes) {
    const norm = r.name.trim().toLowerCase();
    recipeNames.set(norm, (recipeNames.get(norm) || 0) + 1);
  }
  const duplicateRecipes = Array.from(recipeNames.entries()).filter(([_, count]) => count > 1);
  console.log(`2️⃣ Duplicados en recetas: ${duplicateRecipes.length === 0 ? '✅ NINGUNO' : `❌ ${duplicateRecipes.length} duplicados`}`);
  if (duplicateRecipes.length > 0) {
    console.log('   Duplicados:', duplicateRecipes);
  }

  // 3. Validar estaciones de cocina
  let coldCount = 0;
  let hotCount = 0;
  let noneCount = 0;
  let invalidStation = 0;

  for (const r of recipes) {
    if (r.station === 'fria') coldCount++;
    else if (r.station === 'caliente') hotCount++;
    else if (r.station === 'ninguna') noneCount++;
    else invalidStation++;
  }

  console.log(`3️⃣ Estaciones de cocina:`);
  console.log(`   - Cocina Fría (fria): ${coldCount}`);
  console.log(`   - Cocina Caliente (caliente): ${hotCount}`);
  console.log(`   - Sin Cocina Asignada (ninguna): ${noneCount}`);
  console.log(`   - Estaciones inválidas: ${invalidStation === 0 ? '✅ 0' : `❌ ${invalidStation}`}`);

  // 4. Validar integridad referencial de ingredientes
  const productIds = new Set(products.map((p) => p._id.toString()));
  let brokenIngredientRefs = 0;
  let recipesWithIngredients = 0;
  let totalIngredientLinks = 0;

  for (const r of recipes) {
    const ingredients = r.ingredients || [];
    if (ingredients.length > 0) {
      recipesWithIngredients++;
      for (const ing of ingredients) {
        totalIngredientLinks++;
        const idStr = ing.ingredientId?.toString();
        if (!idStr || !productIds.has(idStr)) {
          brokenIngredientRefs++;
          console.warn(`❌ Referencia rota en receta "${r.name}": ingredientId=${idStr}`);
        }
      }
    }
  }

  console.log(`4️⃣ Integridad de recetas e insumos:`);
  console.log(`   - Recetas con ingredientes vinculados: ${recipesWithIngredients} / ${recipes.length}`);
  console.log(`   - Enlaces totales receta <-> insumo: ${totalIngredientLinks}`);
  console.log(`   - Referencias rotas o huérfanas: ${brokenIngredientRefs === 0 ? '✅ 0 (Todas válidas)' : `❌ ${brokenIngredientRefs}`}`);

  // 5. Validar que no se crearon existencias ficticias en los insumos de Omikami
  const omikamiInsumos = products.filter(p => p.description && p.description.includes('Omikami'));
  const fakeStockInsumos = omikamiInsumos.filter(p => p.stock > 0);
  console.log(`5️⃣ Verificación de stock ficticio en insumos nuevos:`);
  console.log(`   - Insumos nuevos dados de alta: ${omikamiInsumos.length}`);
  console.log(`   - Insumos con stock ficticio (> 0): ${fakeStockInsumos.length === 0 ? '✅ 0 (Todos stock = 0)' : `❌ ${fakeStockInsumos.length}`}`);

  // 6. Validar representatividad de secciones del Markdown
  const categories = new Set(recipes.map((r) => r.category));
  console.log(`6️⃣ Categorías representadas (${categories.size} secciones):`);
  for (const c of Array.from(categories).sort()) {
    const count = recipes.filter((r) => r.category === c).length;
    console.log(`   - ${c || 'Sin categoría'}: ${count} productos`);
  }

  // 7. Muestreo de platillos clave de Omikami y sus precios
  console.log(`\n7️⃣ Verificación de precios y variantes de muestra:`);
  const samples = [
    { name: 'Edamames al Vapor (150 gr)', expectedPrice: 76, expectedStation: 'caliente' },
    { name: 'Edamames Asados (150 gr)', expectedPrice: 85, expectedStation: 'caliente' },
    { name: 'Kushiague de Plátano (1 pieza)', expectedPrice: 30, expectedStation: 'caliente' },
    { name: 'Kushiague de Plátano (Orden 3 piezas)', expectedPrice: 85, expectedStation: 'caliente' },
    { name: 'Sashimi Salmón Fresco (Corte fino 90 gr)', expectedPrice: 152, expectedStation: 'fria' },
    { name: 'Sashimi Salmón Fresco (Corte grueso 140 gr)', expectedPrice: 219, expectedStation: 'fria' },
    { name: 'Té Verde (Frío)', expectedPrice: 44, expectedStation: 'ninguna' },
    { name: 'Té Verde (Caliente)', expectedPrice: 44, expectedStation: 'ninguna' },
    { name: 'Combo Omikami', expectedPrice: 250, expectedStation: 'ninguna' },
    { name: 'Yasai Roll', expectedPrice: 100, expectedStation: 'caliente' },
    { name: 'Filadelfia', expectedPrice: 112, expectedStation: 'fria' },
    { name: 'Yakimeshi Mixto', expectedPrice: 117, expectedStation: 'caliente' },
  ];

  let sampleErrors = 0;
  for (const s of samples) {
    const found = recipes.find(r => r.name.toLowerCase() === s.name.toLowerCase());
    if (!found) {
      console.log(`   ❌ No encontrado: ${s.name}`);
      sampleErrors++;
    } else {
      const priceOk = found.price === s.expectedPrice;
      const stationOk = found.station === s.expectedStation;
      if (priceOk && stationOk) {
        console.log(`   ✅ ${found.name}: $${found.price} | Estación: ${found.station} | ${found.ingredients?.length || 0} insumos vinculados`);
      } else {
        console.log(`   ❌ Inconsistencia en ${found.name}: Precio ${found.price} (esp: ${s.expectedPrice}), Estación ${found.station} (esp: ${s.expectedStation})`);
        sampleErrors++;
      }
    }
  }

  console.log(`\n======================================================`);
  if (duplicateProducts.length === 0 && duplicateRecipes.length === 0 && brokenIngredientRefs === 0 && fakeStockInsumos.length === 0 && sampleErrors === 0) {
    console.log('🎉 AUDITORÍA COMPLETA: TODOS LOS PUNTOS DE CONTROL APROBADOS.');
  } else {
    console.log('⚠️ AUDITORÍA FINALIZADA CON ADVERTENCIAS O ERRORES.');
  }
  console.log('======================================================\n');

  await mongoose.disconnect();
}

validateOmikamiMenu().catch(err => {
  console.error(err);
  process.exit(1);
});
