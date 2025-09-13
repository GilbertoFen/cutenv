import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from '../schemasMongo/order.schema';
import { Model } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { Sale, SaleDocument } from '../schemasMongo/sale.schema';
import { Recipe, RecipeDocument } from '../schemasMongo/recipe.schema';
import { Types } from 'mongoose';
import { KitchenGateway } from 'src/gateways/kitchen.gateway';
import { WaiterGateway } from 'src/gateways/waiter.gateway';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Recipe.name) private recipeModel: Model<RecipeDocument>,
    private readonly kitchenGateway: KitchenGateway,
    private readonly waiterGateway: WaiterGateway
  ) { }
  private toKitchenOrderLoad(order: any): any {
    return {
      id: order._id.toString(),
      tableNumber: order.table?.number ?? order.table?.['number'] ?? 0,
      status: order.status,
      total: order.total,
      notes: order.notes,
      recipes: (order.items ?? [])
        .filter((item) => item.recipe)
        .map((item) => ({
          id: item.recipe?._id?.toString?.(),
          name: item.recipe?.name ?? '',
          imageUrl: item.recipe?.imageUrl ?? '',
          quantity: item.quantity ?? 0,
        })),
    };
  }

  async getAllOrders(): Promise<OrderResponseDto[]> {
    try {
      const orders = await this.orderModel
        .find()
        .populate('table')
        .populate('items.recipe');

      return orders.map((order) => ({
        id: order._id.toString(),
        tableNumber: order.table['number'],
        status: order.status,
        recipes: order.items.map((item) => ({
          name: item.recipe['name'],
          quantity: item.quantity,
          imageUrl: item.recipe['imageUrl'] || '',
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
        tableNumber: order.table['number'],
        status: order.status,
        total: order.total,
        notes: order.notes,
        recipes: order.items.map((item) => ({
          name: item.recipe?.['name'] || '',
          quantity: item.quantity,
          imageUrl: item.recipe?.['imageUrl'] || '',
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
      tableNumber: order.table['number'] || 0,
      notes: order.notes,
      recipes: order.items
        .filter((item) => item.recipe)
        .map((item) => ({
          id: item.recipe._id.toString(),
          name: item.recipe['name'],
          imageUrl: item.recipe['imageUrl'] || '',
          quantity: item.quantity,
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
        tableNumber: order.table['number'],
        status: order.status,
        recipes: order.items.map((item) => ({
          name: item.recipe['name'],
          quantity: item.quantity,
          imageUrl: item.recipe['imageUrl'] || '',
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

      const createdOrder = new this.orderModel({
        table: dto.table,
        items: dto.items,
        total,
        notes: dto.notes || '',
      });

      const savedOrder = await createdOrder.save();
      const populated = await this.orderModel
        .findById(savedOrder._id)
        .populate('items.recipe', 'name imageUrl')
        .populate('table', '_id number');

      const load = this.toKitchenOrderLoad(populated);
      console.log('--- ORDERSERVICE --- order created load:', load);


      this.kitchenGateway.emitToAll('order.created', load);
      this.waiterGateway.emitToAll('order.created', load);

      const allSales = await this.saleModel.find({ status: 'unpaid' });
      console.log(
        'ventas sin pagar (unpaid:',
        allSales.map((sale) => ({
          id: sale._id,
          table: sale.table.toString(),
        })),
      );

      const activeSale = await this.saleModel.findOne({
        table: new Types.ObjectId(dto.table),
        status: 'unpaid',
      });

      console.log('--- ORDERSERVICE --- Venta activa encontrada:', activeSale);

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
      else {
        console.warn(`--- ORDERSERVICE --- No se encontro venta activa para la mesa ${dto.table}`);
      }

      return savedOrder;
    } catch (e) {
      throw e;
    }
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    try {
      const updated = await this.orderModel.findByIdAndUpdate(
        id,
        { status: dto.status },
        { new: true },
      );
      if (!updated) throw new NotFoundException('Orden no encontrada');

      const populated = await this.orderModel
        .findById(updated._id)
        .populate('items.recipe', 'name imageUrl')
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
          '--- ORDERSERVICE --- No se puede actualizar una orden ya entregada o cancelada',
        );
      }

      if (dto.items) {
        const recipeIds = dto.items.map((item) => item.recipe);
        const recipes = await this.recipeModel.find({
          _id: { $in: recipeIds },
        });

        const total = dto.items.reduce((sum, item) => {
          const recipe = recipes.find((recipe) => recipe._id!.toString() === item.recipe);
          return sum + (recipe?.price ?? 0) * item.quantity;
        }, 0);

        order.items = dto.items.map((item) => ({
          recipe: new Types.ObjectId(item.recipe),
          quantity: item.quantity,
        }));

        order.total = total;
      }

      if (dto.status) {
        order.status = dto.status;
      }

      if (dto.notes !== undefined) {
        order.notes = dto.notes;
      }

      const recipeIds = order.items.map(it => it.recipe);
      const recipes = await this.recipeModel.find({ _id: { $in: recipeIds } });
      const priceMap = new Map(recipes.map(r => [(r._id as Types.ObjectId).toString(), r.price]));
      order.total = order.items.reduce((acc, it) => acc + (priceMap.get(it.recipe.toString()) ?? 0) * (it.quantity ?? 0), 0);

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
        .populate('items.recipe', 'name imageUrl')
        .populate('table', '_id number');

      const load = this.toKitchenOrderLoad(populated);
      console.log('--- ORDERSERVICE ---  waiter emit order.updated payload:', load);

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

  async deleteOrder(id: string) {
    try {
      const deleted = await this.orderModel.findByIdAndDelete(id);
      this.kitchenGateway.emitToAll('order.deleted', { id: deleted?._id.toString() });
      if (!deleted) throw new NotFoundException('Orden no encontrada');
      return deleted;
    } catch (e) {
      throw e;
    }
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
