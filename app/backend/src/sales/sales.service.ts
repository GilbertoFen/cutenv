import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Sale, SaleDocument } from '../schemasMongo/sale.schema';
import { Model, Types } from 'mongoose';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleResponseDto } from './dto/sale-response.dto';
import { SalePopulated } from './interfaces/sale-populated.interface';
import { Order, OrderDocument } from '../schemasMongo/order.schema';
import { Table, TableDocument } from '../schemasMongo/table.schema';
import { PaySaleDto } from './dto/pay-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>
  ) {}

  async getAllSales(): Promise<SaleResponseDto[]> {
    try{
      const sales = await this.saleModel
  .find()
  .populate('table') // mesa de la venta
  .populate({
    path: 'orders',
    model: 'Order',        // asegura el modelo
    populate: [
      { path: 'items.recipe', model: 'Recipe' }, // ✅ existe
      { path: 'table', model: 'Table', select: 'number' }, // si Order tiene table
    ],
  });
      return (sales ?? []).map((sale: any) => ({
  id: sale?._id?.toString?.() ?? '',
  totalAmount: sale?.totalAmount ?? 0,
  orders: (sale?.orders ?? []).map((order: any) => {
    const items = (order?.items ?? []).map((it: any) => ({
      recipe: it?.recipe?.name ?? '—',
      quantity: it?.quantity ?? 0,
      price: it?.recipe?.price ?? 0,
      notes: it?.notes ?? undefined,
    }));
    return {
      items,
      tableNumber:
        order?.table?.number ??
        sale?.table?.number ??
        order?.tableNumber ??
        undefined,
      total: order?.total ??
             items.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0),
    };
  }),
  folio: sale?.folio ?? '—',
  orderType: sale?.orderType,
  paymentMethod: sale?.paymentMethod,
  date: sale?.date ?? undefined,
  tableId: sale?.table?._id
}));

    } catch (e) {
        throw e;
    }
  }
async searchSales(query: any): Promise<SaleResponseDto[]> {
  try {
    const mongoQuery: any = {};

    if (query.folio) mongoQuery.folio = query.folio;
    if (query._id) {
      const s = String(query._id);                       // fuerza string
      mongoQuery._id = Types.ObjectId.isValid(s)
        ? new Types.ObjectId(s)
        : new Types.ObjectId('000000000000000000000000'); // fuerza 0 resultados si es inválido
    }
    if (query.status) mongoQuery.status = query.status;
     if (query.totalAmount) mongoQuery.totalAmount = Number(query.totalAmount);

    // 👇 Asegura que el filtro por mesa matchee con el ObjectId guardado
    if (query.table) {
      const s = String(query.table);
      mongoQuery.table = Types.ObjectId.isValid(s)
        ? new Types.ObjectId(s)
        : new Types.ObjectId('000000000000000000000000'); // fuerza 0 resultados si es inválido
    }

    // ⚠️ Recalcula SOLO si _id es válido (ya convertido arriba)
    if (mongoQuery._id && Types.ObjectId.isValid(String(mongoQuery._id))) {
      await this.recomputeSaleTotal(String(query._id));   // usa el string original válido
    }

    const sales = await this.saleModel
      .find(mongoQuery)
      .populate('table') // mesa en la venta
      .populate({
        path: 'orders',
        model: 'Order',
        populate: [
          { path: 'items.recipe', model: 'Recipe' },           // ✅ items con receta populada
          { path: 'table', model: 'Table', select: 'number' }, // si Order guarda table
        ],
      });

    // ⬇️ Mapeo alineado con getAllSales, sin helpers
    return (sales || []).map((sale: any) => {
      const orders = Array.isArray(sale.orders) ? sale.orders : [];

      return {
        id: sale._id.toString(),
        totalAmount: sale.totalAmount ?? 0,
        orders: orders.map((order: any) => {
          const rawItems = Array.isArray(order.items) ? order.items : [];
          const items = rawItems.map((it: any) => ({
            recipe: it?.recipe?.name ?? '—',
            quantity: it?.quantity ?? 0,
            price: it?.recipe?.price ?? 0,
            notes: it?.notes ?? undefined,
          }));

          const total =
            typeof order.total === 'number'
              ? order.total
              : items.reduce((acc, it) => acc + (it.price * it.quantity), 0);

          return {
            items,
            tableNumber:
              order?.table?.number ??
              sale?.table?.number ??
              order?.tableNumber ??
              undefined,
            total,
          };
        }),
        folio: sale.folio ?? '—',
        orderType: sale.orderType,
        paymentMethod: sale.paymentMethod,
        date: sale.date ?? undefined,
      };
    });
  } catch (e) {
    throw e;
  }
}

