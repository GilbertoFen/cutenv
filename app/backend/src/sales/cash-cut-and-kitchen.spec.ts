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
      ],
    }).compile();

    salesService = moduleRef.get<SalesService>(SalesService);
    ordersService = moduleRef.get<OrdersService>(OrdersService);
    recipesService = moduleRef.get<RecipesService>(RecipesService);
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
});
