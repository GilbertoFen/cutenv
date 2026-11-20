import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import { SalesModule } from './sales.module';
import { OrdersModule } from '../orders/orders.module';
import { RecipesModule } from '../recipes/recipes.module';
import { TablesModule } from '../tables/tables.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { AuthModule } from '../auth/auth.module';
import { PrinterModule } from '../printer/printer.module';
import { PrinterService } from '../printer/printer.service';
import { SalesService } from './sales.service';
import { OrdersService } from '../orders/orders.service';
import { RecipesService } from '../recipes/recipes.service';
import { Recipe, RecipeDocument } from '../schemasMongo/recipe.schema';
import { Table, TableDocument } from '../schemasMongo/table.schema';
import { Sale, SaleDocument } from '../schemasMongo/sale.schema';
import { Order, OrderDocument } from '../schemasMongo/order.schema';

describe('Corte de Caja y Separación de Cocina (Pruebas Obligatorias)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let salesService: SalesService;
  let ordersService: OrdersService;
  let recipesService: RecipesService;
  let printerService: PrinterService;
  let recipeModel: Model<RecipeDocument>;
  let tableModel: Model<TableDocument>;
  let saleModel: Model<SaleDocument>;
  let orderModel: Model<OrderDocument>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        SalesModule,
        OrdersModule,
        RecipesModule,
        TablesModule,
        PromotionsModule,
        RestaurantsModule,
        AuthModule,
        PrinterModule,
      ],
    }).compile();

    salesService = moduleRef.get<SalesService>(SalesService);
    ordersService = moduleRef.get<OrdersService>(OrdersService);
    recipesService = moduleRef.get<RecipesService>(RecipesService);
    printerService = moduleRef.get<PrinterService>(PrinterService);
    recipeModel = moduleRef.get<Model<RecipeDocument>>(getModelToken(Recipe.name));
    tableModel = moduleRef.get<Model<TableDocument>>(getModelToken(Table.name));
    saleModel = moduleRef.get<Model<SaleDocument>>(getModelToken(Sale.name));
    orderModel = moduleRef.get<Model<OrderDocument>>(getModelToken(Order.name));
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongod.stop();
  });

  describe('1. Clasificación de Recetas por Estación de Cocina', () => {
    it('debe registrar y clasificar recetas en cocina fría, caliente y sin estación (bebidas) correctamente', async () => {
      const coldRecipe = await recipeModel.create({
        name: 'Sushi Sashimi Combinado',
        price: 150,
        category: 'Sushi',
        station: 'fria',
        isActive: true,
      });

      const hotRecipe = await recipeModel.create({
        name: 'Ramen Miso Especial',
        price: 160,
        category: 'Ramen',
        station: 'caliente',
        isActive: true,
      });

      const drinkRecipe = await recipeModel.create({
        name: 'Refresco Coca-Cola 355ml',
        price: 35,
        category: 'Bebidas',
        station: 'ninguna',
        isActive: true,
      });

      expect(coldRecipe.station).toBe('fria');
      expect(hotRecipe.station).toBe('caliente');
      expect(drinkRecipe.station).toBe('ninguna');

      // Actualizar estación de caliente a fría
      await recipesService.updateRecipe((hotRecipe._id as any).toString(), { station: 'fria' });
      const updated = await recipeModel.findById(hotRecipe._id);
      expect(updated?.station).toBe('fria');

      // Regresar a caliente
      await recipesService.updateRecipe((hotRecipe._id as any).toString(), { station: 'caliente' });
    });
  });

  describe('2. Separación de Comandas en Cocina (Fría y Caliente) y Manejo de Bebidas', () => {
    let testTable: TableDocument;
    let sushi: RecipeDocument;
    let sashimi: RecipeDocument;
    let ramen: RecipeDocument;
    let yakimeshi: RecipeDocument;
    let cocaCola: RecipeDocument;

    beforeAll(async () => {
      testTable = await tableModel.create({ number: 10, capacity: 4, status: 'ocupada' });
      sushi = await recipeModel.create({ name: 'Sushi Roll Test', price: 120, station: 'fria', isActive: true });
      sashimi = await recipeModel.create({ name: 'Sashimi Test', price: 150, station: 'fria', isActive: true });
      ramen = await recipeModel.create({ name: 'Ramen Test', price: 140, station: 'caliente', isActive: true });
      yakimeshi = await recipeModel.create({ name: 'Yakimeshi Test', price: 110, station: 'caliente', isActive: true });
      cocaCola = await recipeModel.create({ name: 'Coca-Cola 355ml', price: 35, category: 'Bebidas', station: 'ninguna', isActive: true });
    });

    it('debe generar comanda exclusiva para Cocina Fría cuando solo hay platillos fríos', async () => {
      const order: any = await ordersService.createOrder({
        table: (testTable._id as any).toString(),
        items: [{ recipe: (sushi._id as any).toString(), quantity: 2, notes: 'Sin alga exterior' }],
        notes: 'Comanda fría',
      });

      const recipes = order.kitchenOrder?.recipes || [];
      const coldItems = recipes.filter((r: any) => r.station === 'fria');
      const hotItems = recipes.filter((r: any) => r.station === 'caliente');

      expect(coldItems.length).toBe(1);
      expect(coldItems[0].name).toBe('Sushi Roll Test');
      expect(coldItems[0].quantity).toBe(2);
      expect(hotItems.length).toBe(0); // No ticket caliente vacío
    });

    it('debe generar comanda exclusiva para Cocina Caliente cuando solo hay platillos calientes', async () => {
      const order: any = await ordersService.createOrder({
        table: (testTable._id as any).toString(),
        items: [{ recipe: (ramen._id as any).toString(), quantity: 1, notes: 'Bien caliente' }],
        notes: 'Comanda caliente',
      });

      const recipes = order.kitchenOrder?.recipes || [];
      const hotItems = recipes.filter((r: any) => r.station === 'caliente');
      const coldItems = recipes.filter((r: any) => r.station === 'fria');

      expect(hotItems.length).toBe(1);
      expect(hotItems[0].name).toBe('Ramen Test');
      expect(coldItems.length).toBe(0); // No ticket frío vacío
    });

    it('debe preservar la clasificación individual de cada artículo (Sushi, Sashimi, Ramen, Yakimeshi y Bebida)', async () => {
      const order: any = await ordersService.createOrder({
        table: (testTable._id as any).toString(),
        items: [
          { recipe: (sushi._id as any).toString(), quantity: 1, notes: 'Frio 1' },
          { recipe: (sashimi._id as any).toString(), quantity: 1, notes: 'Frio 2' },
          { recipe: (ramen._id as any).toString(), quantity: 1, notes: 'Caliente 1' },
          { recipe: (yakimeshi._id as any).toString(), quantity: 1, notes: 'Caliente 2' },
          { recipe: (cocaCola._id as any).toString(), quantity: 2, notes: 'Bien fría con hielo' },
        ],
        notes: 'Comanda Mixta Completa',
      });

      // 1. Verificar lo que llega a cocina mediante searchOrders (lo que consume el frontend /cook)
      const kitchenOrders = await ordersService.searchOrders({ status: 'preparing' });
      const currentKitchenOrder = kitchenOrders.find((ko) => ko.id === order._id.toString());
      expect(currentKitchenOrder).toBeDefined();

      const recipes = currentKitchenOrder!.recipes || [];
      expect(recipes.length).toBe(5);

      const sushiItem = recipes.find((r: any) => r.name === 'Sushi Roll Test');
      const sashimiItem = recipes.find((r: any) => r.name === 'Sashimi Test');
      const ramenItem = recipes.find((r: any) => r.name === 'Ramen Test');
      const yakimeshiItem = recipes.find((r: any) => r.name === 'Yakimeshi Test');
      const drinkItem = recipes.find((r: any) => r.name === 'Coca-Cola 355ml');

      // Cada artículo conserva INDIVIDUALMENTE su estación sin sobrescribirse
      expect(sushiItem?.station).toBe('fria');
      expect(sashimiItem?.station).toBe('fria');
      expect(ramenItem?.station).toBe('caliente');
      expect(yakimeshiItem?.station).toBe('caliente');
      expect(drinkItem?.station).toBe('ninguna');

      // 2. Separación de tickets de impresión
      const coldTicketItems = recipes.filter((r: any) => r.station === 'fria');
      const hotTicketItems = recipes.filter((r: any) => r.station === 'caliente');
      const unassignedItems = recipes.filter((r: any) => r.station === 'ninguna');

      expect(coldTicketItems.length).toBe(2); // Sushi y Sashimi
      expect(hotTicketItems.length).toBe(2);  // Ramen y Yakimeshi
      expect(unassignedItems.length).toBe(1); // Coca-Cola NO entra a cocina fría ni caliente

      // 3. Actualizar platillo individual listo sin afectar el de la otra estación
      const coldItemId = sushiItem!.itemId;
      const hotItemId = ramenItem!.itemId;

      await ordersService.updateOrderItemStatus(order._id.toString(), coldItemId!, 'ready');

      const reloadedOrder = await orderModel.findById(order._id);
      const reloadedCold = reloadedOrder?.items.find((i: any) => i._id.toString() === coldItemId);
      const reloadedHot = reloadedOrder?.items.find((i: any) => i._id.toString() === hotItemId);

      expect(reloadedCold?.status).toBe('ready');
      expect(reloadedHot?.status).toBe('preparing');
      expect(reloadedOrder?.status).toBe('preparing'); // La orden aún no está completa
    });
  });

  describe('3. Métricas y Agrupaciones del Corte de Caja', () => {
    let testTable: TableDocument;
    let sushi: RecipeDocument;
    let ramen: RecipeDocument;

    beforeAll(async () => {
      testTable = await tableModel.create({ number: 20, capacity: 4, status: 'ocupada' });
      sushi = await recipeModel.create({ name: 'Sushi Nigiri', price: 100, station: 'fria', isActive: true });
      ramen = await recipeModel.create({ name: 'Ramen Shoyu', price: 150, station: 'caliente', isActive: true });
    });

    it('debe calcular correctamente ventas por método de pago, modalidad y actividad de cocina', async () => {
      const now = new Date();

      // Venta 1: Efectivo, Local ($100)
      await saleModel.create({
        table: testTable._id,
        orders: [],
        totalAmount: 100,
        status: 'paid',
        date: now,
        folio: 'TEST-F1',
        orderType: 'local',
        paymentMethod: 'efectivo',
      });

      // Venta 2: Tarjeta, Para llevar ($150)
      await saleModel.create({
        table: testTable._id,
        orders: [],
        totalAmount: 150,
        status: 'paid',
        date: now,
        folio: 'TEST-F2',
        orderType: 'para llevar',
        paymentMethod: 'tarjeta',
      });

      // Venta 3: Transferencia, Domicilio ($250)
      await saleModel.create({
        table: testTable._id,
        orders: [],
        totalAmount: 250,
        status: 'paid',
        date: now,
        folio: 'TEST-F3',
        orderType: 'domicilio',
        paymentMethod: 'transferencia',
      });

      // Venta 4: Venta con múltiples métodos de pago ($50 efectivo + $50 tarjeta = $100)
      await saleModel.create({
        table: testTable._id,
        orders: [],
        totalAmount: 100,
        status: 'paid',
        date: now,
        folio: 'TEST-F4-SPLIT',
        orderType: 'local',
        paymentMethod: 'efectivo',
        payments: [
          { method: 'efectivo', amount: 50, date: now },
          { method: 'tarjeta', amount: 50, date: now },
        ],
      });

      // Venta 5: Venta cancelada ($300) -> NO debe contabilizarse
      await saleModel.create({
        table: testTable._id,
        orders: [],
        totalAmount: 300,
        status: 'cancelled',
        date: now,
        folio: 'TEST-F5-CANCELLED',
        orderType: 'local',
        paymentMethod: 'efectivo',
      });

      // Venta 6: Venta de ayer ($800) -> NO debe contabilizarse
      const yesterday = new Date(Date.now() - 48 * 3600 * 1000);
      await saleModel.create({
        table: testTable._id,
        orders: [],
        totalAmount: 800,
        status: 'paid',
        date: yesterday,
        createdAt: yesterday,
        folio: 'TEST-F6-YESTERDAY',
        orderType: 'local',
        paymentMethod: 'efectivo',
      });

      // Órdenes de cocina de hoy
      await orderModel.create({
        table: testTable._id,
        items: [{ recipe: sushi._id, quantity: 3, status: 'delivered' }],
        status: 'delivered',
        createdAt: now,
      });

      await orderModel.create({
        table: testTable._id,
        items: [{ recipe: ramen._id, quantity: 2, status: 'delivered', station: 'caliente' }],
        status: 'delivered',
        createdAt: now,
      });

      const drink = await recipeModel.create({
        name: 'Refresco Sprite 355ml',
        price: 35,
        category: 'Bebidas',
        station: 'ninguna',
        isActive: true,
      });

      // Orden que solo contiene bebidas -> NO debe sumar a comandas de cocina fría ni caliente
      await orderModel.create({
        table: testTable._id,
        items: [{ recipe: drink._id, quantity: 4, status: 'delivered', station: 'ninguna' }],
        status: 'delivered',
        createdAt: now,
      });

      // Ejecutar corte de caja
      const cashCut = await salesService.getCashCutData();

      // Total esperado: 100 (efectivo) + 150 (tarjeta) + 250 (transferencia) + 50 (efectivo split) + 50 (tarjeta split) = $600
      expect(cashCut.summary.totalRevenue).toBe(600);

      // Verificación por método de pago
      const efectivo = cashCut.byPaymentMethod.items.find((p) => p.method === 'efectivo');
      const tarjeta = cashCut.byPaymentMethod.items.find((p) => p.method === 'tarjeta');
      const transf = cashCut.byPaymentMethod.items.find((p) => p.method === 'transferencia');

      expect(efectivo?.total).toBe(150); // 100 + 50
      expect(tarjeta?.total).toBe(200);  // 150 + 50
      expect(transf?.total).toBe(250);   // 250

      // Verificación de exclusión de venta cancelada y de días anteriores
      const recentFolios = cashCut.recentSales.map((s) => s.folio);
      expect(recentFolios).not.toContain('TEST-F5-CANCELLED');
      expect(recentFolios).not.toContain('TEST-F6-YESTERDAY');

      // Verificación de actividad de cocina
      expect(cashCut.kitchenActivity.coldComandasCount).toBeGreaterThanOrEqual(1);
      expect(cashCut.kitchenActivity.hotComandasCount).toBeGreaterThanOrEqual(1);
      expect(cashCut.kitchenActivity.coldDishesCount).toBeGreaterThanOrEqual(3);
      expect(cashCut.kitchenActivity.hotDishesCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('4. Generación de Reporte PDF de Corte de Caja', () => {
    it('debe generar un archivo PDF válido con datos consistentes', async () => {
      const pdfBuffer = await salesService.generateCashCutPdf();

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      expect(pdfBuffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });
  });

  describe('5. Separación de Propinas en Reportes y Corte de Caja', () => {
    it('debe separar estrictamente venta neta, propinas y total cobrado en corte de caja y métricas', async () => {
      const now = new Date();
      const testTable = await tableModel.create({ number: 99, capacity: 4, status: 'ocupada' });

      // Limpiar colecciones de ventas y órdenes para este test aislado
      await saleModel.deleteMany({});
      await orderModel.deleteMany({});

      // 1. Venta sin propina (Efectivo: $1,000 venta neta, $0 propina, $1,000 total cobrado)
      await saleModel.create({
        table: testTable._id,
        orders: [],
        totalAmount: 1000,
        tipAmount: 0,
        status: 'paid',
        date: now,
        folio: 'TIP-TEST-001',
        orderType: 'local',
        paymentMethod: 'efectivo',
      });

      // 2. Venta con propina (Tarjeta: $2,000 venta neta, $200 propina, $2,200 total cobrado)
      await saleModel.create({
        table: testTable._id,
        orders: [],
        totalAmount: 2000,
        tipAmount: 200,
        status: 'paid',
        date: now,
        folio: 'TIP-TEST-002',
        orderType: 'local',
        paymentMethod: 'tarjeta',
      });

      // 3. Venta con propina diferente (Transferencia: $1,500 venta neta, $150 propina, $1,650 total cobrado)
      await saleModel.create({
        table: testTable._id,
        orders: [],
        totalAmount: 1500,
        tipAmount: 150,
        status: 'paid',
        date: now,
        folio: 'TIP-TEST-003',
        orderType: 'para llevar',
        paymentMethod: 'transferencia',
      });

      // 4. Venta con propina alta (Tarjeta: $500 venta neta, $150 propina, $650 total cobrado)
      await saleModel.create({
        table: testTable._id,
        orders: [],
        totalAmount: 500,
        tipAmount: 150,
        status: 'paid',
        date: now,
        folio: 'TIP-TEST-004',
        orderType: 'domicilio',
        paymentMethod: 'tarjeta',
      });

      // 5. Venta cancelada con propina registrada (debe ser totalmente ignorada)
      await saleModel.create({
        table: testTable._id,
        orders: [],
        totalAmount: 800,
        tipAmount: 80,
        status: 'cancelled',
        date: now,
        folio: 'TIP-TEST-CANCELLED',
        orderType: 'local',
        paymentMethod: 'efectivo',
      });

      // Ejecutar corte de caja
      const cashCut = await salesService.getCashCutData();

      // Totales esperados:
      // Venta neta = 1000 + 2000 + 1500 + 500 = $5,000
      // Propinas totales = 0 + 200 + 150 + 150 = $500
      // Total cobrado = 5,000 + 500 = $5,500
      expect(cashCut.summary.totalNetSales).toBe(5000);
      expect(cashCut.summary.totalTips).toBe(500);
      expect(cashCut.summary.totalRevenue).toBe(5500);
      expect(cashCut.summary.totalTransactions).toBe(4);

      // Regla fundamental: el ticket promedio debe calcularse sobre la venta neta (5,000 / 4 = $1,250), NUNCA sobre el total cobrado (5,500 / 4 = $1,375)
      expect(cashCut.summary.averageTicket).toBe(1250);

      // Desglose por método de pago:
      // Efectivo: neta $1,000, propinas $0, total cobrado $1,000
      const efectivo = cashCut.byPaymentMethod.items.find((p) => p.method === 'efectivo');
      expect(efectivo?.netSales).toBe(1000);
      expect(efectivo?.tips).toBe(0);
      expect(efectivo?.total).toBe(1000);

      // Tarjeta: neta $2,500 ($2,000 + $500), propinas $350 ($200 + $150), total cobrado $2,850
      const tarjeta = cashCut.byPaymentMethod.items.find((p) => p.method === 'tarjeta');
      expect(tarjeta?.netSales).toBe(2500);
      expect(tarjeta?.tips).toBe(350);
      expect(tarjeta?.total).toBe(2850);

      // Transferencia: neta $1,500, propinas $150, total cobrado $1,650
      const transf = cashCut.byPaymentMethod.items.find((p) => p.method === 'transferencia');
      expect(transf?.netSales).toBe(1500);
      expect(transf?.tips).toBe(150);
      expect(transf?.total).toBe(1650);

      // Totales en byPaymentMethod
      expect(cashCut.byPaymentMethod.totalNetSales).toBe(5000);
      expect(cashCut.byPaymentMethod.totalTips).toBe(500);
      expect(cashCut.byPaymentMethod.totalRevenue).toBe(5500);

      // Validar PDF con datos de propinas
      const pdf = await salesService.generateCashCutPdf();
      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.length).toBeGreaterThan(1000);
    });
  });

  describe('5. Separación y envío de comandas por estación de cocina', () => {
    let testTable: TableDocument;
    let coldDish: RecipeDocument;
    let hotDish: RecipeDocument;
    let drinkDish: RecipeDocument;

    beforeAll(async () => {
      testTable = await tableModel.create({ number: 30, capacity: 4, status: 'ocupada' });
      coldDish = await recipeModel.create({
        name: 'Ceviche Mixto Especial',
        price: 180,
        station: 'fria',
        category: 'Mariscos',
        isActive: true,
      });
      hotDish = await recipeModel.create({
        name: 'Hamburguesa BBQ con Tocino',
        price: 220,
        station: 'caliente',
        category: 'Hamburguesas',
        isActive: true,
      });
      drinkDish = await recipeModel.create({
        name: 'Limonada Mineral 500ml',
        price: 45,
        station: 'ninguna',
        category: 'Bebidas',
        isActive: true,
      });
    });

    it('debe crear una orden calculando correctamente extras con costo y sin costo', async () => {
      const order = await ordersService.createOrder({
        table: (testTable._id as any).toString(),
        notes: 'Mesa de aniversario',
        items: [
          {
            recipe: (hotDish._id as any).toString(),
            quantity: 2,
            notes: 'Término medio',
            modifiers: [
              { name: 'Extra Queso Crema', price: 15, station: 'caliente' },
              { name: 'Sin Cebolla', price: 0, station: 'caliente' },
            ],
          },
          {
            recipe: (drinkDish._id as any).toString(),
            quantity: 1,
            notes: 'Con poco hielo',
            modifiers: [
              { name: 'Con Limón', price: 0, station: 'ninguna' },
            ],
          },
        ],
      });

      // Precio base: 2 * 220 = 440 + 1 * 45 = 485
      // Modificador con costo: 2 * 15 = 30
      // Total esperado: 485 + 30 = 515
      expect(order.total).toBe(515);

      const reloaded = await orderModel.findById(order._id);
      expect(reloaded?.items).toHaveLength(2);

      const hotItem = reloaded?.items[0];
      expect(hotItem?.modifiers).toHaveLength(2);
      expect(hotItem?.modifiers?.[0]?.name).toBe('Extra Queso Crema');
      expect(hotItem?.modifiers?.[0]?.price).toBe(15);
      expect(hotItem?.modifiers?.[1]?.price).toBe(0);
    });

    it('debe formatear los tickets con encabezados claros y modificadores correspondientes', () => {
      // 1. Ticket de cocina fría
      const coldPlain = printerService.formatKitchenPlainText({
        id: 'ORD-1001',
        tableNumber: 5,
        station: 'fria',
        stationName: 'COCINA FRÍA',
        createdAt: new Date().toISOString(),
        recipes: [
          {
            name: 'Ceviche Mixto Especial',
            quantity: 1,
            notes: 'Sin picante',
            modifiers: [
              { name: 'Aguacate Extra', price: 25 },
              { name: 'Tostadas extra', price: 0 },
            ],
          },
        ],
      });
      expect(coldPlain).toContain('*** COMANDA DE COCINA FRÍA ***');
      expect(coldPlain).toContain('CEVICHE MIXTO ESPECIAL');
      expect(coldPlain).toContain('+ AGUACATE EXTRA (+$25.00)');
      expect(coldPlain).toContain('* TOSTADAS EXTRA (Sin costo)');
      expect(coldPlain).toContain('TOTAL PLATILLOS:');
      expect(coldPlain).toContain('--- ENVIADO A COCINA ---');

      // 2. Ticket de cocina caliente
      const hotPlain = printerService.formatKitchenPlainText({
        id: 'ORD-1002',
        tableNumber: 8,
        station: 'caliente',
        stationName: 'COCINA CALIENTE',
        createdAt: new Date().toISOString(),
        recipes: [
          {
            name: 'Hamburguesa BBQ',
            quantity: 2,
            modifiers: [
              { name: 'Queso Extra', price: 15 },
            ],
          },
        ],
      });
      expect(hotPlain).toContain('*** COMANDA DE COCINA CALIENTE ***');
      expect(hotPlain).toContain('HAMBURGUESA BBQ');
      expect(hotPlain).toContain('+ QUESO EXTRA (+$15.00)');

      // 3. Ticket de productos sin cocina (bebidas)
      const drinkPlain = printerService.formatKitchenPlainText({
        id: 'ORD-1003',
        tableNumber: 12,
        station: 'ninguna',
        stationName: 'PRODUCTOS SIN COCINA (BEBIDAS)',
        createdAt: new Date().toISOString(),
        recipes: [
          {
            name: 'Limonada Mineral',
            quantity: 3,
            notes: 'Con hielo frappé',
          },
        ],
      });
      expect(drinkPlain).toContain('*** PRODUCTOS SIN COCINA (BEBIDAS) ***');
      expect(drinkPlain).toContain('LIMONADA MINERAL');
      expect(drinkPlain).toContain('TOTAL PRODUCTOS:');
      expect(drinkPlain).toContain('--- DESPACHO DE BEBIDAS / SALA ---');
    });

    it('debe separar artículos en hasta 3 lotes respetando estaciones y extras cruzados sin tickets vacíos', async () => {
      const prevEnv = process.env.TICKET_A_COCINA;
      process.env.TICKET_A_COCINA = 'TRUE';

      // Mock de fetch para interceptar los envíos a la impresora
      const dispatchedJobs: any[] = [];
      const originalFetch = global.fetch;

      global.fetch = jest.fn(async (url: any, opts: any) => {
        if (typeof url === 'string' && url.includes('/print-kitchen')) {
          const body = JSON.parse(opts.body);
          dispatchedJobs.push(body);
          return {
            ok: true,
            json: async () => ({ success: true, message: 'Printed' }),
          } as any;
        }
        return { ok: false, status: 500 } as any;
      });

      try {
        // Orden con Platillo Caliente (con un extra asignado a Cocina Fría) + Bebida
        const mixedOrder = {
          _id: new mongoose.Types.ObjectId(),
          id: 'ORD-TEST-MIXED',
          table: testTable._id,
          tableNumber: 30,
          status: 'pending',
          total: 350,
          notes: 'Mesa 30',
          createdAt: new Date(),
          items: [
            {
              _id: new mongoose.Types.ObjectId(),
              name: hotDish.name,
              recipe: hotDish,
              station: 'caliente',
              quantity: 1,
              notes: 'Bien cocido',
              modifiers: [
                { name: 'Ensalada Fría de Acompañamiento', price: 30, station: 'fria' },
                { name: 'Cheddar Extra', price: 15, station: 'caliente' },
              ],
              status: 'pending',
            },
            {
              _id: new mongoose.Types.ObjectId(),
              name: drinkDish.name,
              recipe: drinkDish,
              station: 'ninguna',
              quantity: 2,
              notes: 'Para llevar',
              status: 'pending',
            },
          ],
        };

        // Disparamos con delay de 0 para test rápido
        await (ordersService as any).dispatchKitchenPrintJob(mixedOrder, 0);

        // Se deben haber generado exactamente 3 tickets:
        // 1) Fría (por el extra Ensalada Fría enrutado a cocina fría)
        // 2) Caliente (por la Hamburguesa BBQ)
        // 3) Ninguna (por la Limonada)
        expect(dispatchedJobs.length).toBe(3);

        const coldJob = dispatchedJobs.find((j) => j.options.station === 'fria');
        const hotJob = dispatchedJobs.find((j) => j.options.station === 'caliente');
        const drinkJob = dispatchedJobs.find((j) => j.options.station === 'ninguna');

        expect(coldJob).toBeDefined();
        expect(hotJob).toBeDefined();
        expect(drinkJob).toBeDefined();

        // Verificar el extra cruzado en el ticket de cocina fría
        expect(coldJob.order.recipes[0].name).toContain('(EXTRA PARA: Hamburguesa BBQ con Tocino) Ensalada Fría de Acompañamiento');

        // Verificar que no se imprimen tickets para estaciones vacías:
        dispatchedJobs.length = 0;
        const onlyDrinksOrder = {
          _id: new mongoose.Types.ObjectId(),
          id: 'ORD-TEST-DRINKS',
          table: testTable._id,
          tableNumber: 30,
          status: 'pending',
          total: 90,
          createdAt: new Date(),
          items: [
            {
              _id: new mongoose.Types.ObjectId(),
              name: drinkDish.name,
              recipe: drinkDish,
              station: 'ninguna',
              quantity: 2,
              status: 'pending',
            },
          ],
        };

        await (ordersService as any).dispatchKitchenPrintJob(onlyDrinksOrder, 0);

        // Solo debe haber generado 1 ticket (el de bebidas)
        expect(dispatchedJobs.length).toBe(1);
        expect(dispatchedJobs[0].options.station).toBe('ninguna');
      } finally {
        global.fetch = originalFetch;
        process.env.TICKET_A_COCINA = prevEnv;
      }
    });

    it('un fallo en un ticket no debe interrumpir el envío de los tickets siguientes', async () => {
      const prevEnv = process.env.TICKET_A_COCINA;
      process.env.TICKET_A_COCINA = 'TRUE';

      const dispatchedStations: string[] = [];
      const originalFetch = global.fetch;

      global.fetch = jest.fn(async (url: any, opts: any) => {
        if (typeof url === 'string' && url.includes('/print-kitchen')) {
          const body = JSON.parse(opts.body);
          dispatchedStations.push(body.options.station);
          if (body.options.station === 'fria') {
            throw new Error('Impresora ocupada o sin papel en estación fría');
          }
          return {
            ok: true,
            json: async () => ({ success: true, message: 'Printed' }),
          } as any;
        }
        return { ok: false, status: 500 } as any;
      });

      try {
        const orderWithBoth = {
          _id: new mongoose.Types.ObjectId(),
          id: 'ORD-TEST-FAILOVER',
          table: testTable._id,
          tableNumber: 30,
          status: 'pending',
          total: 225,
          createdAt: new Date(),
          items: [
            {
              _id: new mongoose.Types.ObjectId(),
              name: coldDish.name,
              recipe: coldDish,
              station: 'fria',
              quantity: 1,
              status: 'pending',
            },
            {
              _id: new mongoose.Types.ObjectId(),
              name: drinkDish.name,
              recipe: drinkDish,
              station: 'ninguna',
              quantity: 1,
              status: 'pending',
            },
          ],
        };

        // El despacho no debe lanzar excepción no controlada
        await expect(
          (ordersService as any).dispatchKitchenPrintJob(orderWithBoth, 0)
        ).resolves.not.toThrow();

        // Debe haber intentado fría y luego procedido a ninguna (bebidas)
        expect(dispatchedStations).toEqual(['fria', 'ninguna']);
      } finally {
        global.fetch = originalFetch;
        process.env.TICKET_A_COCINA = prevEnv;
      }
    });
  });
});
