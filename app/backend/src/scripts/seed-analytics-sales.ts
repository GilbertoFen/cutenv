import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../atlas-credentials.env') });

async function seedAnalyticsSales() {
  const uri = process.env.MONGODB_PATH || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('No se encontró MONGODB_PATH ni MONGODB_URI');
  }

  const dbName = process.env.MONGODB_DB_NAME || 'restaurant';
  console.log(`📡 Conectando a MongoDB Atlas para generar ventas de prueba: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);

  await mongoose.connect(uri, { dbName });
  const db = mongoose.connection.db;
  if (!db) throw new Error('No se pudo conectar a la base de datos');

  console.log('✅ Conexión establecida a MongoDB Atlas.\n');

  const tablesCol = db.collection('tables');
  const recipesCol = db.collection('recipes');
  const promoCol = db.collection('promotions');
  const ordersCol = db.collection('orders');
  const salesCol = db.collection('sales');

  const tables = await tablesCol.find().toArray();
  const recipes = await recipesCol.find().toArray();
  const promos = await promoCol.find().toArray();

  if (tables.length === 0 || recipes.length === 0) {
    console.error('❌ Debes ejecutar primero el seed principal (npm run seed) para inicializar mesas y recetas.');
    process.exit(1);
  }

  const table1 = tables[0]._id;
  const table2 = tables[1] ? tables[1]._id : table1;
  const table3 = tables[2] ? tables[2]._id : table1;

  const huevoRecipe = recipes.find((r) => r.name.includes('Huevo')) || recipes[0];
  const jugoRecipe = recipes.find((r) => r.name.includes('Jugo')) || recipes[1] || recipes[0];
  const aguaRecipe = recipes.find((r) => r.name.includes('Agua')) || recipes[2] || recipes[0];

  const promo2x1 = promos.find((p) => p.code === 'MARTES2X1');

  console.log('🌱 Generando ventas controladas para pruebas analíticas en Atlas...');

  // Fecha actual en hora local
  const now = new Date();
  const salesToInsert: any[] = [];
  const ordersToInsert: any[] = [];

  // Función para crear fecha específica en los últimos 7 días con hora fija
  const makeDate = (daysAgo: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 30, 0, 0);
    return d;
  };

  // 1. Venta de Desayuno (Hace 3 días a las 09:30 hrs) - 2 Huevos + 2 Jugos (Local, Efectivo)
  const orderId1 = new mongoose.Types.ObjectId();
  const total1 = huevoRecipe.price * 2 + jugoRecipe.price * 2; // 55*2 + 35*2 = 180
  ordersToInsert.push({
    _id: orderId1,
    table: table1,
    items: [
      { recipe: huevoRecipe._id, quantity: 2, status: 'delivered', notes: 'Bien cocido' },
      { recipe: jugoRecipe._id, quantity: 2, status: 'delivered', notes: 'Sin hielo' },
    ],
    status: 'delivered',
    total: total1,
    createdAt: makeDate(3, 9),
    updatedAt: makeDate(3, 9),
  });
  salesToInsert.push({
    table: table1,
    orders: [orderId1],
    totalAmount: total1,
    discountAmount: 0,
    status: 'paid',
    date: makeDate(3, 9),
    folio: `VTA-${Date.now()}-001`,
    orderType: 'local',
    paymentMethod: 'efectivo',
    createdAt: makeDate(3, 9),
    updatedAt: makeDate(3, 9),
  });

  // 2. Venta de Comida / Hora Pico (Hace 2 días a las 14:30 hrs) - 3 Huevos + 1 Agua (Local, Tarjeta)
  const orderId2 = new mongoose.Types.ObjectId();
  const total2 = huevoRecipe.price * 3 + aguaRecipe.price * 1; // 55*3 + 25 = 190
  ordersToInsert.push({
    _id: orderId2,
    table: table2,
    items: [
      { recipe: huevoRecipe._id, quantity: 3, status: 'delivered' },
      { recipe: aguaRecipe._id, quantity: 1, status: 'delivered' },
    ],
    status: 'delivered',
    total: total2,
    createdAt: makeDate(2, 14),
    updatedAt: makeDate(2, 14),
  });
  salesToInsert.push({
    table: table2,
    orders: [orderId2],
    totalAmount: total2,
    discountAmount: 0,
    status: 'paid',
    date: makeDate(2, 14),
    folio: `VTA-${Date.now()}-002`,
    orderType: 'local',
    paymentMethod: 'tarjeta',
    createdAt: makeDate(2, 14),
    updatedAt: makeDate(2, 14),
  });

  // 3. Venta con Promoción 2x1 (Hace 1 día a las 14:30 hrs) - 2 Jugos (1 gratis por 2x1) + 1 Huevo (Para llevar, Efectivo)
  const orderId3 = new mongoose.Types.ObjectId();
  const totalRaw3 = huevoRecipe.price * 1 + jugoRecipe.price * 2; // 55 + 70 = 125
  const discount3 = jugoRecipe.price; // 35 de descuento por 2x1
  const totalPaid3 = totalRaw3 - discount3; // 90
  ordersToInsert.push({
    _id: orderId3,
    table: table3,
    items: [
      { recipe: huevoRecipe._id, quantity: 1, status: 'delivered' },
      { recipe: jugoRecipe._id, quantity: 2, status: 'delivered' },
    ],
    status: 'delivered',
    total: totalRaw3,
    createdAt: makeDate(1, 14),
    updatedAt: makeDate(1, 14),
  });
  salesToInsert.push({
    table: table3,
    orders: [orderId3],
    totalAmount: totalPaid3,
    discountAmount: discount3,
    promotionApplied: promo2x1
      ? {
          promotionId: promo2x1._id.toString(),
          name: promo2x1.name,
          type: promo2x1.type,
          discountAmount: discount3,
        }
      : undefined,
    status: 'paid',
    date: makeDate(1, 14),
    folio: `VTA-${Date.now()}-003`,
    orderType: 'para llevar',
    paymentMethod: 'efectivo',
    createdAt: makeDate(1, 14),
    updatedAt: makeDate(1, 14),
  });

  // 4. Venta de Hoy a las 10:30 hrs - 1 Huevo + 1 Jugo + 1 Agua (Domicilio, Transferencia)
  const orderId4 = new mongoose.Types.ObjectId();
  const total4 = huevoRecipe.price * 1 + jugoRecipe.price * 1 + aguaRecipe.price * 1; // 55 + 35 + 25 = 115
  ordersToInsert.push({
    _id: orderId4,
    table: table1,
    items: [
      { recipe: huevoRecipe._id, quantity: 1, status: 'delivered' },
      { recipe: jugoRecipe._id, quantity: 1, status: 'delivered' },
      { recipe: aguaRecipe._id, quantity: 1, status: 'delivered' },
    ],
    status: 'delivered',
    total: total4,
    createdAt: makeDate(0, 10),
    updatedAt: makeDate(0, 10),
  });
  salesToInsert.push({
    table: table1,
    orders: [orderId4],
    totalAmount: total4,
    discountAmount: 0,
    status: 'paid',
    date: makeDate(0, 10),
    folio: `VTA-${Date.now()}-004`,
    orderType: 'domicilio',
    paymentMethod: 'transferencia',
    createdAt: makeDate(0, 10),
    updatedAt: makeDate(0, 10),
  });

  // 5. Venta Cancelada (para verificar exclusión de métricas netas)
  salesToInsert.push({
    table: table2,
    orders: [],
    totalAmount: 300,
    discountAmount: 0,
    status: 'cancelled',
    cancelReason: 'Cliente se retiró antes de ser atendido',
    cancelledBy: 'gerente1',
    cancelledAt: makeDate(1, 12),
    date: makeDate(1, 12),
    folio: `VTA-CANC-${Date.now()}`,
    orderType: 'local',
    paymentMethod: 'efectivo',
    createdAt: makeDate(1, 12),
    updatedAt: makeDate(1, 12),
  });

  await ordersCol.insertMany(ordersToInsert);
  await salesCol.insertMany(salesToInsert);

  console.log(`✨ Se insertaron ${ordersToInsert.length} comandas y ${salesToInsert.length} ventas reales en MongoDB Atlas.`);
  console.log('   - 4 Ventas Pagadas ($180 + $190 + $90 + $115 = $575 Netos)');
  console.log('   - 1 Venta Cancelada ($300)');
  console.log('   - 1 Descuento promocional ($35 aplicado con MARTES2X1)');
  console.log('   - Total platillos servidos: 13 unidades');
  console.log('\n📊 Datos disponibles para verificar el módulo de analíticas.');

  await mongoose.disconnect();
  process.exit(0);
}

seedAnalyticsSales().catch((err) => {
  console.error('❌ Error al generar ventas analíticas:', err);
  process.exit(1);
});
