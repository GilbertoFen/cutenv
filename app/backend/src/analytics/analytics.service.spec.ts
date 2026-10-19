import { Test } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import { AnalyticsService } from './analytics.service';
import { Sale, SaleSchema } from '../schemasMongo/sale.schema';
import { Order, OrderSchema } from '../schemasMongo/order.schema';
import { Recipe, RecipeSchema } from '../schemasMongo/recipe.schema';
import { Product, ProductSchema } from '../schemasMongo/product.schema';
import { Promotion, PromotionSchema } from '../schemasMongo/promotion.schema';

describe('AnalyticsService', () => {
  let mongod: MongoMemoryServer;
  let service: AnalyticsService;
  let saleModel: Model<any>;
  let orderModel: Model<any>;
  let recipeModel: Model<any>;
  let productModel: Model<any>;
  let promotionModel: Model<any>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: Sale.name, schema: SaleSchema },
          { name: Order.name, schema: OrderSchema },
          { name: Recipe.name, schema: RecipeSchema },
          { name: Product.name, schema: ProductSchema },
          { name: Promotion.name, schema: PromotionSchema },
        ]),
      ],
      providers: [AnalyticsService],
    }).compile();

    service = moduleRef.get<AnalyticsService>(AnalyticsService);
    saleModel = moduleRef.get(getModelToken(Sale.name));
    orderModel = moduleRef.get(getModelToken(Order.name));
    recipeModel = moduleRef.get(getModelToken(Recipe.name));
    productModel = moduleRef.get(getModelToken(Product.name));
    promotionModel = moduleRef.get(getModelToken(Promotion.name));
  });

  afterEach(async () => {
    const collections = (await mongoose.connection.db?.collections()) ?? [];
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongod.stop();
  });

  describe('Cálculo de rangos de fechas (getDateRange)', () => {
    it('debe calcular correctamente el rango para "today"', () => {
      const range = service.getDateRange({ period: 'today' });
      expect(range.periodLabel).toBe('Hoy');
      expect(range.daysCount).toBe(1);
      expect(range.start.getTime()).toBeLessThan(range.end.getTime());
      expect(range.prevStart.getTime()).toBeLessThan(range.prevEnd.getTime());
      // Duraciones exactamente iguales
      const currentDuration = range.end.getTime() - range.start.getTime() + 1;
      const prevDuration = range.prevEnd.getTime() - range.prevStart.getTime() + 1;
      expect(currentDuration).toBe(prevDuration);
    });

    it('debe calcular correctamente los últimos 7 días con periodo previo equivalente', () => {
      const range = service.getDateRange({ period: 'last_7_days' });
      expect(range.periodLabel).toBe('Últimos 7 días');
      expect(range.daysCount).toBe(7);
      const currentDuration = range.end.getTime() - range.start.getTime() + 1;
      const prevDuration = range.prevEnd.getTime() - range.prevStart.getTime() + 1;
      expect(currentDuration).toBe(prevDuration);
    });

    it('debe validar rangos custom y rechazar si startDate > endDate', () => {
      expect(() =>
        service.getDateRange({
          period: 'custom',
          startDate: '2026-10-25',
          endDate: '2026-10-20',
        }),
      ).toThrow();
    });
  });

  describe('Cálculos de KPIs y agregaciones reales', () => {
    it('debe calcular ventas netas, descuentos, ticket promedio y excluir canceladas', async () => {
      const range = service.getDateRange({ period: 'today' });
      const saleDate = new Date(range.start.getTime() + 3600000); // 1 hora después del inicio

      // 1. Crear producto e ingrediente
      const prod = await productModel.create({
        name: 'Huevo Test',
        brand: 'Generico',
        price: 3,
        quantity: 1,
        stock: 50,
        category: 'Ingredientes',
        description: 'Test',
      });

      // 2. Crear receta
      const recipe = await recipeModel.create({
        name: 'Huevos al Gusto',
        steps: 'Cocinar',
        price: 60,
        category: 'Desayunos',
        ingredients: [{ ingredientId: prod._id, quantity: 2, unitMesure: 'pza' }],
        isActive: true,
      });

      // 3. Crear comanda
      const order1 = await orderModel.create({
        table: new mongoose.Types.ObjectId(),
        items: [{ recipe: recipe._id, quantity: 2, status: 'delivered' }],
        status: 'delivered',
        total: 120,
      });

      // 4. Crear venta pagada con descuento
      await saleModel.create({
        table: new mongoose.Types.ObjectId(),
        orders: [order1._id],
        totalAmount: 110, // 120 - 10 de descuento
        discountAmount: 10,
        status: 'paid',
        date: saleDate,
        folio: 'TICK-001',
        orderType: 'local',
        paymentMethod: 'efectivo',
      });

      // 5. Crear comanda para venta 2
      const order2 = await orderModel.create({
        table: new mongoose.Types.ObjectId(),
        items: [{ recipe: recipe._id, quantity: 1, status: 'delivered' }],
        status: 'delivered',
        total: 60,
      });

      // Venta pagada sin descuento
      await saleModel.create({
        table: new mongoose.Types.ObjectId(),
        orders: [order2._id],
        totalAmount: 60,
        discountAmount: 0,
        status: 'paid',
        date: saleDate,
        folio: 'TICK-002',
        orderType: 'para llevar',
        paymentMethod: 'tarjeta',
      });

      // Venta cancelada (debe ser excluida de ventas netas)
      await saleModel.create({
        table: new mongoose.Types.ObjectId(),
        orders: [],
        totalAmount: 200,
        discountAmount: 0,
        status: 'cancelled',
        date: saleDate,
        folio: 'TICK-CANCEL-001',
      });

      const overview = await service.getOverviewKpis({ period: 'today' });

      // Verificaciones matemáticas exactas:
      // Ventas netas = 110 + 60 = 170
      expect(overview.current.netSales).toBe(170);
      // Descuentos totales = 10 + 0 = 10
      expect(overview.current.totalDiscounts).toBe(10);
      // Ventas brutas = 170 + 10 = 180
      expect(overview.current.grossSales).toBe(180);
      // Cantidad de tickets válidos = 2 (excluyendo la cancelada)
      expect(overview.current.salesCount).toBe(2);
      // Ticket promedio = 170 / 2 = 85
      expect(overview.current.averageTicket).toBe(85);
      // Unidades vendidas = 2 (de la orden 1) + 1 (de la orden 2) = 3
      expect(overview.current.unitsSold).toBe(3);
      // Ventas canceladas registradas por separado
      expect(overview.current.cancelledSalesCount).toBe(1);
      expect(overview.current.cancelledSalesAmount).toBe(200);

      // Verificación de ranking de productos
      const topProducts = await service.getTopProducts({ period: 'today' });
      expect(topProducts.topProducts.length).toBe(1);
      expect(topProducts.topProducts[0].name).toBe('Huevos al Gusto');
      expect(topProducts.topProducts[0].unitsSold).toBe(3);
      expect(topProducts.topProducts[0].revenue).toBe(180); // 3 unidades x $60

      // Verificación de consumo teórico de insumos
      const inventory = await service.getInventoryConsumption({ period: 'today' });
      expect(inventory.ingredientsConsumption.length).toBe(1);
      // Consumo teórico = 3 unidades vendidas x 2 piezas por receta = 6 piezas
      expect(inventory.ingredientsConsumption[0].theoreticalConsumption).toBe(6);
      expect(inventory.ingredientsConsumption[0].productName).toBe('Huevo Test');

      // Verificación de distribución operativa
      const dist = await service.getOperationalDistributions({ period: 'today' });
      const local = dist.byOrderType.find((t) => t.type === 'local');
      const paraLlevar = dist.byOrderType.find((t) => t.type === 'para llevar');
      expect(local?.revenue).toBe(110);
      expect(paraLlevar?.revenue).toBe(60);
    });
  });
});
