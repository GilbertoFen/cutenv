import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
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
  private toKitchenOrderLoad(order: any): any {
    return {
      id: order._id.toString(),
      tableNumber: order.table?.number ?? order.table?.['number'] ?? 0,
      status: order.status,
      total: order.total,
      notes: order.notes,
      recipes: (order.items ?? [])
        .filter((item: any) => item.recipe)
        .map((item: any) => ({
          itemId: item._id?.toString?.() ?? '',
          id: item.recipe?._id?.toString?.() ?? item.recipe?.toString?.(),
          name: item.recipe?.name ?? '',
          imageUrl: item.recipe?.imageUrl ?? '',
          quantity: item.quantity ?? 0,
          status: item.status ?? order.status ?? 'preparing',
          notes: item.notes ?? '',
          price: item.recipe?.price ?? 0,
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
        status: order.status,
        recipes: (order.items ?? [])
          .filter((item: any) => item.recipe)
          .map((item: any) => ({
            itemId: item._id?.toString?.() ?? '',
            id: item.recipe?._id?.toString?.() ?? item.recipe?.toString?.(),
            name: typeof item.recipe === 'object' ? item.recipe['name'] : '',
            quantity: item.quantity,
            imageUrl: typeof item.recipe === 'object' ? item.recipe['imageUrl'] || '' : '',
            status: item.status ?? order.status ?? 'preparing',
            notes: item.notes ?? '',
            price: typeof item.recipe === 'object' ? item.recipe['price'] || 0 : 0,
          })),
        notes: order.notes,
        total: order.total,
      }));
    } catch (e) {
      throw e;
    }
  }

  async getOrdersByTableId(tableId: string): Promise<OrderResponseDto[]> {
    try {
      const orders = await this.orderModel
        .find({ table: new Types.ObjectId(tableId) })
        .populate('items.recipe')
        .populate('table');

      return orders.map((order) => ({
        id: order._id.toString(),
        tableNumber: (order.table as any)?.number ?? 0,
        status: order.status,
        total: order.total,
        notes: order.notes,
        recipes: (order.items ?? [])
          .filter((item: any) => item.recipe)
          .map((item: any) => ({
            itemId: item._id?.toString?.() ?? '',
            id: item.recipe?._id?.toString?.() ?? item.recipe?.toString?.(),
            name: typeof item.recipe === 'object' ? item.recipe['name'] : '',
            quantity: item.quantity,
            imageUrl: typeof item.recipe === 'object' ? item.recipe['imageUrl'] || '' : '',
            status: item.status ?? order.status ?? 'preparing',
            notes: item.notes ?? '',
            price: typeof item.recipe === 'object' ? item.recipe['price'] || 0 : 0,
          })),
      }));
    } catch (e) {
      throw e;
    }
  }

  async getActiveOrdersByTable(tableId: string): Promise<OrderResponseDto[]> {
    const activeSale = await this.saleModel.findOne({
      table: new Types.ObjectId(tableId),
      status: 'unpaid',
    });

    if (!activeSale) return [];

    const orders = await this.orderModel
      .find({ _id: { $in: activeSale.orders } })
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
          imageUrl: typeof item.recipe === 'object' ? item.recipe['imageUrl'] || '' : '',
          quantity: item.quantity,
          status: item.status ?? order.status ?? 'preparing',
          notes: item.notes ?? '',
          price: typeof item.recipe === 'object' ? item.recipe['price'] || 0 : 0,
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
            quantity: item.quantity,
            imageUrl: typeof item.recipe === 'object' ? item.recipe['imageUrl'] || '' : '',
            status: item.status ?? order.status ?? 'preparing',
            notes: item.notes ?? '',
            price: typeof item.recipe === 'object' ? item.recipe['price'] || 0 : 0,
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

      const itemsWithStatus = dto.items.map((it) => ({
        recipe: new Types.ObjectId(it.recipe),
        quantity: it.quantity,
        status: (it.status || 'preparing') as any,
        notes: it.notes || '',
      }));

      const createdOrder = new this.orderModel({
        table: dto.table,
        items: itemsWithStatus,
        total,
        notes: dto.notes || '',
        status: 'preparing',
      });

      const savedOrder = await createdOrder.save();
      const populated = await this.orderModel
        .findById(savedOrder._id)
        .populate('items.recipe', 'name imageUrl price')
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

      const activeSale = await this.saleModel.findOne({
        table: new Types.ObjectId(dto.table),
        status: 'unpaid',
      });

      if (activeSale) {
        activeSale.orders.push(savedOrder._id as any);
        await activeSale.save();
        const totals = await this.orderModel.aggregate([
          { $match: { _id: { $in: activeSale.orders as any[] } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]);
        activeSale.totalAmount = totals[0]?.total ?? 0;
        await activeSale.save();
      }

      return savedOrder;
    } catch (e) {
      throw e;
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
          }
        });
      }
      const updated = await order.save();

      const populated = await this.orderModel
        .findById(updated._id)
        .populate('items.recipe', 'name imageUrl price')
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
          const recipe = recipes.find((recipe) => recipe._id!.toString() === item.recipe);
          return sum + (recipe?.price ?? 0) * item.quantity;
        }, 0);

        const prevItemsMap = new Map(
          (order.items ?? []).map((it) => [it.recipe?.toString(), it.status])
        );

        order.items = dto.items.map((item) => ({
          recipe: new Types.ObjectId(item.recipe),
          quantity: item.quantity,
          status: (prevItemsMap.get(item.recipe) || item.status || 'preparing') as any,
          notes: item.notes || '',
        }));

        order.total = total;
      }

      if (dto.status) {
        order.status = dto.status;
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
        .populate('items.recipe', 'name imageUrl price')
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
            { $match: { _id: { $in: activeSale.orders as any[] } } },
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
    status: 'preparing' | 'ready' | 'delivered' | 'cancelled',
  ) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Orden no encontrada');

    const item = (order.items as any[]).find(
      (it) => it._id?.toString() === itemId || it.recipe?.toString() === itemId
    );
    if (!item) throw new NotFoundException('Platillo no encontrado en la comanda');

    const prevItemStatus = item.status;
    item.status = status;

    // Si se cancela un platillo individual, restituir sus insumos
    if (status === 'cancelled' && prevItemStatus !== 'cancelled') {
      await this.restoreStockForItems(
        [item],
        order._id.toString(),
        'Restitución por platillo cancelado',
      );
    }

    // Calcular estado global de la comanda
    const statuses = (order.items as any[]).map((it) => it.status || 'preparing');
    if (statuses.every((s) => s === 'delivered')) {
      order.status = 'delivered';
    } else if (statuses.every((s) => s === 'ready' || s === 'delivered') && statuses.some((s) => s === 'ready')) {
      order.status = 'ready';
    } else if (statuses.every((s) => s === 'cancelled')) {
      order.status = 'cancelled';
    } else {
      order.status = 'preparing';
    }

    const updated = await order.save();

    const populated = await this.orderModel
      .findById(updated._id)
      .populate('items.recipe', 'name imageUrl price')
      .populate('table', '_id number');

    const load = this.toKitchenOrderLoad(populated);

    this.kitchenGateway.emitToAll('order.updated', load);
    this.kitchenGateway.emitToAll('order.status.changed', { id: load.id, status: updated.status });
    this.waiterGateway.emitToAll('order.updated', load);
    this.waiterGateway.emitToAll('order.status.changed', { id: load.id, status: updated.status, tableNumber: load.tableNumber });

    return updated;
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
        .populate('table')
        .populate('items.recipe');

      return orders.map((order) => ({
        id: order._id.toString(),
        tableNumber: order.table['number'] || 0,
        status: order.status,
        total: order.total,
        notes: order.notes,
        recipes: order.items.map((item) => ({
          name: typeof item.recipe === 'object' ? item.recipe['name'] : '',
          quantity: item.quantity,
          imageUrl: item.recipe['imageUrl'] || '',
        })),
      }));
    } catch (e) {
      throw e;
    }
  }
}
