import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Types } from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface ProductSeed {
  name: string;
  category: string;
  stock: number;
  baseUnit: string;
  purchaseUnit: string;
  contentPerUnit: number;
  contentUnit: string;
  acquisitionCost: number;
  unitCost: number;
  price: number;
  description: string;
  returnableOnCancel?: boolean;
}

interface RecipeSeed {
  name: string;
  price: number;
  category: string;
  description: string;
  ingredients: Array<{
    productName: string;
    quantity: number;
    unitMesure: string;
  }>;
}

async function runSeed() {
  const uri = process.env.MONGODB_PATH || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ Error: No se encontró MONGODB_PATH ni MONGODB_URI.');
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB_NAME || 'restaurant';
  console.log(`📡 Conectando a MongoDB para inicialización de datos de prueba...`);

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 15000,
  });

  const db = mongoose.connection.db;
  if (!db) throw new Error('No se pudo conectar a la base de datos.');

  const productsCollection = db.collection('products');
  const recipesCollection = db.collection('recipes');
  const tablesCollection = db.collection('tables');

  console.log('\n--- 1. RETIRAR PRODUCTOS DEL CATÁLOGO ACTIVO ---');
  const retiredProductNames = [
    'Doritos Nachos',
    'Jamón de pierna FUD',
    'Jamon de pierna FUD',
    'Leche entera',
    'Huevo',
    'Jamón de pierna',
    'Jamon de pierna',
  ];

  for (const name of retiredProductNames) {
    const res = await productsCollection.updateMany(
      { name: { $regex: new RegExp(`^${name}$`, 'i') } },
      { $set: { isActive: false, updatedAt: new Date() } }
    );
    if (res.matchedCount > 0) {
      console.log(`🔒 Producto retirado (desactivado lógicamente): "${name}" (${res.modifiedCount} docs actualizados).`);
    }
  }

  console.log('\n--- 2. REGISTRAR INSUMOS GENÉRICOS ---');
  const genericProducts: ProductSeed[] = [
    {
      name: 'Huevo blanco fresco',
      category: 'Insumos de cocina',
      stock: 120,
      baseUnit: 'pieza',
      purchaseUnit: 'caja',
      contentPerUnit: 120,
      contentUnit: 'pieza',
      acquisitionCost: 500,
      unitCost: 4.17,
      price: 4.17,
      description: 'Huevo fresco blanco genérico de granja',
    },
    {
      name: 'Jamón cocido genérico',
      category: 'Carnes',
      stock: 2500,
      baseUnit: 'g',
      purchaseUnit: 'paquete',
      contentPerUnit: 2500,
      contentUnit: 'g',
      acquisitionCost: 250,
      unitCost: 0.10,
      price: 0.10,
      description: 'Jamón cocido rebanado a granel sin marca',
    },
    {
      name: 'Carne molida de res',
      category: 'Carnes',
      stock: 5000,
      baseUnit: 'g',
      purchaseUnit: 'paquete',
      contentPerUnit: 5000,
      contentUnit: 'g',
      acquisitionCost: 700,
      unitCost: 0.14,
      price: 0.14,
      description: 'Carne molida de res magra para hamburguesas',
    },
    {
      name: 'Harina de trigo',
      category: 'Abarrotes',
      stock: 10000,
      baseUnit: 'g',
      purchaseUnit: 'bulto',
      contentPerUnit: 10000,
      contentUnit: 'g',
      acquisitionCost: 220,
      unitCost: 0.022,
      price: 0.022,
      description: 'Harina de trigo pura para masa de pizza y panadería',
    },
    {
      name: 'Queso mozzarella',
      category: 'Lácteos',
      stock: 3000,
      baseUnit: 'g',
      purchaseUnit: 'barra',
      contentPerUnit: 3000,
      contentUnit: 'g',
      acquisitionCost: 450,
      unitCost: 0.15,
      price: 0.15,
      description: 'Queso mozzarella rallado para gratinar',
    },
    {
      name: 'Jitomate bola',
      category: 'Frutas y verduras',
      stock: 4000,
      baseUnit: 'g',
      purchaseUnit: 'caja',
      contentPerUnit: 4000,
      contentUnit: 'g',
      acquisitionCost: 120,
      unitCost: 0.03,
      price: 0.03,
      description: 'Jitomate bola fresco seleccionado',
    },
    {
      name: 'Cebolla blanca',
      category: 'Frutas y verduras',
      stock: 2000,
      baseUnit: 'g',
      purchaseUnit: 'malla',
      contentPerUnit: 2000,
      contentUnit: 'g',
      acquisitionCost: 70,
      unitCost: 0.035,
      price: 0.035,
      description: 'Cebolla blanca fresca para cocina',
    },
    {
      name: 'Lechuga',
      category: 'Frutas y verduras',
      stock: 10,
      baseUnit: 'pieza',
      purchaseUnit: 'pieza',
      contentPerUnit: 1,
      contentUnit: 'pieza',
      acquisitionCost: 150,
      unitCost: 15.00,
      price: 15.00,
      description: 'Lechuga fresca para hamburguesas',
    },
    {
      name: 'Naranja para jugo',
      category: 'Frutas y verduras',
      stock: 5000,
      baseUnit: 'g',
      purchaseUnit: 'costal',
      contentPerUnit: 5000,
      contentUnit: 'g',
      acquisitionCost: 125,
      unitCost: 0.025,
      price: 0.025,
      description: 'Naranja valenciana para extracción de jugo',
    },
    {
      name: 'Arroz para sushi',
      category: 'Abarrotes',
      stock: 3000,
      baseUnit: 'g',
      purchaseUnit: 'bolsa',
      contentPerUnit: 3000,
      contentUnit: 'g',
      acquisitionCost: 180,
      unitCost: 0.06,
      price: 0.06,
      description: 'Arroz grano corto especial para sushi',
    },
    {
      name: 'Pepino fresco',
      category: 'Frutas y verduras',
      stock: 2000,
      baseUnit: 'g',
      purchaseUnit: 'kilo',
      contentPerUnit: 2000,
      contentUnit: 'g',
      acquisitionCost: 60,
      unitCost: 0.03,
      price: 0.03,
      description: 'Pepino verde fresco',
    },
    {
      name: 'Aguacate',
      category: 'Frutas y verduras',
      stock: 2000,
      baseUnit: 'g',
      purchaseUnit: 'kilo',
      contentPerUnit: 2000,
      contentUnit: 'g',
      acquisitionCost: 160,
      unitCost: 0.08,
      price: 0.08,
      description: 'Aguacate fresco para sushi y guarniciones',
    },
    {
      name: 'Surimi',
      category: 'Carnes',
      stock: 1500,
      baseUnit: 'g',
      purchaseUnit: 'paquete',
      contentPerUnit: 1500,
      contentUnit: 'g',
      acquisitionCost: 180,
      unitCost: 0.12,
      price: 0.12,
      description: 'Barras de surimi genérico de pescado',
    },
    {
      name: 'Aceite vegetal',
      category: 'Insumos de cocina',
      stock: 5000,
      baseUnit: 'ml',
      purchaseUnit: 'bidón',
      contentPerUnit: 5000,
      contentUnit: 'ml',
      acquisitionCost: 200,
      unitCost: 0.04,
      price: 0.04,
      description: 'Aceite vegetal comestible para cocina',
    },
    {
      name: 'Azúcar',
      category: 'Abarrotes',
      stock: 2000,
      baseUnit: 'g',
      purchaseUnit: 'bolsa',
      contentPerUnit: 2000,
      contentUnit: 'g',
      acquisitionCost: 60,
      unitCost: 0.03,
      price: 0.03,
      description: 'Azúcar estándar de caña',
    },
    {
      name: 'Pan para hamburguesa',
      category: 'Panadería',
      stock: 30,
      baseUnit: 'pieza',
      purchaseUnit: 'paquete',
      contentPerUnit: 30,
      contentUnit: 'pieza',
      acquisitionCost: 150,
      unitCost: 5.00,
      price: 5.00,
      description: 'Bollos para hamburguesa individuales',
    },
    {
      name: 'Queso para hamburguesa',
      category: 'Lácteos',
      stock: 1500,
      baseUnit: 'g',
      purchaseUnit: 'paquete',
      contentPerUnit: 1500,
      contentUnit: 'g',
      acquisitionCost: 180,
      unitCost: 0.12,
      price: 0.12,
      description: 'Queso tipo americano en rebanadas para hamburguesa',
    },
    {
      name: 'Aderezo',
      category: 'Insumos de cocina',
      stock: 1000,
      baseUnit: 'ml',
      purchaseUnit: 'botella',
      contentPerUnit: 1000,
      contentUnit: 'ml',
      acquisitionCost: 90,
      unitCost: 0.09,
      price: 0.09,
      description: 'Aderezo especial para hamburguesas',
    },
    {
      name: 'Sal',
      category: 'Especias y condimentos',
      stock: 1000,
      baseUnit: 'g',
      purchaseUnit: 'bolsa',
      contentPerUnit: 1000,
      contentUnit: 'g',
      acquisitionCost: 20,
      unitCost: 0.02,
      price: 0.02,
      description: 'Sal de mesa yodada',
    },
    {
      name: 'Levadura',
      category: 'Abarrotes',
      stock: 500,
      baseUnit: 'g',
      purchaseUnit: 'paquete',
      contentPerUnit: 500,
      contentUnit: 'g',
      acquisitionCost: 60,
      unitCost: 0.12,
      price: 0.12,
      description: 'Levadura seca de panadería para masa de pizza',
    },
    {
      name: 'Salsa de tomate',
      category: 'Abarrotes',
      stock: 3000,
      baseUnit: 'g',
      purchaseUnit: 'lata',
      contentPerUnit: 3000,
      contentUnit: 'g',
      acquisitionCost: 120,
      unitCost: 0.04,
      price: 0.04,
      description: 'Salsa de tomate condimentada para pizza',
    },
    {
      name: 'Pepperoni genérico',
      category: 'Carnes',
      stock: 1500,
      baseUnit: 'g',
      purchaseUnit: 'paquete',
      contentPerUnit: 1500,
      contentUnit: 'g',
      acquisitionCost: 225,
      unitCost: 0.15,
      price: 0.15,
      description: 'Pepperoni rebanado genérico para pizza',
    },
    {
      name: 'Orégano',
      category: 'Especias y condimentos',
      stock: 200,
      baseUnit: 'g',
      purchaseUnit: 'frasco',
      contentPerUnit: 200,
      contentUnit: 'g',
      acquisitionCost: 40,
      unitCost: 0.20,
      price: 0.20,
      description: 'Orégano seco molido aromático',
    },
    {
      name: 'Carne de cerdo',
      category: 'Carnes',
      stock: 4000,
      baseUnit: 'g',
      purchaseUnit: 'paquete',
      contentPerUnit: 4000,
      contentUnit: 'g',
      acquisitionCost: 480,
      unitCost: 0.12,
      price: 0.12,
      description: 'Carne de pierna de cerdo marinada al pastor',
    },
    {
      name: 'Tortillas de maíz',
      category: 'Abarrotes',
      stock: 100,
      baseUnit: 'pieza',
      purchaseUnit: 'paquete',
      contentPerUnit: 100,
      contentUnit: 'pieza',
      acquisitionCost: 80,
      unitCost: 0.80,
      price: 0.80,
      description: 'Tortillas de maíz para tacos',
    },
    {
      name: 'Piña',
      category: 'Frutas y verduras',
      stock: 2000,
      baseUnit: 'g',
      purchaseUnit: 'pieza',
      contentPerUnit: 2000,
      contentUnit: 'g',
      acquisitionCost: 60,
      unitCost: 0.03,
      price: 0.03,
      description: 'Piña fresca pelada y rebanada para tacos al pastor',
    },
    {
      name: 'Cilantro',
      category: 'Frutas y verduras',
      stock: 500,
      baseUnit: 'g',
      purchaseUnit: 'manojo',
      contentPerUnit: 500,
      contentUnit: 'g',
      acquisitionCost: 25,
      unitCost: 0.05,
      price: 0.05,
      description: 'Cilantro fresco picado',
    },
    {
      name: 'Salsa',
      category: 'Insumos de cocina',
      stock: 2000,
      baseUnit: 'ml',
      purchaseUnit: 'recipiente',
      contentPerUnit: 2000,
      contentUnit: 'ml',
      acquisitionCost: 80,
      unitCost: 0.04,
      price: 0.04,
      description: 'Salsa taquera para acompañar tacos al pastor',
    },
    {
      name: 'Alga nori',
      category: 'Abarrotes',
      stock: 50,
      baseUnit: 'pieza',
      purchaseUnit: 'paquete',
      contentPerUnit: 50,
      contentUnit: 'pieza',
      acquisitionCost: 150,
      unitCost: 3.00,
      price: 3.00,
      description: 'Hojas de alga nori deshidratada para sushi',
    },
    {
      name: 'Queso crema',
      category: 'Lácteos',
      stock: 1500,
      baseUnit: 'g',
      purchaseUnit: 'barra',
      contentPerUnit: 1500,
      contentUnit: 'g',
      acquisitionCost: 210,
      unitCost: 0.14,
      price: 0.14,
      description: 'Queso crema untable para sushi',
    },
    {
      name: 'Ajonjolí',
      category: 'Especias y condimentos',
      stock: 500,
      baseUnit: 'g',
      purchaseUnit: 'bolsa',
      contentPerUnit: 500,
      contentUnit: 'g',
      acquisitionCost: 45,
      unitCost: 0.09,
      price: 0.09,
      description: 'Ajonjolí tostado para cubierta de sushi',
    },
    {
      name: 'Agua purificada',
      category: 'Bebidas',
      stock: 10000,
      baseUnit: 'ml',
      purchaseUnit: 'garrafón',
      contentPerUnit: 10000,
      contentUnit: 'ml',
      acquisitionCost: 50,
      unitCost: 0.005,
      price: 0.005,
      description: 'Agua purificada para preparación de jugo',
    },
    // Productos terminados individuales (bebidas envasadas)
    {
      name: 'Agua embotellada Ciel',
      category: 'Bebidas',
      stock: 48,
      baseUnit: 'pieza',
      purchaseUnit: 'paquete',
      contentPerUnit: 24,
      contentUnit: 'pieza',
      acquisitionCost: 384,
      unitCost: 8.00,
      price: 8.00,
      description: 'Botella individual de agua purificada Ciel 600 ml',
      returnableOnCancel: true,
    },
    {
      name: 'Coca-Cola de 600 ml',
      category: 'Bebidas',
      stock: 48,
      baseUnit: 'pieza',
      purchaseUnit: 'paquete',
      contentPerUnit: 24,
      contentUnit: 'pieza',
      acquisitionCost: 576,
      unitCost: 12.00,
      price: 12.00,
      description: 'Botella individual de Coca-Cola original 600 ml',
      returnableOnCancel: true,
    },
  ];

  const productMap = new Map<string, Types.ObjectId>();

  for (const p of genericProducts) {
    const existing = await productsCollection.findOne({ name: p.name });
    if (existing) {
      await productsCollection.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...p,
            isActive: true,
            unitMesure: p.baseUnit,
            updatedAt: new Date(),
          },
        }
      );
      productMap.set(p.name, existing._id as Types.ObjectId);
      console.log(`✓ Insumo actualizado: "${p.name}" (Stock: ${p.stock} ${p.baseUnit}, Costo U: $${p.unitCost})`);
    } else {
      const inserted = await productsCollection.insertOne({
        ...p,
        isActive: true,
        unitMesure: p.baseUnit,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      productMap.set(p.name, inserted.insertedId as unknown as Types.ObjectId);
      console.log(`✨ Insumo creado: "${p.name}" (Stock: ${p.stock} ${p.baseUnit}, Costo U: $${p.unitCost})`);
    }
  }

  console.log('\n--- 3. REGISTRAR LAS 8 RECETAS GENÉRICAS ---');
  const recipesList: RecipeSeed[] = [
    {
      name: 'Hamburguesa',
      price: 110.0,
      category: 'Platillos',
      description: 'Hamburguesa con pan suave, carne de res, queso, lechuga, jitomate, cebolla y aderezo',
      ingredients: [
        { productName: 'Pan para hamburguesa', quantity: 1, unitMesure: 'pieza' },
        { productName: 'Carne molida de res', quantity: 180, unitMesure: 'g' },
        { productName: 'Queso para hamburguesa', quantity: 30, unitMesure: 'g' },
        { productName: 'Lechuga', quantity: 1, unitMesure: 'pieza' },
        { productName: 'Jitomate bola', quantity: 50, unitMesure: 'g' },
        { productName: 'Cebolla blanca', quantity: 30, unitMesure: 'g' },
        { productName: 'Aderezo', quantity: 25, unitMesure: 'ml' },
      ],
    },
    {
      name: 'Huevos con jamón',
      price: 65.0,
      category: 'Desayunos',
      description: 'Huevos revueltos con jamón cocido, aceite vegetal y sal',
      ingredients: [
        { productName: 'Huevo blanco fresco', quantity: 2, unitMesure: 'pieza' },
        { productName: 'Jamón cocido genérico', quantity: 60, unitMesure: 'g' },
        { productName: 'Aceite vegetal', quantity: 15, unitMesure: 'ml' },
        { productName: 'Sal', quantity: 2, unitMesure: 'g' },
      ],
    },
    {
      name: 'Pizza',
      price: 160.0,
      category: 'Platillos',
      description: 'Pizza de pepperoni con harina de trigo, levadura, salsa de tomate, queso mozzarella y orégano',
      ingredients: [
        { productName: 'Harina de trigo', quantity: 200, unitMesure: 'g' },
        { productName: 'Levadura', quantity: 5, unitMesure: 'g' },
        { productName: 'Salsa de tomate', quantity: 80, unitMesure: 'g' },
        { productName: 'Queso mozzarella', quantity: 120, unitMesure: 'g' },
        { productName: 'Pepperoni genérico', quantity: 50, unitMesure: 'g' },
        { productName: 'Orégano', quantity: 2, unitMesure: 'g' },
      ],
    },
    {
      name: 'Tacos al pastor',
      price: 85.0,
      category: 'Platillos',
      description: 'Orden de tacos con carne de cerdo marinada al pastor, tortillas de maíz, piña, cebolla, cilantro y salsa',
      ingredients: [
        { productName: 'Carne de cerdo', quantity: 160, unitMesure: 'g' },
        { productName: 'Tortillas de maíz', quantity: 4, unitMesure: 'pieza' },
        { productName: 'Piña', quantity: 40, unitMesure: 'g' },
        { productName: 'Cebolla blanca', quantity: 30, unitMesure: 'g' },
        { productName: 'Cilantro', quantity: 10, unitMesure: 'g' },
        { productName: 'Salsa', quantity: 40, unitMesure: 'ml' },
      ],
    },
    {
      name: 'Agua embotellada Ciel',
      price: 25.0,
      category: 'Bebidas',
      description: 'Presentación individual de agua embotellada de 600 ml',
      ingredients: [
        { productName: 'Agua embotellada Ciel', quantity: 1, unitMesure: 'pieza' },
      ],
    },
    {
      name: 'Coca-Cola de 600 ml',
      price: 35.0,
      category: 'Bebidas',
      description: 'Presentación de refresco embotellado de 600 ml individual',
      ingredients: [
        { productName: 'Coca-Cola de 600 ml', quantity: 1, unitMesure: 'pieza' },
      ],
    },
    {
      name: 'Jugo de naranja',
      price: 40.0,
      category: 'Bebidas',
      description: 'Jugo fresco de naranja natural con agua purificada y toque de azúcar',
      ingredients: [
        { productName: 'Naranja para jugo', quantity: 350, unitMesure: 'g' },
        { productName: 'Agua purificada', quantity: 100, unitMesure: 'ml' },
        { productName: 'Azúcar', quantity: 15, unitMesure: 'g' },
      ],
    },
    {
      name: 'Sushi California Roll',
      price: 135.0,
      category: 'Platillos',
      description: 'Rollo California con arroz para sushi, alga nori, pepino, aguacate, surimi, queso crema y ajonjolí',
      ingredients: [
        { productName: 'Arroz para sushi', quantity: 140, unitMesure: 'g' },
        { productName: 'Alga nori', quantity: 1, unitMesure: 'pieza' },
        { productName: 'Pepino fresco', quantity: 40, unitMesure: 'g' },
        { productName: 'Aguacate', quantity: 40, unitMesure: 'g' },
        { productName: 'Surimi', quantity: 50, unitMesure: 'g' },
        { productName: 'Queso crema', quantity: 35, unitMesure: 'g' },
        { productName: 'Ajonjolí', quantity: 10, unitMesure: 'g' },
      ],
    },
  ];

  for (const r of recipesList) {
    const formattedIngredients = r.ingredients.map((ing) => {
      const pid = productMap.get(ing.productName);
      if (!pid) throw new Error(`Insumo no encontrado en productMap: ${ing.productName}`);
      return {
        ingredientId: new Types.ObjectId(pid.toString()),
        quantity: ing.quantity,
        unitMesure: ing.unitMesure,
      };
    });

    // Check if recipe exists by exact or equivalent name
    const existing = await recipesCollection.findOne({
      $or: [
        { name: r.name },
        { name: { $regex: new RegExp(`^${r.name}$`, 'i') } },
      ],
    });

    if (existing) {
      await recipesCollection.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: r.name,
            price: r.price,
            category: r.category,
            description: r.description,
            ingredients: formattedIngredients,
            isActive: true,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`✓ Receta actualizada: "${r.name}" ($${r.price} MXN, ${formattedIngredients.length} ingredientes)`);
    } else {
      await recipesCollection.insertOne({
        name: r.name,
        price: r.price,
        category: r.category,
        description: r.description,
        ingredients: formattedIngredients,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✨ Receta creada: "${r.name}" ($${r.price} MXN, ${formattedIngredients.length} ingredientes)`);
    }
  }

  console.log('\n--- 4. AGREGAR CUATRO MESAS NUEVAS ---');
  const newTables = [
    { number: 11, capacity: 2, status: 'disponible' },
    { number: 12, capacity: 4, status: 'disponible' },
    { number: 13, capacity: 6, status: 'disponible' },
    { number: 14, capacity: 8, status: 'disponible' },
  ];

  for (const t of newTables) {
    const existing = await tablesCollection.findOne({ number: t.number });
    if (existing) {
      console.log(`ℹ️ Mesa #${t.number} ya existe (Capacidad: ${existing.capacity}, Estado: ${existing.status}) - Conservada.`);
    } else {
      await tablesCollection.insertOne({
        number: t.number,
        capacity: t.capacity,
        status: t.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✨ Mesa creada: Mesa #${t.number} (Capacidad: ${t.capacity} personas, Estado: ${t.status})`);
    }
  }

  console.log('\n======================================================');
  console.log('✅ PREPARACIÓN DE DATOS DE PRUEBA EXITOSA Y CONSISTENTE.');
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('❌ Error en script de prueba:', err);
  process.exit(1);
});

