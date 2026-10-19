import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';
import mongoose from 'mongoose';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../atlas-credentials.env') });

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function runSeed() {
  let uri = process.env.MONGODB_PATH || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ Error: No se encontró MONGODB_PATH ni MONGODB_URI en las variables de entorno.');
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB_NAME || 'restaurant';

  if (
    uri.startsWith('mongodb+srv://') &&
    !uri.includes('.mongodb.net/') &&
    !uri.includes('.mongodb.net/' + dbName)
  ) {
    uri = uri.replace('.mongodb.net', `.mongodb.net/${dbName}?retryWrites=true&w=majority`);
  } else if (uri.startsWith('mongodb+srv://') && uri.endsWith('.mongodb.net')) {
    uri = `${uri}/${dbName}?retryWrites=true&w=majority`;
  }

  const sanitizedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@');
  console.log(`\n======================================================`);
  console.log(`🌱 [Seed Script] Inicialización Idempotente en MongoDB Atlas`);
  console.log(`📡 Conectando a: ${sanitizedUri}`);
  console.log(`📦 Base de Datos: ${dbName}`);
  console.log(`======================================================\n`);

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
  });

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('No se pudo obtener la instancia de la base de datos.');
  }

  console.log('✅ Conexión con MongoDB Atlas establecida con éxito.\n');

  async function safeCreateIndex(collection: any, keys: any, options: any = {}) {
    try {
      await collection.createIndex(keys, options);
    } catch (err: any) {
      if (err.code === 86 || err.codeName === 'IndexKeySpecsConflict' || err.codeName === 'IndexOptionsConflict') {
        console.log(`ℹ️ Índice existente detectado en colección ${collection.collectionName} para llaves:`, keys);
      } else {
        throw err;
      }
    }
  }

  // 1. INICIALIZAR USUARIOS Y ROLES
  console.log('--- 1. Verificación e Inicialización de Usuarios ---');
  const usersCollection = db.collection('users');
  await safeCreateIndex(usersCollection, { username: 1 }, { unique: true });

  const rootPass = process.env.POS_ROOT_PASSWORD || 'root';
  const managerPass = process.env.POS_MANAGER_PASSWORD || 'password123';
  const workerPass = process.env.POS_WORKER_PASSWORD || 'password123';

  const defaultUsers = [
    {
      username: (process.env.POS_ROOT_USERNAME || 'root').toLowerCase().trim(),
      name: 'Administrador Root',
      password: rootPass,
      role: 'owner',
      status: 'active',
      desc: 'Administrador principal (Dueño / Root)',
    },
    {
      username: (process.env.POS_MANAGER_USERNAME || 'gerente1').toLowerCase().trim(),
      name: 'Carlos Gerente',
      password: managerPass,
      role: 'manager',
      status: 'active',
      desc: 'Gerente administrativo con permisos de Monitoreo',
    },
    {
      username: 'dueno1',
      name: 'Don Gilberto Dueño',
      password: 'password123',
      role: 'owner',
      status: 'active',
      desc: 'Propietario del restaurante',
    },
    {
      username: (process.env.POS_WORKER_USERNAME || 'mesero1').toLowerCase().trim(),
      name: 'Carlos Mesero',
      password: workerPass,
      role: 'worker',
      status: 'active',
      desc: 'Trabajador operativo (Tablet: Mesero, Cocina, Caja, Recepción)',
    },
  ];

  for (const u of defaultUsers) {
    const existing = await usersCollection.findOne({ username: u.username });
    if (existing) {
      console.log(`ℹ️ Usuario existente: "${u.username}" (${existing.role}) — Conservado sin modificar contraseña.`);
    } else {
      const hashedPassword = hashPassword(u.password);
      await usersCollection.insertOne({
        username: u.username,
        name: u.name,
        password: hashedPassword,
        role: u.role,
        status: u.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✨ Usuario creado: "${u.username}" (Rol: ${u.role}) — ${u.desc}`);
    }
  }

  // 2. INICIALIZAR MESAS DEL RESTAURANTE
  console.log('\n--- 2. Verificación e Inicialización de Mesas ---');
  const tablesCollection = db.collection('tables');
  await safeCreateIndex(tablesCollection, { number: 1 }, { unique: true });

  const defaultTables = [
    { number: 1, capacity: 4, status: 'disponible' },
    { number: 2, capacity: 4, status: 'disponible' },
    { number: 3, capacity: 6, status: 'disponible' },
    { number: 4, capacity: 2, status: 'disponible' },
  ];

  for (const t of defaultTables) {
    const existing = await tablesCollection.findOne({ number: t.number });
    if (existing) {
      console.log(`ℹ️ Mesa #${t.number} ya existe (Capacidad: ${existing.capacity}, Estado: ${existing.status})`);
    } else {
      await tablesCollection.insertOne({
        number: t.number,
        capacity: t.capacity,
        status: t.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✨ Mesa creada: Mesa #${t.number} (Capacidad: ${t.capacity} personas)`);
    }
  }

  // 3. INICIALIZAR PRODUCTOS E INSUMOS
  console.log('\n--- 3. Verificación e Inicialización de Insumos (Inventario) ---');
  const productsCollection = db.collection('products');
  await safeCreateIndex(productsCollection, { name: 1 }, { unique: true });
  await safeCreateIndex(productsCollection, { barCode: 1 }, { sparse: true });

  const defaultProducts = [
    {
      name: 'Huevo',
      price: 3.5,
      category: 'Ingredientes',
      stock: 120,
      baseUnit: 'pza',
      purchaseUnit: 'caja',
      contentPerUnit: 30,
      contentUnit: 'pza',
      description: 'Huevo blanco fresco para cocina',
      barCode: '750100010001',
    },
    {
      name: 'Jamon de pierna FUD',
      price: 0.18,
      category: 'Embutidos',
      stock: 5000,
      baseUnit: 'g',
      purchaseUnit: 'paquete',
      contentPerUnit: 1000,
      contentUnit: 'g',
      description: 'Jamón de pierna rebanado',
      barCode: '750100010002',
    },
    {
      name: 'Jugo de Naranja Natural',
      price: 0.04,
      category: 'Bebidas',
      stock: 10000,
      baseUnit: 'ml',
      purchaseUnit: 'botella',
      contentPerUnit: 1000,
      contentUnit: 'ml',
      description: 'Jugo de naranja recién exprimido',
      barCode: '750100010003',
    },
    {
      name: 'Agua Ciel 600ml',
      price: 12,
      category: 'Bebidas',
      stock: 48,
      baseUnit: 'pza',
      purchaseUnit: 'paquete',
      contentPerUnit: 24,
      contentUnit: 'pza',
      description: 'Agua purificada embotellada',
      barCode: '750100010004',
    },
    {
      name: 'Leche entera',
      price: 0.03,
      category: 'Lácteos',
      stock: 8000,
      baseUnit: 'ml',
      purchaseUnit: 'caja',
      contentPerUnit: 1000,
      contentUnit: 'ml',
      description: 'Leche entera pasteurizada',
      barCode: '750100010005',
    },
  ];

  const seededProductIds: Record<string, any> = {};

  for (const p of defaultProducts) {
    const existing = await productsCollection.findOne({ name: p.name });
    if (existing) {
      console.log(`ℹ️ Insumo existente: "${p.name}" (Stock: ${existing.stock} ${existing.baseUnit || 'pza'})`);
      seededProductIds[p.name] = existing._id;
    } else {
      const res = await productsCollection.insertOne({
        ...p,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✨ Insumo creado: "${p.name}" (Stock inicial: ${p.stock} ${p.baseUnit})`);
      seededProductIds[p.name] = res.insertedId;
    }
  }

  // 4. INICIALIZAR RECETAS DEL MENÚ
  console.log('\n--- 4. Verificación e Inicialización de Recetas (Menú) ---');
  const recipesCollection = db.collection('recipes');
  await safeCreateIndex(recipesCollection, { name: 1 }, { unique: true });

  const defaultRecipes = [
    {
      name: 'Huevo con Jamon',
      price: 55,
      category: 'Desayunos',
      description: 'Huevos revueltos con jamón de pierna, acompañados de frijoles refritos',
      isActive: true,
      ingredients: [
        { product: seededProductIds['Huevo'], quantity: 2 },
        { product: seededProductIds['Jamon de pierna FUD'], quantity: 60 },
      ],
    },
    {
      name: 'Jugo de Naranja',
      price: 35,
      category: 'Bebidas',
      description: 'Vaso de 350ml de jugo de naranja natural',
      isActive: true,
      ingredients: [
        { product: seededProductIds['Jugo de Naranja Natural'], quantity: 350 },
      ],
    },
    {
      name: 'Agua Embotellada Ciel',
      price: 25,
      category: 'Bebidas',
      description: 'Botella de agua purificada 600ml',
      isActive: true,
      ingredients: [
        { product: seededProductIds['Agua Ciel 600ml'], quantity: 1 },
      ],
    },
  ];

  for (const r of defaultRecipes) {
    const existing = await recipesCollection.findOne({ name: r.name });
    if (existing) {
      console.log(`ℹ️ Receta existente: "${r.name}" ($${existing.price})`);
    } else {
      await recipesCollection.insertOne({
        ...r,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✨ Receta creada: "${r.name}" ($${r.price})`);
    }
  }

  // 5. INICIALIZAR PROMOCIONES
  console.log('\n--- 5. Verificación e Inicialización de Promociones ---');
  const promotionsCollection = db.collection('promotions');
  await safeCreateIndex(promotionsCollection, { code: 1 }, { unique: true, sparse: true });

  const defaultPromo = {
    code: 'MARTES2X1',
    name: 'Martes de 2x1 en Bebidas',
    type: 'two_for_one',
    description: 'Paga una bebida y la segunda es cortesía todos los martes',
    daysOfWeek: [2], // Martes
    applicableCategories: ['Bebidas'],
    isActive: true,
    timesUsed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingPromo = await promotionsCollection.findOne({ code: defaultPromo.code });
  if (existingPromo) {
    console.log(`ℹ️ Promoción existente: "${existingPromo.name}" (${existingPromo.code})`);
  } else {
    await promotionsCollection.insertOne(defaultPromo);
    console.log(`✨ Promoción creada: "${defaultPromo.name}" (${defaultPromo.code})`);
  }

  // 6. INICIALIZAR CONFIGURACIÓN FISCAL Y CLIENTE GENÉRICO
  console.log('\n--- 6. Verificación e Inicialización Fiscal (CFDI) ---');
  const fiscalCustomersCollection = db.collection('fiscalcustomers');
  await safeCreateIndex(fiscalCustomersCollection, { rfc: 1 }, { unique: true });

  const genericCustomer = {
    rfc: 'XAXX010101000',
    legalName: 'PÚBLICO EN GENERAL',
    taxRegime: '616', // Sin obligaciones fiscales
    postalCode: '01000',
    email: 'contacto@restaurante.local',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingCustomer = await fiscalCustomersCollection.findOne({ rfc: genericCustomer.rfc });
  if (existingCustomer) {
    console.log(`ℹ️ Cliente fiscal existente: ${existingCustomer.rfc} (${existingCustomer.legalName})`);
  } else {
    await fiscalCustomersCollection.insertOne(genericCustomer);
    console.log(`✨ Cliente fiscal genérico registrado: ${genericCustomer.rfc} (${genericCustomer.legalName})`);
  }

  const fiscalConfigsCollection = db.collection('fiscalconfigs');
  const existingConfig = await fiscalConfigsCollection.findOne({});
  if (existingConfig) {
    console.log(`ℹ️ Configuración fiscal de emisor existente: ${existingConfig.rfcEmisor || 'Configurado'}`);
  } else {
    await fiscalConfigsCollection.insertOne({
      rfcEmisor: 'XAXX010101000',
      nombreEmisor: 'RESTAURANTE POS DEMO S.A. DE C.V.',
      regimenFiscal: '601',
      lugarExpedicion: '01000',
      serieFactura: 'F',
      folioActual: 1,
      ambiente: 'sandbox',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✨ Configuración fiscal inicial de emisor registrada.`);
  }

  // RESUMEN FINAL
  console.log('\n======================================================');
  console.log('🎉 [Seed Script] Proceso completado exitosamente.');
  console.log('📊 Colecciones activas en MongoDB Atlas:');
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`   - ${c.name}: ${count} documentos`);
  }
  console.log('======================================================\n');

  await mongoose.disconnect();
  console.log('🔌 Conexión cerrada limpiamente.');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('\n❌ Error durante la ejecución del seed:', err);
  process.exit(1);
});