async getSaleById(id: string): Promise<SaleResponseDto> {
  try {
    await this.recomputeSaleTotal(id);
    const sale: any = await this.saleModel
      .findById(id)
      .populate('table')
      .populate({
        path: 'orders',
        model: 'Order',
        populate: [
          { path: 'items.recipe', model: 'Recipe' },
          { path: 'table', model: 'Table', select: 'number' },
        ],
      });

    if (!sale) throw new NotFoundException('Venta no encontrada');

    const orders = (sale?.orders ?? []).map((order: any) => {
      const items = (order?.items ?? []).map((it: any) => ({
        recipe: it?.recipe?.name ?? '—',
        quantity: it?.quantity ?? 0,
        price: it?.recipe?.price ?? 0,
        notes: it?.notes ?? undefined,
      }));
      
      return {
        items,
        tableNumber:
          order?.table?.number ??
          sale?.table?.number ??
          order?.tableNumber ??
          undefined,
        total:
          order?.total ??
          items.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0),
      };
    });

    return {
      id: sale?._id?.toString?.() ?? '',
      totalAmount: sale?.totalAmount ?? 0,
      orders,
      folio: sale?.folio ?? '—',
      orderType: sale?.orderType,
      paymentMethod: sale?.paymentMethod,
      date: sale?.date ?? undefined,
    };
  } catch (e) {
    throw e;
  }
}

  async createSale(dto: CreateSaleDto) {
    try{
      const orderType = dto.orderType ?? 'local';

      // Si es dine_in, exigir mesa
      if (orderType === 'local') {
        if (!dto.table) {
          throw new ConflictException('Para dine_in debes indicar una mesa');
        }
        // No permitir dos ventas activas en la misma mesa
        const existingSale = await this.saleModel.findOne({
          table: dto.table,
          status: { $in: ['unpaid', 'partial'] },
        });
        if (existingSale) {
          throw new ConflictException('Ya existe una venta pendiente para esta mesa');
        }
      }

      // Crear forzando status inicial a 'unpaid'
      const created = new this.saleModel({
        ...dto,
        orderType,
        status: 'unpaid',
      });

      return await created.save();
    } catch (e) {
      throw e;
    }
  }
  /// Simulado haciendo la peticion a un servidor de Flask que imprime el ticket no se necesita printTicket

  async printTicket(saleId: string): Promise<void> {
    try {
      const response = await fetch(`http://localhost:3000/api/sales/search?_id=${saleId}`);
      const sales = await response.json();

      if (!Array.isArray(sales) || sales.length === 0) {
        throw new Error('Venta no encontrada');
      }

      const sale = sales[0];

      const printRes = await fetch('http://localhost:5000/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ venta: sale })
      });

      const result = await printRes.json();

      if (result.ok) {
        console.log('Ticket impreso');
      } else {
        console.error('Error en impresion:', result.error);
      }
    } catch (error) {
      console.error('Error al imprimir ticket:', error.message);
      throw error;
    }
}

  async paySale(saleId: string, body: PaySaleDto) {
    try {
      const sale = await this.saleModel
        .findById(saleId)
        .populate({ path: 'orders', model: 'Order' })
        .populate('table');

      if (!sale) throw new NotFoundException('Venta no encontrada');
      if (sale.status === 'paid') throw new ConflictException('La venta ya ha sido pagada');

      // Validar body
      const { orderType, paymentMethod } = body ?? ({} as PaySaleDto);
      if (!orderType || !paymentMethod) {
        throw new ConflictException('orderType y paymentMethod son obligatorios al pagar');
      }

      // Si quisieras exigir que todas las órdenes estén entregadas antes:
     const pending = await this.orderModel.exists({
  _id: { $in: sale.orders as any[] },
  status: { $ne: 'delivered' },
});
if (pending) throw new ConflictException('No puedes pagar: hay items pendientes');



      // Tu lógica actual: marcar todas como delivered
      const orders = sale.orders as unknown as OrderDocument[];
      await Promise.all(
        orders.map(async (order) => {
          order.status = 'delivered';
          await order.save();
        })
      );

      sale.status = 'paid';
      sale.date = new Date();
      sale.orderType = orderType;
      sale.paymentMethod = paymentMethod;
      await sale.save();

      // Liberar mesa solo si la venta tiene mesa (dine_in)
      const table = await this.tableModel.findById(sale.table);
      if (table) {
        table.status = 'disponible';
        await table.save();
      }

      return { message: 'Venta pagada, órdenes entregadas y mesa liberada' };
    } catch (e) {
      throw e;
    }
  }

  // sales.service.ts
async recomputeSaleTotal(saleId: Types.ObjectId | string): Promise<number> {
  const _id = typeof saleId === 'string' ? new Types.ObjectId(saleId) : saleId;

  // Suma directamente desde las órdenes guardadas en la venta
  const sale = await this.saleModel.findById(_id).populate({ path: 'orders', model: 'Order' });
  if (!sale) throw new NotFoundException('Venta no encontrada');

  // Si alguna orden no tiene 'total' por cualquier motivo, suma desde items.recipe.price * quantity
  const totals = await this.orderModel.aggregate([
    { $match: { _id: { $in: sale.orders.map((o: any) => o._id ?? o) } } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);

  const totalAmount = totals[0]?.total ?? 0;
  sale.totalAmount = Number(totalAmount.toFixed(2));
  await sale.save();

  return sale.totalAmount;
}

}
