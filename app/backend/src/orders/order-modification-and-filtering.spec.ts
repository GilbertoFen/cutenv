import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model, Types } from 'mongoose';
import { OrdersModule } from './orders.module';
import { RecipesModule } from '../recipes/recipes.module';
import { TablesModule } from '../tables/tables.module';
import { SalesModule } from '../sales/sales.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { AuthModule } from '../auth/auth.module';
import { OrdersService } from './orders.service';
import { Recipe, RecipeDocument } from '../schemasMongo/recipe.schema';
import { Table, TableDocument } from '../schemasMongo/table.schema';
import { Order, OrderDocument } from '../schemasMongo/order.schema';

describe('Validación de Modificación de Órdenes y Filtros por Platillo', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let ordersService: OrdersService;
  let recipeModel: Model<RecipeDocument>;
  let tableModel: Model<TableDocument>;
  let orderModel: Model<OrderDocument>;

  let table: any;
  let sushi: any;
  let sashimi: any;
  let ramen: any;
  let yakimeshi: any;
  let cocaCola: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        OrdersModule,
        RecipesModule,
        TablesModule,
        SalesModule,
        PromotionsModule,
        RestaurantsModule,
        AuthModule,
      ],
    }).compile();

    ordersService = moduleRef.get<OrdersService>(OrdersService);
    recipeModel = moduleRef.get<Model<RecipeDocument>>(getModelToken(Recipe.name));
    tableModel = moduleRef.get<Model<TableDocument>>(getModelToken(Table.name));
    orderModel = moduleRef.get<Model<OrderDocument>>(getModelToken(Order.name));

    table = await tableModel.create({ number: 4, capacity: 4, status: 'ocupada' });

    sushi = await recipeModel.create({
      name: 'Sushi Roll',
      price: 120,
      category: 'Sushi',
      station: 'fria',
      isActive: true,
    });

    sashimi = await recipeModel.create({
      name: 'Sashimi Salmón',
      price: 150,
      category: 'Sashimi',
      station: 'fria',
      isActive: true,
    });

    ramen = await recipeModel.create({
      name: 'Ramen Miso',
      price: 160,
      category: 'Ramen',
      station: 'caliente',
      isActive: true,
    });

    yakimeshi = await recipeModel.create({
      name: 'Yakimeshi Mixto',
      price: 110,
      category: 'Arroces',
      station: 'caliente',
      isActive: true,
    });

    cocaCola = await recipeModel.create({
      name: 'Coca-Cola 355ml',
      price: 35,
      category: 'Bebidas',
      station: 'ninguna',
      isActive: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongod.stop();
  });

  it('Escenario 1: Modificación de una orden - no debe perder la clasificación de cocina al modificar solo notas generales', async () => {
    // Crear orden con Fría, Caliente y Bebida
    const created: any = await ordersService.createOrder({
      table: table._id.toString(),
      items: [
        { recipe: sushi._id.toString(), quantity: 1, notes: '' },
        { recipe: ramen._id.toString(), quantity: 1, notes: '' },
        { recipe: cocaCola._id.toString(), quantity: 2, notes: '' },
      ],
      notes: 'Sin nota',
    });

    const orderId = created._id.toString();
    const initialOrder: any = await ordersService.getOrderById(orderId);

    // Modificar únicamente la nota general de la orden
    await ordersService.updateOrder(orderId, {
      items: initialOrder.recipes.map((r: any) => ({
        itemId: r.itemId,
        recipe: r.id,
        quantity: r.quantity,
        status: r.status,
        notes: r.notes,
        station: r.station,
      })),
      notes: 'Cliente solicita todo servido junto',
    });

    // Recuperar la orden
    const retrieved: any = await ordersService.getOrderById(orderId);

    const sushiItem = retrieved.recipes.find((r: any) => r.name === 'Sushi Roll');
    const ramenItem = retrieved.recipes.find((r: any) => r.name === 'Ramen Miso');
    const cokeItem = retrieved.recipes.find((r: any) => r.name === 'Coca-Cola 355ml');

    expect(retrieved.notes).toBe('Cliente solicita todo servido junto');
    expect(sushiItem?.station).toBe('fria');
    expect(ramenItem?.station).toBe('caliente');
    expect(cokeItem?.station).toBe('ninguna');
  });

  it('Escenario 2: Modificación de un artículo - cambiar cantidad y notas conserva estaciones', async () => {
    const created: any = await ordersService.createOrder({
      table: table._id.toString(),
      items: [
        { recipe: sushi._id.toString(), quantity: 1, notes: '' },
        { recipe: ramen._id.toString(), quantity: 1, notes: '' },
      ],
    });

    const orderId = created._id.toString();
    const initialOrder: any = await ordersService.getOrderById(orderId);

    const existingSushi = initialOrder.recipes.find((r: any) => r.name === 'Sushi Roll');
    const existingRamen = initialOrder.recipes.find((r: any) => r.name === 'Ramen Miso');

    // Modificar cantidad y nota del Ramen
    await ordersService.updateOrder(orderId, {
      items: [
        {
          itemId: existingSushi?.itemId,
          recipe: sushi._id.toString(),
          quantity: 2, // cambió cantidad
          notes: 'Sin wasabi', // cambió nota
          station: existingSushi?.station,
        },
        {
          itemId: existingRamen?.itemId,
          recipe: ramen._id.toString(),
          quantity: 1,
          notes: 'Muy caliente',
          station: existingRamen?.station,
        },
      ],
    });

    const retrieved: any = await ordersService.getOrderById(orderId);
    const updatedSushi = retrieved.recipes.find((r: any) => r.name === 'Sushi Roll');
    const updatedRamen = retrieved.recipes.find((r: any) => r.name === 'Ramen Miso');

    expect(updatedSushi?.quantity).toBe(2);
    expect(updatedSushi?.notes).toBe('Sin wasabi');
    expect(updatedSushi?.station).toBe('fria');

    expect(updatedRamen?.notes).toBe('Muy caliente');
    expect(updatedRamen?.station).toBe('caliente');
  });

  it('Escenario 3: Agregar un nuevo artículo - recibe su clasificación correcta y los anteriores conservan la suya', async () => {
    const created: any = await ordersService.createOrder({
      table: table._id.toString(),
      items: [
        { recipe: sushi._id.toString(), quantity: 1 },
      ],
    });

    const orderId = created._id.toString();
    const initialOrder: any = await ordersService.getOrderById(orderId);
    const existingSushi = initialOrder.recipes[0];

    // Agregar Yakimeshi (caliente) y Coca-Cola (sin cocina)
    await ordersService.updateOrder(orderId, {
      items: [
        {
          itemId: existingSushi.itemId,
          recipe: sushi._id.toString(),
          quantity: 1,
          station: existingSushi.station,
        },
        {
          recipe: yakimeshi._id.toString(),
          quantity: 1,
          notes: 'Con extra salsa de soya',
        },
        {
          recipe: cocaCola._id.toString(),
          quantity: 1,
        },
      ],
    });

    const retrieved: any = await ordersService.getOrderById(orderId);
    const itemSushi = retrieved.recipes.find((r: any) => r.name === 'Sushi Roll');
    const itemYakimeshi = retrieved.recipes.find((r: any) => r.name === 'Yakimeshi Mixto');
    const itemCoke = retrieved.recipes.find((r: any) => r.name === 'Coca-Cola 355ml');

    expect(itemSushi?.station).toBe('fria');
    expect(itemYakimeshi?.station).toBe('caliente');
    expect(itemCoke?.station).toBe('ninguna');
  });

  it('Escenario 4: Filtros de cocina por platillo individual', async () => {
    // Mesa 4 — Orden #105: 2 Sushi (fría), 1 Sashimi (fría), 1 Ramen (caliente), 1 Yakimeshi (caliente), 2 Coca-Cola (ninguna)
    const orderData: any = await ordersService.createOrder({
      table: table._id.toString(),
      items: [
        { recipe: sushi._id.toString(), quantity: 2 },
        { recipe: sashimi._id.toString(), quantity: 1 },
        { recipe: ramen._id.toString(), quantity: 1 },
        { recipe: yakimeshi._id.toString(), quantity: 1 },
        { recipe: cocaCola._id.toString(), quantity: 2 },
      ],
      notes: 'Mesa 4 comanda completa',
    });

    const orderId = orderData._id.toString();
    const loaded: any = await ordersService.getOrderById(orderId);

    // Simular la función de filtrado del frontend
    const filterRecipesByStation = (recipes: any[], stationFilter: 'all' | 'fria' | 'caliente') => {
      return (recipes || []).filter((r: any) => {
        if (stationFilter === 'all') return true;
        const s = (r.station || '').toLowerCase();
        if (stationFilter === 'fria') return s === 'fria';
        if (stationFilter === 'caliente') return s === 'caliente';
        return false;
      });
    };

    // Filtro Todas
    const allItems = filterRecipesByStation(loaded.recipes, 'all');
    expect(allItems.length).toBe(5);

    // Filtro Cocina Fría: solo Sushi y Sashimi
    const coldItems = filterRecipesByStation(loaded.recipes, 'fria');
    expect(coldItems.length).toBe(2);
    expect(coldItems.map((c: any) => c.name).sort()).toEqual(['Sashimi Salmón', 'Sushi Roll'].sort());

    // Filtro Cocina Caliente: solo Ramen y Yakimeshi
    const hotItems = filterRecipesByStation(loaded.recipes, 'caliente');
    expect(hotItems.length).toBe(2);
    expect(hotItems.map((h: any) => h.name).sort()).toEqual(['Ramen Miso', 'Yakimeshi Mixto'].sort());

    // Verificar que bebidas nunca aparecen en fría ni en caliente
    expect(coldItems.some((i: any) => i.name.includes('Coca-Cola'))).toBe(false);
    expect(hotItems.some((i: any) => i.name.includes('Coca-Cola'))).toBe(false);
  });

  it('Escenario 5: Estados - marcar un artículo como listo actualiza solo ese artículo y conserva los de la otra estación', async () => {
    const orderData: any = await ordersService.createOrder({
      table: table._id.toString(),
      items: [
        { recipe: sushi._id.toString(), quantity: 1 },
        { recipe: ramen._id.toString(), quantity: 1 },
      ],
    });

    const orderId = orderData._id.toString();
    const loaded: any = await ordersService.getOrderById(orderId);
    const sushiItem = loaded.recipes.find((r: any) => r.name === 'Sushi Roll');
    const ramenItem = loaded.recipes.find((r: any) => r.name === 'Ramen Miso');

    // Marcar únicamente el sushi como listo
    await ordersService.updateOrderItemStatus(orderId, sushiItem.itemId, 'ready');

    const updated: any = await ordersService.getOrderById(orderId);
    const updatedSushi = updated.recipes.find((r: any) => r.name === 'Sushi Roll');
    const updatedRamen = updated.recipes.find((r: any) => r.name === 'Ramen Miso');

    // El sushi debe estar listo, pero el ramen sigue preparando
    expect(updatedSushi?.status).toBe('ready');
    expect(updatedRamen?.status).toBe('preparing');
    // La orden completa NO debe marcarse como lista automáticamente
    expect(updated?.status).toBe('preparing');
  });
});
