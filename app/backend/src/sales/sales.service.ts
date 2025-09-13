import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Sale, SaleDocument } from '../schemasMongo/sale.schema';
import { Model, Types } from 'mongoose';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleResponseDto } from './dto/sale-response.dto';
import { Order, OrderDocument } from '../schemasMongo/order.schema';
import { Table, TableDocument } from '../schemasMongo/table.schema';
import { PaySaleDto } from './dto/pay-sale.dto';
import { TablesService } from 'src/tables/tables.service';
import { CashierGateway } from 'src/gateways/cashier.gateway';
import { normalizeId, isPopulatedTable, normalizeIdStrict } from 'src/common/utils/normalizeId';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    private readonly tablesService: TablesService,
    private readonly cashierGateway: CashierGateway,
  ) { }

  async getAllSales(): Promise<SaleResponseDto[]> {
    try {
      const sales = await this.saleModel
        .find()
        .populate('table')
        .populate({
          path: 'orders',
          model: 'Order',
          populate: [
            { path: 'items.recipe', model: 'Recipe' },
            { path: 'table', model: 'Table', select: 'number' },
          ],
        });
      return (sales ?? []).map((sale: any) => ({
        id: sale?._id?.toString?.() ?? '',
        totalAmount: sale?.totalAmount ?? 0,
        orders: (sale?.orders ?? []).map((order: any) => {
          const items = (order?.items ?? []).map((item: any) => ({
            recipe: item?.recipe?.name ?? '—',
            quantity: item?.quantity ?? 0,
            price: item?.recipe?.price ?? 0,
            notes: item?.notes ?? undefined,
          }));
          return {
            items,
            tableNumber:
              order?.table?.number ??
              sale?.table?.number ??
              order?.tableNumber ??
              undefined,
            total: order?.total ??
              items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0),
          };
        }),
        folio: sale?.folio ?? '—',
        orderType: sale?.orderType,
        paymentMethod: sale?.paymentMethod,
        date: sale?.date ?? undefined,
        tableId: sale?.table?._id,
            table: sale?.table ? { number: sale.table.number } : null,

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

      if (query.table) {
        const s = String(query.table);
        mongoQuery.table = Types.ObjectId.isValid(s)
          ? new Types.ObjectId(s)
          : new Types.ObjectId('000000000000000000000000'); // fuerza 0 resultados si es inválido
      }

      if (mongoQuery._id && Types.ObjectId.isValid(String(mongoQuery._id))) {
        await this.recomputeSaleTotal(String(query._id));
      }

      const sales = await this.saleModel
        .find(mongoQuery)
        .populate('table')
        .populate({
          path: 'orders',
          model: 'Order',
          populate: [
            {
              path: 'items.recipe',
              model: 'Recipe'
            }, {
              path: 'table',
              model: 'Table',
              select: 'number'
            },
          ],
        });

      return (sales || []).map((sale: any) => {
        const orders = Array.isArray(sale.orders) ? sale.orders : [];

        return {
          id: sale._id.toString(),
          totalAmount: sale.totalAmount ?? 0,
          orders: orders.map((order: any) => {
            const rawItems = Array.isArray(order.items) ? order.items : [];
            const items = rawItems.map((item: any) => ({
              recipe: item?.recipe?.name ?? '—',
              quantity: item?.quantity ?? 0,
              price: item?.recipe?.price ?? 0,
              notes: item?.notes ?? undefined,
            }));

            const total =
              typeof order.total === 'number'
                ? order.total
                : items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

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
              table: sale?.table ? { number: sale.table.number } : null,

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
        const items = (order?.items ?? []).map((item: any) => ({
          recipe: item?.recipe?.name ?? '—',
          quantity: item?.quantity ?? 0,
          price: item?.recipe?.price ?? 0,
          notes: item?.notes ?? undefined,
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
            table: sale?.table ? { number: sale.table.number } : null,

      };
    } catch (e) {
      throw e;
    }
  }

  async createSale(dto: CreateSaleDto) {
    try {
      const orderType = dto.orderType ?? 'local';

      if (orderType === 'local') {
        if (!dto.table) {
          throw new ConflictException('Para venta "comer aqui" debes indicar una mesa');
        }

        const existingSale = await this.saleModel.findOne({
          table: dto.table,
          status: { $in: ['unpaid', 'partial'] },
        });
        if (existingSale) {
          throw new ConflictException('Ya existe una venta pendiente para esta mesa');
        }
      }
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

      if (!sale)
        throw new NotFoundException('Venta no encontrada');
      if (sale.status === 'paid')
        throw new ConflictException('La venta ya ha sido pagada');

      const { orderType, paymentMethod } = body ?? ({} as PaySaleDto);
      if (!orderType || !paymentMethod) {
        throw new ConflictException('orderType y paymentMethod son obligatorios al pagar');
      }

      const pending = await this.orderModel.exists({
        _id: { $in: sale.orders as any[] },
        status: { $ne: 'delivered' },
      });
      if (pending)
        throw new ConflictException('No puedes pagar: hay items pendientes');

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
      console.log('[paySale] about to free table. raw sale.table =', sale.table);
console.log('[paySale] normalizeId(sale.table) =', normalizeId(sale.table));

      const tableId = normalizeIdStrict(sale.table);
      this.cashierGateway.emitSalePaid({ saleId: sale._id.toString() });

      if (tableId) {
        await this.tablesService.updateTableStatus(tableId, { status: 'disponible' });
      }

      return { message: 'Venta pagada, órdenes entregadas y mesa liberada' };
    } catch (e) {
      throw e;
    }
  }

  async recomputeSaleTotal(saleId: Types.ObjectId | string): Promise<number> {
    try {
      const _id = typeof saleId === 'string' ? new Types.ObjectId(saleId) : saleId;

      const sale = await this.saleModel.findById(_id).populate({ path: 'orders', model: 'Order' });
      if (!sale) throw new NotFoundException('Venta no encontrada');

      const totals = await this.orderModel.aggregate([
        { $match: { _id: { $in: sale.orders.map((o: any) => o._id ?? o) } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]);

      const totalAmount = totals[0]?.total ?? 0;
      sale.totalAmount = Number(totalAmount.toFixed(2));
      await sale.save();

      return sale.totalAmount;
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  async requestTicket(id: string) {
    try {
      const sale = await this.saleModel.findByIdAndUpdate(
        id,
        { $set: { ticketStatus: 'requested', requestedAt: new Date() } },
        { new: true }
      ).populate('table');


      if (!sale) throw new NotFoundException('Venta no encontrada');
      const tableId = sale.table ? normalizeId(sale.table) : undefined;
      const tableNumber = isPopulatedTable(sale.table) ? sale.table.number : undefined;

      console.log('--- SALESSERVICE SOCKET CASHIER --- emit ticket requested:')
      this.cashierGateway.emitTicketRequested({
        saleId: sale._id.toString(),
        tableId,
        tableNumber,
        requestedAt: sale.requestedAt?.getTime?.(),
      });

      return { ok: true };
    } catch (e) {
      throw new BadRequestException(e)
    }
  }

  async markPrinted(id: string) {
    try {
      const sale = await this.saleModel.findByIdAndUpdate(
        id,
        { $set: { ticketStatus: 'printed', ticketPrintedAt: new Date() } },
        { new: true }
      );
      if (!sale) throw new NotFoundException('Venta no encontrada');
      this.cashierGateway.emitTicketPrinted({ saleId: sale._id.toString() }); return { ok: true };
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  async getTicketQueue(ticketStatus: 'requested' | 'printed' = 'requested') {
    try {
      const rows = await this.saleModel.find({
        status: { $in: ['unpaid', 'partial'] },
        ticketStatus
      })
        .populate('table')
        .sort({ requestedAt: -1 })
        .limit(100);


      return rows.map(s => ({
        id: s._id.toString(),
        tableId: normalizeId(s.table),
        tableNumber: isPopulatedTable(s.table),
        requestedAt: s.requestedAt,
      }));
    } catch (e) {
      throw new BadRequestException(e);
    }
  }


}
