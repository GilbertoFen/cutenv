import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from '../schemasMongo/order.schema';
import { Model } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { Sale, SaleDocument } from '../schemasMongo/sale.schema';
import { Recipe, RecipeDocument } from '../schemasMongo/recipe.schema';
import { Product } from '../schemasMongo/product.schema';
import { StockMovement, StockMovementDocument } from '../schemasMongo/stock-movement.schema';
import { Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { KitchenGateway } from 'src/gateways/kitchen.gateway';
import { WaiterGateway } from 'src/gateways/waiter.gateway';
import { TablesService } from 'src/tables/tables.service';
import { convertUnit } from 'src/common/utils/unit-converter.util';
import { normalizeIdStrict } from 'src/common/utils/normalizeId';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Recipe.name) private recipeModel: Model<RecipeDocument>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(StockMovement.name) private stockMovementModel: Model<StockMovementDocument>,
    private readonly kitchenGateway: KitchenGateway,
    private readonly waiterGateway: WaiterGateway,
    @Inject(forwardRef(() => TablesService)) private readonly tablesService: TablesService,
  ) { }

  private resolveItemStation(item: any): 'fria' | 'caliente' | 'ninguna' {
    const rawStation = (item as any)?.station;
    if (rawStation === 'fria' || rawStation === 'caliente') {
      return rawStation;
    }
    const recipe = item?.recipe;
    const isDrink =
      recipe?.category?.toLowerCase?.() === 'bebidas' ||
      (typeof recipe === 'object' && recipe?.category?.toLowerCase?.() === 'bebidas');
    if (isDrink) {
      return 'ninguna';
    }
    const recipeStation = typeof recipe === 'object' ? recipe?.station : undefined;
    if (recipeStation === 'fria' || recipeStation === 'caliente') {
      return recipeStation;
    }
    return 'ninguna';
  }

  private toKitchenOrderLoad(order: any): any {
    return {
      id: order._id.toString(),
      tableNumber: order.table?.number ?? order.table?.['number'] ?? 0,
      tableId: order.table?._id?.toString?.() ?? order.table?.toString?.() ?? '',
      status: order.status,
      total: order.total,
      notes: order.notes,
      recipes: (order.items ?? [])
        .filter((item: any) => item.recipe)
        .map((item: any) => ({
          itemId: item._id?.toString?.() ?? '',
          id: item.recipe?._id?.toString?.() ?? item.recipe?.toString?.(),
          name: item.recipe?.name ?? '',
          description: item.recipe?.description ?? item.recipe?.steps ?? '',
          imageUrl: item.recipe?.imageUrl ?? '',
          quantity: item.quantity ?? 0,
          status: item.status ?? order.status ?? 'preparing',
          notes: item.notes ?? '',
          price: item.recipe?.price ?? 0,
          callWaiter: item.callWaiter ?? null,
          station: this.resolveItemStation(item),
          category: item.recipe?.category ?? '',
        })),
    };
  }

  private computeDeduction(qty: number, fromUnit?: string, toUnit?: string): number {
    return convertUnit(qty, fromUnit, toUnit);
  }

  async getAllOrders(): Promise<OrderResponseDto[]> {
    try {
      const orders = await this.orderModel
        .find()
        .populate('table')
        .populate('items.recipe');

      return orders.map((order) => ({
        id: order._id.toString(),
        tableNumber: (order.table as any)?.number ?? 0,
        tableId: (order.table as any)?._id?.toString?.() ?? order.table?.toString?.() ?? '',
        status: order.status,
        recipes: (order.items ?? [])
          .filter((item: any) => item.recipe)
          .map((item: any) => ({
            itemId: item._id?.toString?.() ?? '',
            id: item.recipe?._id?.toString?.() ?? item.recipe?.toString?.(),
            name: typeof item.recipe === 'object' ? item.recipe['name'] : '',
            description: typeof item.recipe === 'object' ? item.recipe['description'] || item.recipe['steps'] || '' : '',
            quantity: item.quantity,
            imageUrl: typeof item.recipe === 'object' ? item.recipe['imageUrl'] || '' : '',
            status: item.status ?? order.status ?? 'preparing',
            notes: item.notes ?? '',
            price: typeof item.recipe === 'object' ? item.recipe['price'] || 0 : 0,
            callWaiter: item.callWaiter ?? null,
            station: this.resolveItemStation(item),
          })),
        notes: order.notes,
        total: order.total,
      }));
    } catch (e) {
      throw e;
    }
  }

  async getOrdersByTableId(tableId: string): Promise<OrderResponseDto[]> {
    return this.getActiveOrdersByTable(tableId);
  }

  async getActiveOrdersByTable(tableId: string): Promise<OrderResponseDto[]> {
    const tableFilter = Types.ObjectId.isValid(tableId)
      ? { $in: [new Types.ObjectId(tableId), String(tableId)] }
      : tableId;

    const activeSale = await this.saleModel.findOne({
      table: tableFilter,
      status: 'unpaid',
    });

    if (!activeSale || !Array.isArray(activeSale.orders) || activeSale.orders.length === 0) {
      return [];
    }

    const orders = await this.orderModel
      .find({
        _id: { $in: activeSale.orders },
        status: { $ne: 'cancelled' },
      })
      .populate('items.recipe')
      .populate('table');

    return orders.map((order) => ({
      id: order._id.toString(),
      status: order.status,
      total: order.total,
      tableNumber: (order.table as any)?.number || 0,
      notes: order.notes,
      recipes: (order.items ?? [])
        .filter((item: any) => item.recipe)
        .map((item: any) => ({
          itemId: item._id?.toString?.() ?? '',
          id: item.recipe?._id?.toString?.() ?? item.recipe?.toString?.(),
          name: typeof item.recipe === 'object' ? item.recipe['name'] : '',
          description: typeof item.recipe === 'object' ? item.recipe['description'] || item.recipe['steps'] || '' : '',
          imageUrl: typeof item.recipe === 'object' ? item.recipe['imageUrl'] || '' : '',
          quantity: item.quantity,
          status: item.status ?? order.status ?? 'preparing',
          notes: item.notes ?? '',
          price: typeof item.recipe === 'object' ? item.recipe['price'] || 0 : 0,
          callWaiter: item.callWaiter ?? null,
          station: this.resolveItemStation(item),
        })),
    }));
  }

  async getOrderById(id: string): Promise<OrderResponseDto> {
    try {
      const order = await this.orderModel
        .findById(id)
        .populate('table')
        .populate('items.recipe');

      if (!order) throw new NotFoundException('Order not found');

      return {
        id: order._id.toString(),
        tableNumber: (order.table as any)?.number ?? 0,
        status: order.status,
        recipes: (order.items ?? [])
          .filter((item: any) => item.recipe)
          .map((item: any) => ({
            itemId: item._id?.toString?.() ?? '',
            id: item.recipe?._id?.toString?.() ?? item.recipe?.toString?.(),
            name: typeof item.recipe === 'object' ? item.recipe['name'] : '',
            description: typeof item.recipe === 'object' ? item.recipe['description'] || item.recipe['steps'] || '' : '',
            quantity: item.quantity,
            imageUrl: typeof item.recipe === 'object' ? item.recipe['imageUrl'] || '' : '',
            status: item.status ?? order.status ?? 'preparing',
            notes: item.notes ?? '',
            price: typeof item.recipe === 'object' ? item.recipe['price'] || 0 : 0,
            station: this.resolveItemStation(item),
          })),
        total: order.total,
        notes: order.notes,
      };
    } catch (e) {
      throw e;
    }
  }

  async createOrder(dto: CreateOrderDto) {
    try {
      const recipeIds = dto.items.map((item) => item.recipe);
      const recipes = await this.recipeModel.find({ _id: { $in: recipeIds } });

      const total = dto.items.reduce((sum, item) => {
        const recipe = recipes.find((r) => r._id!.toString() === item.recipe);
        return sum + (recipe?.price ?? 0) * item.quantity;
      }, 0);

      const itemsWithStatus = dto.items.map((it) => {
        const recipe = recipes.find((r) => r._id!.toString() === it.recipe);
        const isDrink = recipe?.category?.toLowerCase() === 'bebidas';
        const itemStation = (recipe?.station && recipe.station !== 'ninguna')
          ? recipe.station
          : (isDrink ? 'ninguna' : (recipe?.station || 'ninguna'));

        return {
          recipe: new Types.ObjectId(it.recipe),
          quantity: it.quantity,
          status: (it.status || 'preparing') as any,
          station: itemStation as any,
          notes: it.notes || '',
        };
      });

      const createdOrder = new this.orderModel({
        table: Types.ObjectId.isValid(dto.table) ? new Types.ObjectId(dto.table) : dto.table,
        items: itemsWithStatus,
        total,
        notes: dto.notes || '',
        status: 'preparing',
      });

      const savedOrder = await createdOrder.save();
      const populated = await this.orderModel
        .findById(savedOrder._id)
        .populate('items.recipe', 'name description steps imageUrl price station category')
        .populate('table', '_id number');

      // Deducción automática de insumos del inventario para las recetas pedidas
      for (const item of dto.items) {
        const recipe = recipes.find((r) => r._id!.toString() === item.recipe);
        if (recipe && Array.isArray(recipe.ingredients)) {
          for (const ing of recipe.ingredients) {
            try {
              if (ing.ingredientId && Number.isFinite(ing.quantity) && ing.quantity > 0) {
                const product = await this.productModel.findById(ing.ingredientId);
                if (product) {
                  const targetUnit = product.baseUnit || product.unitMesure || 'pieza';
                  const qtyToDeduct = this.computeDeduction(
                    ing.quantity * (item.quantity || 1),
                    ing.unitMesure,
                    targetUnit
                  );

                  const prevStock = product.stock ?? 0;
                  const newStock = Math.max(0, +(prevStock - qtyToDeduct).toFixed(4));
                  product.stock = newStock;
                  await product.save();

                  await this.stockMovementModel.create({
                    product: product._id,
                    type: 'sale_deduction',
                    quantity: -qtyToDeduct,
                    previousStock: prevStock,
                    newStock,
                    reason: `Consumo automático por receta "${recipe.name}" (x${item.quantity})`,
                    reference: savedOrder._id.toString(),
                    user: 'cocina_pos',
                  });
                }
              }
            } catch (deductErr) {
              console.warn('[OrdersService] Error descontando ingrediente:', deductErr);
            }
          }
        }
      }

      const load = this.toKitchenOrderLoad(populated);
      this.kitchenGateway.emitToAll('order.created', load);
      this.waiterGateway.emitToAll('order.created', load);

      // Despacho de impresión automática de comanda si TICKET_A_COCINA=TRUE (no bloqueante)
      this.dispatchKitchenPrintJob(load).catch(() => { });

      const tableFilter = Types.ObjectId.isValid(dto.table)
        ? { $in: [new Types.ObjectId(dto.table), String(dto.table)] }
        : dto.table;

      let activeSale = await this.saleModel.findOne({
        table: tableFilter,
        status: 'unpaid',
      });

      if (!activeSale) {
        const folio = randomBytes(4).toString('hex').toUpperCase();
        activeSale = await this.saleModel.create({
          table: Types.ObjectId.isValid(dto.table) ? new Types.ObjectId(dto.table) : dto.table,
          orders: [savedOrder._id as any],
          totalAmount: savedOrder.total || 0,
          status: 'unpaid',
          folio,
        });
        const targetTableId = normalizeIdStrict(dto.table);
        if (targetTableId) {
          await this.tablesService.updateTableStatus(targetTableId, { status: 'ocupada' }).catch(() => { });
        }
      } else {
        activeSale.orders.push(savedOrder._id as any);
        await activeSale.save();
        const totals = await this.orderModel.aggregate([
          { $match: { _id: { $in: activeSale.orders as any[] }, status: { $ne: 'cancelled' } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]);
        activeSale.totalAmount = totals[0]?.total ?? 0;
        await activeSale.save();
      }

      return Object.assign(savedOrder.toObject ? savedOrder.toObject() : savedOrder, {
        tableNumber: load.tableNumber,
        kitchenOrder: load,
      });
    } catch (e) {
      throw e;
    }
  }

  private async dispatchKitchenPrintJob(orderLoad: any) {
    const isKitchenPrintEnabled = (process.env.TICKET_A_COCINA || '').trim().toUpperCase() === 'TRUE';
    if (!isKitchenPrintEnabled) return;

    const agentUrl = (process.env.PRINTER_AGENT_URL || 'http://127.0.0.1:5001').replace(/\/+$/, '');
    const url = `${agentUrl}/print-kitchen`;

    const allItems = Array.isArray(orderLoad.recipes) ? orderLoad.recipes : (orderLoad.items || []);
    const coldItems = allItems.filter((it: any) => it.station === 'fria' && it.status !== 'cancelled');
    const hotItems = allItems.filter((it: any) => it.station === 'caliente' && it.status !== 'cancelled');

    const sendTicket = async (items: any[], station: 'fria' | 'caliente', stationName: string) => {
      if (!items || items.length === 0) return;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const ticketOrder = {
          ...orderLoad,
          station,
          stationName,
          recipes: items,
          items,
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-POS-Print-Token': 'pos-local-usb-agent',
          },
          body: JSON.stringify({
            type: 'kitchen',
            order: ticketOrder,
            options: {
              paperWidth: '58mm',
              cutPaper: true,
              station,
              stationName,
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          console.log(`[OrdersService] Comanda enviada a impresora (${stationName}) para orden ${orderLoad.id}`);
        }
      } catch (err: any) {
        console.warn(`[OrdersService] Impresión comanda (${stationName}) omitida:`, err?.message);
      }
    };

    // Separación estricta de tickets: se generan independientemente y nunca se imprimen tickets vacíos
    if (coldItems.length > 0) {
      await sendTicket(coldItems, 'fria', 'COCINA FRÍA');
    }
    if (hotItems.length > 0) {
      await sendTicket(hotItems, 'caliente', 'COCINA CALIENTE');
    }
  }

  async checkRecipeAvailability(items: Array<{ recipe: string; quantity: number }>) {
    const warnings: Array<{
      recipeId: string;
      recipeName: string;
      ingredientName: string;
      required: number;
      available: number;
      unit: string;
    }> = [];

    if (!Array.isArray(items) || items.length === 0) {
      return { available: true, warnings: [] };
    }

    const recipeIds = items.map((i) => i.recipe).filter(Boolean);
    const recipes = await this.recipeModel.find({ _id: { $in: recipeIds } });

    const requiredByIngredient = new Map<string, { required: number; unit: string; recipeName: string; recipeId: string }>();

    for (const item of items) {
      const recipe = recipes.find((r) => r._id!.toString() === item.recipe);
      if (!recipe || !Array.isArray(recipe.ingredients)) continue;

      for (const ing of recipe.ingredients) {
        if (!ing.ingredientId || !ing.quantity || ing.quantity <= 0) continue;
        const ingId = ing.ingredientId.toString();
        const needed = ing.quantity * (item.quantity || 1);
        const existing = requiredByIngredient.get(ingId);
        if (existing) {
          existing.required += needed;
        } else {
          requiredByIngredient.set(ingId, {
            required: needed,
            unit: ing.unitMesure,
            recipeName: recipe.name,
            recipeId: recipe._id!.toString(),
          });
        }
      }
    }

    const productIds = Array.from(requiredByIngredient.keys());
    const products = await this.productModel.find({ _id: { $in: productIds } });

    for (const [prodId, reqInfo] of requiredByIngredient.entries()) {
      const product = products.find((p) => (p as any)._id!.toString() === prodId);
      if (!product) continue;

      const baseUnit = product.baseUnit || product.unitMesure || 'pieza';
      const requiredInBase = convertUnit(reqInfo.required, reqInfo.unit, baseUnit);
      const currentStock = product.stock ?? 0;

      if (currentStock < requiredInBase) {
        warnings.push({
          recipeId: reqInfo.recipeId,
          recipeName: reqInfo.recipeName,
          ingredientName: product.name,
          required: requiredInBase,
          available: currentStock,
          unit: baseUnit,
        });
      }
    }

    return {
      available: warnings.length === 0,
      warnings,
    };
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    try {
      if (dto.status === 'cancelled') {
        return await this.cancelOrder(id);
      }

      const order = await this.orderModel.findById(id);
      if (!order) throw new NotFoundException('Orden no encontrada');

      order.status = dto.status;
      if (dto.status === 'delivered' && Array.isArray(order.items)) {
        order.items.forEach((it: any) => {
          if (it.status !== 'cancelled') {
            it.status = 'delivered';
          }
        });
      } else if (dto.status === 'ready' && Array.isArray(order.items)) {
        order.items.forEach((it: any) => {
          if (it.status !== 'cancelled' && it.status !== 'delivered') {
            it.status = 'ready';
            if (it.callWaiter && it.callWaiter.reason === 'ready' && !it.callWaiter.isExplicitCall) {
              it.callWaiter.requested = false;
              it.callWaiter.resolved = true;
            }
          }
        });
      }
      const updated = await order.save();

      // Sincronizar saldo de la venta activa
      const activeSale = await this.saleModel.findOne({ table: order.table, status: 'unpaid' });
      if (activeSale) {
        const totals = await this.orderModel.aggregate([
          { $match: { _id: { $in: activeSale.orders as any[] }, status: { $ne: 'cancelled' } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]);
        activeSale.totalAmount = totals[0]?.total ?? 0;
        await activeSale.save();
      }

      const populated = await this.orderModel
        .findById(updated._id)
        .populate('items.recipe', 'name description steps imageUrl price station category')
        .populate('table', '_id number');

      const load = this.toKitchenOrderLoad(populated);

      // Cocina cambio de estado
      this.kitchenGateway.emitToAll('order.status.changed', { id: load.id, status: updated.status });
      // Mesero cambio de estado
      this.waiterGateway.emitToAll('order.status.changed', { id: load.id, status: updated.status, tableNumber: load.tableNumber });

      this.kitchenGateway.emitToAll('order.updated', load);
      this.waiterGateway.emitToAll('order.updated', load);

      return updated;
    } catch (e) {
      throw e;
    }
  }

  async cancelOrder(id: string, user: string = 'mesero_pos') {
    try {
      const order = await this.orderModel.findById(id);
      if (!order) throw new NotFoundException('Orden no encontrada');

      if (order.status === 'cancelled') {
        return order;
      }

      const prevStatus = order.status;
      order.status = 'cancelled';
      order.total = 0;
      if (Array.isArray(order.items)) {
        order.items.forEach((it: any) => {
          it.status = 'cancelled';
        });
      }

      // Regla especial de reincorporación de inventario:
      // Únicamente bebidas cerradas en presentación individual.
      // Platillos preparados y recetas elaboradas permanecen descontados.
      if (!order.inventoryRestored && prevStatus !== 'delivered') {
        await this.restoreStockForItems(
          order.items || [],
          order._id.toString(),
          'Reincorporación por orden cancelada',
          user,
          true, // filterReturnableOnly: true
        );
        order.inventoryRestored = true;
      }

      const updated = await order.save();

      // Recalcular saldo de la venta activa
      const activeSale = await this.saleModel.findOne({
        $or: [{ orders: updated._id }, { table: updated.table, status: { $in: ['unpaid', 'partial'] } }],
      });

      if (activeSale && Array.isArray(activeSale.orders)) {
        const nonCancelledOrders = await this.orderModel.find({
          _id: { $in: activeSale.orders as any[] },
          status: { $ne: 'cancelled' },
        });
        const newTotal = nonCancelledOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        activeSale.totalAmount = newTotal;
        await activeSale.save();
      }

      const populated = await this.orderModel
        .findById(updated._id)
        .populate('items.recipe', 'name description steps imageUrl price station category')
        .populate('table', '_id number');

      const load = this.toKitchenOrderLoad(populated);

      this.kitchenGateway.emitToAll('order.status.changed', { id: load.id, status: 'cancelled' });
      this.waiterGateway.emitToAll('order.status.changed', { id: load.id, status: 'cancelled', tableNumber: load.tableNumber });
      this.kitchenGateway.emitToAll('order.updated', load);
      this.waiterGateway.emitToAll('order.updated', load);

      return updated;
    } catch (e) {
      throw e;
    }
  }

  async updateOrder(id: string, dto: UpdateOrderDto) {
    try {
      const order = await this.orderModel.findById(id);
      if (!order) throw new NotFoundException('Orden no encontrada');

      if (['delivered', 'cancelled'].includes(order.status)) {
        throw new NotFoundException(
          'No se puede actualizar una orden ya entregada o cancelada',
        );
      }

      // Si se vaciaron los platillos (items: []), eliminar la orden por completo
      if (dto.items && Array.isArray(dto.items) && dto.items.length === 0) {
        return await this.deleteOrder(id);
      }

      if (dto.items && Array.isArray(dto.items)) {
        const recipeIds = dto.items.map((item) => item.recipe);
        const recipes = await this.recipeModel.find({
          _id: { $in: recipeIds },
        });

        const total = dto.items.reduce((sum, item) => {
          const recipe = recipes.find((r) => r._id!.toString() === item.recipe);
          return sum + (recipe?.price ?? 0) * item.quantity;
        }, 0);

        const existingItems = Array.isArray(order.items) ? [...order.items] : [];
        const matchedExistingIds = new Set<string>();

        const newItems = dto.items.map((dtoItem) => {
          const recipe = recipes.find((r) => r._id!.toString() === dtoItem.recipe);
          const isDrink =
            recipe?.category?.toLowerCase?.() === 'bebidas' ||
            (typeof recipe === 'object' && recipe?.category?.toLowerCase?.() === 'bebidas');
          const defaultRecipeStation: 'fria' | 'caliente' | 'ninguna' =
            (recipe?.station && recipe.station !== 'ninguna')
              ? recipe.station
              : (isDrink ? 'ninguna' : (recipe?.station || 'ninguna'));

          // Buscar coincidencia en items existentes para preservar su estado y clasificación original
          let existing = dtoItem.itemId
            ? existingItems.find(
                (ex) => ex._id && ex._id.toString() === dtoItem.itemId && !matchedExistingIds.has(ex._id.toString())
              )
            : null;

          if (!existing) {
            existing = existingItems.find(
              (ex) =>
                (ex.recipe?._id?.toString() || ex.recipe?.toString()) === dtoItem.recipe &&
                !matchedExistingIds.has(ex._id?.toString() || '')
            );
          }

          if (existing) {
            if (existing._id) matchedExistingIds.add(existing._id.toString());
            // Regla A: Artículos existentes conservan su clasificación de cocina histórica
            const preservedStation =
              existing.station === 'fria' || existing.station === 'caliente'
                ? existing.station
                : (dtoItem.station && dtoItem.station !== 'ninguna' ? dtoItem.station : defaultRecipeStation);

            return {
              _id: existing._id,
              recipe: new Types.ObjectId(dtoItem.recipe),
              quantity: dtoItem.quantity,
              status: (dtoItem.status || existing.status || 'preparing') as any,
              station: preservedStation,
              notes: dtoItem.notes !== undefined ? dtoItem.notes : (existing.notes || ''),
              callWaiter: existing.callWaiter,
            };
          } else {
            // Regla B: Artículos nuevos reciben la clasificación de la receta
            const itemStation =
              dtoItem.station && dtoItem.station !== 'ninguna'
                ? dtoItem.station
                : defaultRecipeStation;

            return {
              _id: new Types.ObjectId(),
              recipe: new Types.ObjectId(dtoItem.recipe),
              quantity: dtoItem.quantity,
              status: (dtoItem.status || 'preparing') as any,
              station: itemStation,
              notes: dtoItem.notes || '',
            };
          }
        });

        order.items = newItems as any;
        order.total = total;
      }

      if (dto.status) {
        order.status = dto.status;
        if (dto.status === 'delivered' && Array.isArray(order.items)) {
          order.items.forEach((it: any) => {
            if (it.status !== 'cancelled') {
              it.status = 'delivered';
            }
          });
        } else if (dto.status === 'ready' && Array.isArray(order.items)) {
          order.items.forEach((it: any) => {
            if (it.status !== 'cancelled' && it.status !== 'delivered') {
              it.status = 'ready';
            }
          });
        }
      }

      if (dto.notes !== undefined) {
        order.notes = dto.notes;
      }

      // Recalcular estado global a partir de items
      if (order.items && order.items.length > 0) {
        const statuses = order.items.map((it) => it.status || 'preparing');
        if (statuses.every((s) => s === 'delivered')) {
          order.status = 'delivered';
        } else if (statuses.every((s) => s === 'ready' || s === 'delivered') && statuses.some((s) => s === 'ready')) {
          order.status = 'ready';
        } else if (statuses.every((s) => s === 'cancelled')) {
          order.status = 'cancelled';
        } else {
          order.status = 'preparing';
        }
      }

      const updatedOrder = await order.save();

      const activeSale = await this.saleModel.findOne({ table: order.table, status: 'unpaid' });
      if (activeSale) {
        const totals = await this.orderModel.aggregate([
          { $match: { _id: { $in: activeSale.orders as any[] } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]);
        activeSale.totalAmount = totals[0]?.total ?? 0;
        await activeSale.save();
      }

      const populated = await this.orderModel
        .findById(updatedOrder._id)
        .populate('items.recipe', 'name description steps imageUrl price station category')
        .populate('table', '_id number');

      const load = this.toKitchenOrderLoad(populated);

      // Cocina
      this.kitchenGateway.emitToAll('order.updated', load);
      this.kitchenGateway.emitToAll('order.status.changed', { id: load.id, status: updatedOrder.status });

      // Mesero
      this.waiterGateway.emitToAll('order.updated', load);
      this.waiterGateway.emitToAll('order.status.changed', { id: load.id, status: updatedOrder.status, tableNumber: load.tableNumber });

      return updatedOrder;
    } catch (e) {
      throw e;
    }
  }

  async restoreStockForItems(
    items: Array<{ recipe: any; quantity: number }>,
    referenceId: string,
    reasonPrefix: string,
    user: string = 'sistema_pos',
    filterReturnableOnly: boolean = false,
  ): Promise<void> {
    for (const item of items) {
      const recipeId = item.recipe?._id ?? item.recipe;
      const recipe = await this.recipeModel.findById(recipeId);
      if (recipe && Array.isArray(recipe.ingredients)) {
        for (const ing of recipe.ingredients) {
          try {
            if (ing.ingredientId && Number.isFinite(ing.quantity) && ing.quantity > 0) {
              const product = await this.productModel.findById(ing.ingredientId);
              if (product) {
                // Validación estricta de la regla de reincorporación al cancelar:
                if (filterReturnableOnly) {
                  const isExplicitReturnable = Boolean(product.returnableOnCancel);
                  const isClosedBottleOrCan =
                    (product.purchaseUnit === 'botella' ||
                      product.purchaseUnit === 'lata' ||
                      product.contentUnit === 'botella' ||
                      product.contentUnit === 'lata' ||
                      product.unitMesure === 'pieza' ||
                      product.unitMesure === 'botella' ||
                      product.unitMesure === 'lata') &&
                    (product.category === 'Bebidas' ||
                      product.category === 'Bebidas y Licores') &&
                    recipe.ingredients.length === 1;

                  const canRestore = isExplicitReturnable || isClosedBottleOrCan;

                  if (!canRestore) {
                    console.log(
                      `[OrdersService] Omitiendo reincorporación de insumo perecedero "${product.name}" para platillo "${recipe.name}" al cancelar comanda.`,
                    );
                    continue;
                  }
                }

                const targetUnit = product.baseUnit || product.unitMesure || 'pieza';
                const qtyToRestore = this.computeDeduction(
                  ing.quantity * (item.quantity || 1),
                  ing.unitMesure,
                  targetUnit,
                );

                const prevStock = product.stock ?? 0;
                const newStock = +(prevStock + qtyToRestore).toFixed(4);
                product.stock = newStock;
                await product.save();

                await this.stockMovementModel.create({
                  product: product._id,
                  type: 'adjustment',
                  quantity: qtyToRestore,
                  previousStock: prevStock,
                  newStock,
                  reason: `${reasonPrefix}: "${recipe.name}" (x${item.quantity})`,
                  reference: referenceId,
                  user,
                });
              }
            }
          } catch (restoreErr) {
            console.warn('[OrdersService] Error restituyendo inventario:', restoreErr);
          }
        }
      }
    }
  }

  async deleteOrder(id: string) {
    try {
      const orderToDelete = await this.orderModel.findById(id);
      if (!orderToDelete) throw new NotFoundException('Orden no encontrada');

      // Si la comanda no estaba entregada, restaurar inventario consumido
      if (orderToDelete.status !== 'delivered' && Array.isArray(orderToDelete.items)) {
        await this.restoreStockForItems(
          orderToDelete.items,
          orderToDelete._id.toString(),
          'Restitución por comanda eliminada',
        );
      }

      const deleted = await this.orderModel.findByIdAndDelete(id);
      if (!deleted) throw new NotFoundException('Orden no encontrada');

      // Remover referencia de la venta activa y recalcular totales
      const activeSale = await this.saleModel.findOne({ orders: deleted._id });
      if (activeSale) {
        activeSale.orders = (activeSale.orders as any[]).filter(
          (o) => o?.toString?.() !== deleted._id.toString()
        );

        if (activeSale.orders.length > 0) {
          const totals = await this.orderModel.aggregate([
            { $match: { _id: { $in: activeSale.orders as any[] }, status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$total' } } },
          ]);
          activeSale.totalAmount = totals[0]?.total ?? 0;
          await activeSale.save();
        } else {
          // Si no le quedan órdenes y la venta está pendiente (unpaid), eliminarla y liberar la mesa
          activeSale.totalAmount = 0;
          if (activeSale.status === 'unpaid') {
            await this.saleModel.findByIdAndDelete(activeSale._id);
            const tableId = normalizeIdStrict(activeSale.table);
            if (tableId) {
              await this.tablesService.updateTableStatus(tableId, { status: 'disponible' });
            }
          } else {
            await activeSale.save();
          }
        }
      }

      // Notificar eliminación inmediata a Cocina y Mesero
      this.kitchenGateway.emitToAll('order.deleted', { id: deleted._id.toString() });
      this.waiterGateway.emitToAll('order.deleted', {
        id: deleted._id.toString(),
        tableNumber: (deleted.table as any)?.number,
      });

      return deleted;
    } catch (e) {
      throw e;
    }
  }

  async updateOrderItemStatus(
    orderId: string,
    itemId: string,
    status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled',
  ) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Orden no encontrada');

    const item = (order.items as any[]).find(
      (it) => it._id?.toString() === itemId || it.recipe?.toString() === itemId
    );
    if (!item) throw new NotFoundException('Platillo no encontrado en la comanda');

    const prevItemStatus = item.status;
    if (prevItemStatus === 'cancelled' && status === 'ready') {
      throw new BadRequestException('Un platillo cancelado no puede marcarse como listo');
    }
    if (prevItemStatus === 'delivered') {
      throw new BadRequestException('Un platillo ya entregado no puede modificarse');
    }
    if (prevItemStatus === status) {
      return order;
    }

    item.status = status;

    // Si el platillo se marca como listo, se actualiza su estado.
    // No se genera un recuadro/llamado de mesero automático para no duplicar con alertas explícitas.
    if (status === 'ready' && item.callWaiter && item.callWaiter.reason === 'ready' && !item.callWaiter.isExplicitCall) {
      item.callWaiter.requested = false;
      item.callWaiter.resolved = true;
    }

    // Si se cancela un platillo individual, restituir sus insumos
    if (status === 'cancelled' && prevItemStatus !== 'cancelled') {
      await this.restoreStockForItems(
        [item],
        order._id.toString(),
        'Restitución por platillo cancelado',
      );
      if (item.callWaiter) {
        item.callWaiter.requested = false;
        item.callWaiter.resolved = true;
      }
    }

    // Recalcular total de la comanda excluyendo platillos cancelados
    const activeItems = (order.items as any[]).filter((it) => it.status !== 'cancelled');
    const recipeIds = (order.items as any[]).map((it) => it.recipe?._id ?? it.recipe);
    const recipes = await this.recipeModel.find({ _id: { $in: recipeIds } });

    order.total = activeItems.reduce((sum, it) => {
      const recId = (it.recipe?._id ?? it.recipe)?.toString();
      const r = recipes.find((rc: any) => rc._id?.toString() === recId);
      return sum + (r?.price ?? 0) * (it.quantity ?? 1);
    }, 0);

    // Calcular estado global de la comanda basado estrictamente en items activos
    if (activeItems.length === 0) {
      order.status = 'cancelled';
    } else if (activeItems.every((s) => s.status === 'delivered')) {
      order.status = 'delivered';
    } else if (activeItems.every((s) => s.status === 'ready' || s.status === 'delivered')) {
      order.status = 'ready';
    } else {
      order.status = 'preparing';
    }

    const updated = await order.save();

    // Actualizar totalAmount de la venta activa en la mesa
    const activeSale = await this.saleModel.findOne({ table: order.table, status: 'unpaid' });
    if (activeSale) {
      const totals = await this.orderModel.aggregate([
        { $match: { _id: { $in: activeSale.orders as any[] }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]);
      activeSale.totalAmount = totals[0]?.total ?? 0;
      await activeSale.save();
    }

    const populated = await this.orderModel
      .findById(updated._id)
      .populate('items.recipe', 'name description steps imageUrl price station category')
      .populate('table', '_id number');

    const load = this.toKitchenOrderLoad(populated);

    this.kitchenGateway.emitToAll('order.updated', load);
    this.kitchenGateway.emitToAll('order.status.changed', { id: load.id, status: updated.status });
    this.waiterGateway.emitToAll('order.updated', load);
    this.waiterGateway.emitToAll('order.status.changed', { id: load.id, status: updated.status, tableNumber: load.tableNumber });

    if (status === 'ready') {
      const populatedItem = (populated?.items as any[])?.find(
        (it) => it._id?.toString() === itemId || it.recipe?._id?.toString() === itemId,
      );
      this.waiterGateway.emitToAll('item.ready', {
        orderId: updated._id.toString(),
        itemId,
        tableNumber: load.tableNumber,
        itemName: populatedItem?.recipe?.name || 'Platillo',
      });
    }

    return updated;
  }

  async callWaiter(
    orderId: string,
    itemId: string,
    dto: { reason: 'ready' | 'unavailable' | 'issue' | 'other'; message?: string },
  ) {
    const order = await this.orderModel.findById(orderId).populate('table', '_id number');
    if (!order) throw new NotFoundException('Orden no encontrada');

    const item = (order.items as any[]).find(
      (it) => it._id?.toString() === itemId || it.recipe?.toString() === itemId,
    );
    if (!item) throw new NotFoundException('Platillo no encontrado en la comanda');

    item.callWaiter = {
      requested: true,
      reason: dto.reason || 'ready',
      message: dto.message || '',
      requestedAt: new Date(),
      resolved: false,
      isExplicitCall: true,
    };

    const updated = await order.save();
    const populated = await this.orderModel
      .findById(updated._id)
      .populate('items.recipe', 'name description steps imageUrl price station category')
      .populate('table', '_id number');

    const load = this.toKitchenOrderLoad(populated);
    const populatedItem = (populated?.items as any[])?.find(
      (it) => it._id?.toString() === itemId || it.recipe?._id?.toString() === itemId,
    );
    const recipeName = populatedItem?.recipe?.name || 'Platillo';

    const alertPayload = {
      orderId: order._id.toString(),
      itemId,
      recipeId: populatedItem?.recipe?._id?.toString() || '',
      tableId: (order.table as any)?._id?.toString() || order.table?.toString(),
      tableNumber: (order.table as any)?.number || load.tableNumber,
      reason: dto.reason || 'ready',
      message: dto.message || '',
      itemName: recipeName,
      requestedAt: item.callWaiter.requestedAt,
      isExplicitCall: true,
    };

    this.waiterGateway.emitToAll('waiter.call', alertPayload);
    this.kitchenGateway.emitToAll('waiter.call', alertPayload);
    this.kitchenGateway.emitToAll('order.updated', load);
    this.waiterGateway.emitToAll('order.updated', load);

    return { success: true, item: item.callWaiter, load };
  }

  async dismissWaiterCall(orderId: string, itemId: string) {
    const order = await this.orderModel.findById(orderId).populate('table', '_id number');
    if (!order) throw new NotFoundException('Orden no encontrada');

    const item = (order.items as any[]).find(
      (it) => it._id?.toString() === itemId || it.recipe?.toString() === itemId,
    );
    if (!item) throw new NotFoundException('Platillo no encontrado en la comanda');

    if (item.callWaiter) {
      item.callWaiter.requested = false;
      item.callWaiter.resolved = true;
    }

    const updated = await order.save();
    const populated = await this.orderModel
      .findById(updated._id)
      .populate('items.recipe', 'name description steps imageUrl price station category')
      .populate('table', '_id number');

    const load = this.toKitchenOrderLoad(populated);

    const dismissPayload = {
      orderId: order._id.toString(),
      itemId,
      tableId: (order.table as any)?._id?.toString() || order.table?.toString(),
      tableNumber: (order.table as any)?.number || load.tableNumber,
    };

    this.waiterGateway.emitToAll('waiter.call.dismissed', dismissPayload);
    this.kitchenGateway.emitToAll('waiter.call.dismissed', dismissPayload);
    this.kitchenGateway.emitToAll('order.updated', load);
    this.waiterGateway.emitToAll('order.updated', load);

    return { success: true, load };
  }
  async searchOrders(query: any): Promise<OrderResponseDto[]> {
    try {
      const mongoQuery: any = {};

      if (query.status) {
        mongoQuery.status = query.status;
      }

      if (query.table) {
        mongoQuery.table = query.table;
      }

      if (query.total) {
        mongoQuery.total = Number(query.total);
      }

      const orders = await this.orderModel
        .find(mongoQuery)
        .populate('table', '_id number')
        .populate('items.recipe', 'name description steps imageUrl price station category');

      return orders.map((order) => this.toKitchenOrderLoad(order));
    } catch (e) {
      throw e;
    }
  }
}
