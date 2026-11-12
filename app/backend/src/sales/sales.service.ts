import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
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
import { AuthService } from 'src/auth/auth.service';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { PromotionsService } from 'src/promotions/promotions.service';
import { OrdersService } from 'src/orders/orders.service';

import { Restaurant, RestaurantDocument } from '../schemasMongo/restaurant.schema';
import * as PDFDocumentRaw from 'pdfkit';
const PDFDocument: any = (PDFDocumentRaw as any).default || PDFDocumentRaw;

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    private readonly tablesService: TablesService,
    private readonly cashierGateway: CashierGateway,
    private readonly authService: AuthService,
    private readonly promotionsService: PromotionsService,
    @Inject(forwardRef(() => OrdersService)) private readonly ordersService: OrdersService,
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
            recipeId: item?.recipe?._id?.toString?.() ?? (item?.recipe?.id ? String(item.recipe.id) : undefined),
            category: item?.recipe?.category ?? '',
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
        status: sale?.status,
        cancelReason: sale?.cancelReason,
        cancelledBy: sale?.cancelledBy,
        cancelledAt: sale?.cancelledAt,
        isFacturada: Boolean(sale?.isFacturada || sale?.invoiceId),
        invoiceId: sale?.invoiceId?.toString?.() ?? undefined,
        discountAmount: sale?.discountAmount ?? 0,
        promotionApplied: sale?.promotionApplied ?? undefined,
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
        const unpaidSale = await this.saleModel.findOne({ table: mongoQuery.table, status: 'unpaid' });
        if (unpaidSale) {
          await this.recomputeSaleTotal(unpaidSale._id.toString());
        }
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
        const nonCancelledOrders = orders.filter((order: any) => order?.status !== 'cancelled');

        return {
          id: sale._id.toString(),
          totalAmount: sale.totalAmount ?? 0,
          orders: nonCancelledOrders.map((order: any) => {
            const rawItems = Array.isArray(order.items) ? order.items : [];
            const items = rawItems
              .filter((item: any) => item?.status !== 'cancelled')
              .map((item: any) => ({
                id: item?._id?.toString?.(),
                itemId: item?._id?.toString?.(),
                recipe: item?.recipe?.name ?? '—',
                recipeId: item?.recipe?._id?.toString?.() ?? (item?.recipe?.id ? String(item.recipe.id) : undefined),
                category: item?.recipe?.category ?? '',
                quantity: item?.quantity ?? 0,
                price: item?.recipe?.price ?? 0,
                notes: item?.notes ?? undefined,
                status: item?.status,
              }));

            const total =
              typeof order.total === 'number'
                ? order.total
                : items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

            return {
              id: order?._id?.toString?.(),
              status: order?.status,
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
          status: sale.status,
          cancelReason: sale.cancelReason,
          cancelledBy: sale.cancelledBy,
          cancelledAt: sale.cancelledAt,
          isFacturada: Boolean(sale.isFacturada || sale.invoiceId),
          invoiceId: sale.invoiceId?.toString?.() ?? undefined,
          discountAmount: sale.discountAmount ?? 0,
          promotionApplied: sale.promotionApplied ?? undefined,
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

      const rawOrders = Array.isArray(sale?.orders) ? sale.orders : [];
      const nonCancelledOrders = rawOrders.filter((order: any) => order?.status !== 'cancelled');

      const orders = nonCancelledOrders.map((order: any) => {
        const rawItems = Array.isArray(order?.items) ? order.items : [];
        const items = rawItems
          .filter((item: any) => item?.status !== 'cancelled')
          .map((item: any) => ({
            id: item?._id?.toString?.(),
            itemId: item?._id?.toString?.(),
            recipe: item?.recipe?.name ?? '—',
            recipeId: item?.recipe?._id?.toString?.() ?? (item?.recipe?.id ? String(item.recipe.id) : undefined),
            category: item?.recipe?.category ?? '',
            quantity: item?.quantity ?? 0,
            price: item?.recipe?.price ?? 0,
            notes: item?.notes ?? undefined,
            status: item?.status,
          }));

        return {
          id: order?._id?.toString?.(),
          status: order?.status,
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
        status: sale?.status,
        cancelReason: sale?.cancelReason,
        cancelledBy: sale?.cancelledBy,
        cancelledAt: sale?.cancelledAt,
        isFacturada: Boolean(sale?.isFacturada || sale?.invoiceId),
        invoiceId: sale?.invoiceId?.toString?.() ?? undefined,
        discountAmount: sale?.discountAmount ?? 0,
        promotionApplied: sale?.promotionApplied ?? undefined,
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
      const sale = await this.getSaleById(saleId);

      if (!sale) {
        throw new Error('Venta no encontrada');
      }

      const printerUrl = process.env.PRINTER_SERVICE_URL || 'http://localhost:5000/print';
      const printRes = await fetch(printerUrl, {
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
        status: { $nin: ['delivered', 'cancelled'] },
      });
      if (pending)
        throw new ConflictException('No puedes pagar: hay items pendientes');

      const nonCancelledOrders = (sale.orders as unknown as OrderDocument[]).filter(
        (o) => o.status !== 'cancelled'
      );
      await Promise.all(
        nonCancelledOrders.map(async (order) => {
          order.status = 'delivered';
          if (Array.isArray(order.items)) {
            order.items.forEach((it: any) => {
              if (it.status !== 'cancelled') {
                it.status = 'delivered';
              }
            });
          }
          await order.save();
        })
      );

      sale.status = 'paid';
      sale.date = new Date();
      sale.orderType = orderType;
      sale.paymentMethod = paymentMethod;

      // Base contable autorizada calculada desde el servidor (excluyendo órdenes canceladas)
      const totals = await this.orderModel.aggregate([
        { $match: { _id: { $in: sale.orders.map((o: any) => o._id ?? o) }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]);
      const baseSubtotal = Number((totals[0]?.total ?? sale.totalAmount ?? 0).toFixed(2));

      // Si se especificó una promoción, validar y calcular estrictamente en el backend
      const targetPromoId = body.promotionId || body.promotionApplied?.promotionId;

      if (targetPromoId) {
        const populatedSale = await this.saleModel
          .findById(saleId)
          .populate({
            path: 'orders',
            model: 'Order',
            populate: { path: 'items.recipe', model: 'Recipe' },
          });

        const promoCalc = await this.promotionsService.calculateDiscountForSale(
          populatedSale,
          targetPromoId
        );

        if (promoCalc.isEligible && promoCalc.discountAmount > 0) {
          const promoDoc = await this.promotionsService.getPromotionById(targetPromoId).catch(() => null);
          const authorizedBy = body.authorizedBy || body.promotionApplied?.authorizedBy;
          const authReason = body.authReason || body.promotionApplied?.authReason;

          if (promoDoc?.requiresAuth && !authorizedBy) {
            throw new BadRequestException('Esta promoción requiere autorización explícita del personal (usuario y motivo).');
          }

          sale.discountAmount = promoCalc.discountAmount;
          sale.promotionApplied = {
            promotionId: promoCalc.promotionId,
            name: promoCalc.name,
            code: promoCalc.code,
            type: promoCalc.type,
            discountAmount: promoCalc.discountAmount,
            baseAmount: promoCalc.eligibleSubtotal,
            rule: promoCalc.rule,
            benefitedItems: promoCalc.benefitedItems,
            appliedAt: promoCalc.appliedAt,
            authorizedBy,
            authReason,
          };
          sale.totalAmount = Math.max(0, Number((baseSubtotal - promoCalc.discountAmount).toFixed(2)));
        } else {
          if (body.discountAmount && body.discountAmount > 0) {
            throw new BadRequestException(
              promoCalc.ineligibilityReason || 'La promoción seleccionada no aplica a los productos de esta cuenta'
            );
          }
          sale.discountAmount = 0;
          sale.promotionApplied = undefined;
          sale.totalAmount = baseSubtotal;
        }
      } else if (body.discountAmount && body.discountAmount > 0) {
        sale.discountAmount = Math.min(body.discountAmount, baseSubtotal);
        sale.promotionApplied = undefined;
        sale.totalAmount = Math.max(0, Number((baseSubtotal - sale.discountAmount).toFixed(2)));
      } else {
        sale.discountAmount = 0;
        sale.promotionApplied = undefined;
        sale.totalAmount = baseSubtotal;
      }

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

  async calculatePromotionForSale(saleId: string, promotionId: string) {
    if (!Types.ObjectId.isValid(saleId)) {
      throw new BadRequestException('ID de venta inválido');
    }

    const sale = await this.saleModel
      .findById(saleId)
      .populate({
        path: 'orders',
        model: 'Order',
        populate: [
          { path: 'items.recipe', model: 'Recipe' },
          { path: 'table', model: 'Table', select: 'number' },
        ],
      })
      .populate('table');

    if (!sale) throw new NotFoundException('Venta no encontrada');

    return this.promotionsService.calculateDiscountForSale(sale, promotionId);
  }

  async recomputeSaleTotal(saleId: Types.ObjectId | string): Promise<number> {
    try {
      const _id = typeof saleId === 'string' ? new Types.ObjectId(saleId) : saleId;

      const sale = await this.saleModel.findById(_id).populate({ path: 'orders', model: 'Order' });
      if (!sale) throw new NotFoundException('Venta no encontrada');

      const totals = await this.orderModel.aggregate([
        { 
          $match: { 
            _id: { $in: sale.orders.map((o: any) => o._id ?? o) },
            status: { $ne: 'cancelled' } 
          } 
        },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]);

      const baseSubtotal = Number((totals[0]?.total ?? 0).toFixed(2));
      let effectiveDiscount = sale.discountAmount || 0;
      if (sale.promotionApplied?.discountAmount) {
        effectiveDiscount = sale.promotionApplied.discountAmount;
      }
      effectiveDiscount = Math.min(effectiveDiscount, baseSubtotal);
      sale.totalAmount = Math.max(0, Number((baseSubtotal - effectiveDiscount).toFixed(2)));
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

  async cancelSale(saleId: string, dto: CancelSaleDto) {
    try {
      // 1. Validar credenciales de gerente
      const managerAuth = await this.authService.verifyManager({
        username: dto.username,
        password: dto.password,
      });

      // 2. Buscar venta
      const sale = await this.saleModel.findById(saleId).populate('table');
      if (!sale) throw new NotFoundException('Venta no encontrada');

      if (sale.status === 'cancelled') {
        throw new ConflictException('Esta cuenta ya ha sido cancelada previamente');
      }

      // 3. Marcar como cancelada y auditar
      sale.status = 'cancelled';
      sale.cancelReason = dto.reason;
      sale.cancelledBy = `${managerAuth.manager.name} (@${managerAuth.manager.username})`;
      sale.cancelledAt = new Date();
      await sale.save();

      // 4. Cancelar órdenes asociadas y restituir insumos al inventario
      if (Array.isArray(sale.orders) && sale.orders.length > 0) {
        const orderDocs = await this.orderModel.find({
          _id: { $in: sale.orders as any[] },
          status: { $ne: 'cancelled' },
        });

        for (const ord of orderDocs) {
          ord.status = 'cancelled';
          if (Array.isArray(ord.items)) {
            ord.items.forEach((it: any) => {
              it.status = 'cancelled';
            });
          }
          await ord.save();

          if (this.ordersService && Array.isArray(ord.items)) {
            await this.ordersService.restoreStockForItems(
              ord.items,
              ord._id.toString(),
              `Restitución por cancelación de cuenta ${sale.folio || sale._id}`,
              managerAuth.manager.username,
            );
          }
        }
      }

      // 5. Liberar mesa si estaba ocupada
      const tableId = normalizeIdStrict(sale.table);
      if (tableId) {
        await this.tablesService.updateTableStatus(tableId, { status: 'disponible' });
      }

      // 6. Emitir socket para caja y mesas
      this.cashierGateway.emitSalePaid({ saleId: sale._id.toString() });

      return {
        message: 'Cuenta cancelada exitosamente por el gerente',
        sale: {
          id: sale._id.toString(),
          status: sale.status,
          cancelReason: sale.cancelReason,
          cancelledBy: sale.cancelledBy,
          cancelledAt: sale.cancelledAt,
        },
      };
    } catch (e) {
      throw e;
    }
  }

  /**
   * Obtiene los datos del Corte de Caja del día respetando la zona horaria (America/Mexico_City).
   * Solo contabiliza ingresos efectivamente cobrados y separa la actividad de cocina por estación.
   */
  async getCashCutData(dateStr?: string) {
    const timezone = 'America/Mexico_City';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const targetDateStr = dateStr || formatter.format(now);
    const start = new Date(`${targetDateStr}T00:00:00.000-06:00`);
    const end = new Date(`${targetDateStr}T23:59:59.999-06:00`);

    const restaurant = await this.restaurantModel.findOne().exec();
    const restaurantName = restaurant?.name || 'Restaurante POS';

    // 1. Obtener ventas del día (excluyendo canceladas)
    const sales = await this.saleModel
      .find({
        status: { $ne: 'cancelled' },
        $or: [
          { date: { $gte: start, $lte: end } },
          { createdAt: { $gte: start, $lte: end }, date: { $exists: false } },
        ],
      })
      .populate('table', 'number')
      .populate({
        path: 'orders',
        model: 'Order',
        populate: { path: 'items.recipe', model: 'Recipe' },
      })
      .sort({ date: -1, createdAt: -1 })
      .exec();

    // 2. Agrupación A: Ventas por método de pago (solo efectivamente cobradas)
    const paymentMethodsMap: Record<string, { total: number; count: number; label: string }> = {
      efectivo: { total: 0, count: 0, label: 'Efectivo' },
      tarjeta: { total: 0, count: 0, label: 'Tarjeta de Débito/Crédito' },
      transferencia: { total: 0, count: 0, label: 'Transferencia Bancaria' },
    };

    // Agrupación B: Ventas por modalidad
    const orderTypesMap: Record<string, { total: number; count: number; label: string }> = {
      local: { total: 0, count: 0, label: 'Comer en Restaurante (Local)' },
      'para llevar': { total: 0, count: 0, label: 'Para Llevar' },
      domicilio: { total: 0, count: 0, label: 'Servicio a Domicilio' },
      evento: { total: 0, count: 0, label: 'Eventos / Especiales' },
    };

    let totalCollectedRevenue = 0;
    let totalDiscounts = 0;
    const paidSales = sales.filter((s) => s.status === 'paid' || s.status === 'partial');

    for (const sale of paidSales) {
      let amountPaid = 0;
      if (sale.status === 'paid') {
        amountPaid = Number(sale.totalAmount || 0);
      } else if (sale.status === 'partial') {
        amountPaid = Number((sale as any).paidAmount || 0);
      }
      if (amountPaid < 0) amountPaid = 0;

      if (sale.discountAmount) {
        totalDiscounts += Number(sale.discountAmount || 0);
      }

      // Desglose de método de pago
      const paymentsList = (sale as any).payments;
      if (Array.isArray(paymentsList) && paymentsList.length > 0) {
        for (const p of paymentsList) {
          const methodKey = (p.method || 'efectivo').toLowerCase().trim();
          const pAmount = Number(p.amount || 0);
          if (!paymentMethodsMap[methodKey]) {
            paymentMethodsMap[methodKey] = { total: 0, count: 0, label: methodKey.toUpperCase() };
          }
          paymentMethodsMap[methodKey].total += pAmount;
          paymentMethodsMap[methodKey].count += 1;
          totalCollectedRevenue += pAmount;
        }
      } else {
        const methodKey = (sale.paymentMethod || 'efectivo').toLowerCase().trim();
        if (!paymentMethodsMap[methodKey]) {
          paymentMethodsMap[methodKey] = { total: 0, count: 0, label: methodKey.toUpperCase() };
        }
        paymentMethodsMap[methodKey].total += amountPaid;
        paymentMethodsMap[methodKey].count += 1;
        totalCollectedRevenue += amountPaid;
      }

      // Desglose de modalidad
      const typeKey = (sale.orderType || 'local').toLowerCase().trim();
      if (!orderTypesMap[typeKey]) {
        orderTypesMap[typeKey] = { total: 0, count: 0, label: typeKey };
      }
      orderTypesMap[typeKey].total += amountPaid;
      const orderCountForSale = Array.isArray(sale.orders) && sale.orders.length > 0
        ? sale.orders.filter((o: any) => o?.status !== 'cancelled').length
        : 1;
      orderTypesMap[typeKey].count += orderCountForSale;
    }

    // 3. Actividad de cocina: órdenes registradas hoy
    const ordersOfDay = await this.orderModel
      .find({
        status: { $ne: 'cancelled' },
        createdAt: { $gte: start, $lte: end },
      })
      .populate('items.recipe', 'name station price')
      .exec();

    let coldComandasCount = 0;
    let hotComandasCount = 0;
    let ordersWithColdCount = 0;
    let ordersWithHotCount = 0;
    let coldDishesCount = 0;
    let hotDishesCount = 0;

    for (const ord of ordersOfDay) {
      const activeItems = (ord.items || []).filter((it: any) => it?.status !== 'cancelled');
      let orderHasCold = false;
      let orderHasHot = false;

      for (const it of activeItems) {
        const rec = it.recipe as any;
        const station = (it as any).station || rec?.station || 'ninguna';
        const qty = Number(it.quantity || 1);

        if (station === 'fria') {
          orderHasCold = true;
          coldDishesCount += qty;
        } else if (station === 'caliente') {
          orderHasHot = true;
          hotDishesCount += qty;
        }
      }

      if (orderHasCold) {
        coldComandasCount += 1;
        ordersWithColdCount += 1;
      }
      if (orderHasHot) {
        hotComandasCount += 1;
        ordersWithHotCount += 1;
      }
    }

    const totalComandasCount = coldComandasCount + hotComandasCount;
    const totalOrdersCount = ordersOfDay.length;
    const totalDishesCount = coldDishesCount + hotDishesCount;

    // Métricas estructuradas por método de pago con porcentajes
    const paymentItems = Object.entries(paymentMethodsMap).map(([method, data]) => ({
      method,
      label: data.label,
      total: Number(data.total.toFixed(2)),
      transactionsCount: data.count,
      percentage: totalCollectedRevenue > 0 ? Number(((data.total / totalCollectedRevenue) * 100).toFixed(1)) : 0,
    }));

    // Métricas estructuradas por modalidad
    const totalModalitiesAmount = Object.values(orderTypesMap).reduce((sum, v) => sum + v.total, 0);
    const orderTypeItems = Object.entries(orderTypesMap).map(([orderType, data]) => ({
      orderType,
      label: data.label,
      total: Number(data.total.toFixed(2)),
      ordersCount: data.count,
      percentage: totalModalitiesAmount > 0 ? Number(((data.total / totalModalitiesAmount) * 100).toFixed(1)) : 0,
    }));

    const totalTransactions = paymentItems.reduce((acc, p) => acc + p.transactionsCount, 0);
    const totalOrders = orderTypeItems.reduce((acc, o) => acc + o.ordersCount, 0);
    const averageTicket = totalTransactions > 0 ? Number((totalCollectedRevenue / totalTransactions).toFixed(2)) : 0;

    // Lista de ventas para la tabla de detalle
    const recentSales = paidSales.map((s: any) => {
      const saleDate = s.date || s.createdAt || new Date();
      return {
        id: s._id.toString(),
        folio: s.folio || '—',
        tableNumber: s.table?.number ?? 'S/N',
        orderType: s.orderType || 'local',
        paymentMethod: s.paymentMethod || 'efectivo',
        status: s.status,
        totalAmount: Number((s.totalAmount || 0).toFixed(2)),
        discountAmount: Number((s.discountAmount || 0).toFixed(2)),
        date: saleDate,
        time: new Date(saleDate).toLocaleTimeString('es-MX', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }),
      };
    });

    const dateFormatted = new Intl.DateTimeFormat('es-MX', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(start);

    const generatedAtFormatted = new Intl.DateTimeFormat('es-MX', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(now);

    return {
      restaurantName,
      date: targetDateStr,
      dateFormatted,
      generatedAt: now.toISOString(),
      generatedAtFormatted,
      timezone,
      summary: {
        totalRevenue: Number(totalCollectedRevenue.toFixed(2)),
        totalOrders,
        totalTransactions,
        averageTicket,
        totalDiscounts: Number(totalDiscounts.toFixed(2)),
      },
      byPaymentMethod: {
        items: paymentItems,
        totalRevenue: Number(totalCollectedRevenue.toFixed(2)),
        totalTransactions,
      },
      byOrderType: {
        items: orderTypeItems,
        totalAmount: Number(totalModalitiesAmount.toFixed(2)),
        totalOrders,
      },
      kitchenActivity: {
        coldComandasCount,
        hotComandasCount,
        ordersWithColdCount,
        ordersWithHotCount,
        coldDishesCount,
        hotDishesCount,
        totalComandasCount,
        totalOrdersCount,
        totalDishesCount,
      },
      recentSales,
    };
  }

  /**
   * Genera el documento PDF descargable del corte de caja diario.
   * Utiliza exactamente los mismos datos y cálculos de getCashCutData.
   * Diseño administrativo limpio, claro y estructurado en tablas bien alineadas.
   */
  async generateCashCutPdf(dateStr?: string): Promise<Buffer> {
    const data = await this.getCashCutData(dateStr);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = 612;
      const leftMargin = 40;
      const contentWidth = 532;
      const rightEdge = leftMargin + contentWidth;

      // ==========================================
      // 1. ENCABEZADO ADMINISTRATIVO
      // ==========================================
      let curY = 40;

      // Nombre del restaurante
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(16).text(data.restaurantName.toUpperCase(), leftMargin, curY);
      // Título oficial
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(12).text('Corte de caja', leftMargin, curY + 20);
      doc.fillColor('#6b7280').font('Helvetica').fontSize(8.5).text(`Resumen diario de operaciones • ${data.dateFormatted}`, leftMargin, curY + 35);

      // Metadatos alineados a la derecha
      const metaWidth = 200;
      const metaX = rightEdge - metaWidth;
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8.5).text('Fecha del corte:', metaX, curY + 4, { width: metaWidth, align: 'right' });
      doc.fillColor('#111827').font('Helvetica').fontSize(8.5).text(data.date, metaX, curY + 15, { width: metaWidth, align: 'right' });
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8.5).text('Fecha y hora de generación:', metaX, curY + 27, { width: metaWidth, align: 'right' });
      doc.fillColor('#111827').font('Helvetica').fontSize(8.5).text(`${data.generatedAtFormatted} (${data.timezone})`, metaX, curY + 38, { width: metaWidth, align: 'right' });

      curY = 92;
      doc.strokeColor('#d1d5db').lineWidth(1).moveTo(leftMargin, curY).lineTo(rightEdge, curY).stroke();

      // ==========================================
      // 2. RESUMEN GENERAL (INDICADORES CLAVE)
      // ==========================================
      curY += 12;
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9.5).text('RESUMEN GENERAL', leftMargin, curY);

      curY += 14;
      const colW = contentWidth / 4;
      const summaryItems = [
        { label: 'Total de Ingresos', val: `$${data.summary.totalRevenue.toFixed(2)}` },
        { label: 'Ventas Realizadas', val: `${data.summary.totalTransactions} transacciones` },
        { label: 'Pedidos Atendidos', val: `${data.summary.totalOrders} pedidos` },
        { label: 'Ticket Promedio', val: `$${data.summary.averageTicket.toFixed(2)}` },
      ];

      doc.rect(leftMargin, curY, contentWidth, 34).fillAndStroke('#f9fafb', '#e5e7eb');
      summaryItems.forEach((item, idx) => {
        const itemX = leftMargin + idx * colW;
        doc.fillColor('#6b7280').font('Helvetica').fontSize(7.5).text(item.label.toUpperCase(), itemX + 8, curY + 6);
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11).text(item.val, itemX + 8, curY + 18);
        if (idx > 0) {
          doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(itemX, curY).lineTo(itemX, curY + 34).stroke();
        }
      });

      curY += 46;

      // ==========================================
      // 3. DESGLOSE POR MÉTODO DE PAGO
      // ==========================================
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9.5).text('DESGLOSE POR MÉTODO DE PAGO', leftMargin, curY);
      curY += 14;

      // Encabezado de tabla
      doc.rect(leftMargin, curY, contentWidth, 18).fillAndStroke('#f3f4f6', '#d1d5db');
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8);
      doc.text('Método de Pago', leftMargin + 8, curY + 5);
      doc.text('Transacciones', leftMargin + 200, curY + 5, { width: 90, align: 'center' });
      doc.text('% del Total', leftMargin + 300, curY + 5, { width: 90, align: 'center' });
      doc.text('Importe Total', leftMargin + 400, curY + 5, { width: 124, align: 'right' });

      curY += 18;
      doc.font('Helvetica').fontSize(8);

      data.byPaymentMethod.items.forEach((item, i) => {
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(leftMargin, curY, contentWidth, 17).fillAndStroke(rowBg, '#e5e7eb');
        doc.fillColor('#1f2937').text(item.label, leftMargin + 8, curY + 4);
        doc.text(String(item.transactionsCount), leftMargin + 200, curY + 4, { width: 90, align: 'center' });
        doc.text(`${item.percentage.toFixed(1)}%`, leftMargin + 300, curY + 4, { width: 90, align: 'center' });
        doc.font('Helvetica-Bold').text(`$${item.total.toFixed(2)}`, leftMargin + 400, curY + 4, { width: 124, align: 'right' });
        doc.font('Helvetica');
        curY += 17;
      });

      // Total fila pago
      doc.rect(leftMargin, curY, contentWidth, 18).fillAndStroke('#e5e7eb', '#d1d5db');
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8.5);
      doc.text('TOTAL POR MÉTODO DE PAGO', leftMargin + 8, curY + 5);
      doc.text(String(data.byPaymentMethod.totalTransactions), leftMargin + 200, curY + 5, { width: 90, align: 'center' });
      doc.text('100.0%', leftMargin + 300, curY + 5, { width: 90, align: 'center' });
      doc.text(`$${data.byPaymentMethod.totalRevenue.toFixed(2)}`, leftMargin + 400, curY + 5, { width: 124, align: 'right' });

      curY += 30;

      // ==========================================
      // 4. DESGLOSE POR MODALIDAD DE PEDIDO
      // ==========================================
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9.5).text('DESGLOSE POR MODALIDAD DEL PEDIDO', leftMargin, curY);
      curY += 14;

      doc.rect(leftMargin, curY, contentWidth, 18).fillAndStroke('#f3f4f6', '#d1d5db');
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8);
      doc.text('Modalidad', leftMargin + 8, curY + 5);
      doc.text('Cantidad de Pedidos', leftMargin + 200, curY + 5, { width: 90, align: 'center' });
      doc.text('% de Participación', leftMargin + 300, curY + 5, { width: 90, align: 'center' });
      doc.text('Importe Total', leftMargin + 400, curY + 5, { width: 124, align: 'right' });

      curY += 18;
      doc.font('Helvetica').fontSize(8);

      data.byOrderType.items.forEach((item, i) => {
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(leftMargin, curY, contentWidth, 17).fillAndStroke(rowBg, '#e5e7eb');
        doc.fillColor('#1f2937').text(item.label, leftMargin + 8, curY + 4);
        doc.text(String(item.ordersCount), leftMargin + 200, curY + 4, { width: 90, align: 'center' });
        doc.text(`${item.percentage.toFixed(1)}%`, leftMargin + 300, curY + 4, { width: 90, align: 'center' });
        doc.font('Helvetica-Bold').text(`$${item.total.toFixed(2)}`, leftMargin + 400, curY + 4, { width: 124, align: 'right' });
        doc.font('Helvetica');
        curY += 17;
      });

      // Total fila modalidad
      doc.rect(leftMargin, curY, contentWidth, 18).fillAndStroke('#e5e7eb', '#d1d5db');
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8.5);
      doc.text('TOTAL POR MODALIDAD', leftMargin + 8, curY + 5);
      doc.text(String(data.byOrderType.totalOrders), leftMargin + 200, curY + 5, { width: 90, align: 'center' });
      doc.text('100.0%', leftMargin + 300, curY + 5, { width: 90, align: 'center' });
      doc.text(`$${data.byOrderType.totalAmount.toFixed(2)}`, leftMargin + 400, curY + 5, { width: 124, align: 'right' });

      curY += 30;

      // ==========================================
      // 5. ACTIVIDAD DE COCINA POR ESTACIONES
      // ==========================================
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9.5).text('ACTIVIDAD DE COCINA POR ESTACIONES', leftMargin, curY);
      curY += 14;

      doc.rect(leftMargin, curY, contentWidth, 18).fillAndStroke('#f3f4f6', '#d1d5db');
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8);
      doc.text('Estación de Cocina', leftMargin + 8, curY + 5);
      doc.text('Comandas Generadas', leftMargin + 200, curY + 5, { width: 100, align: 'center' });
      doc.text('Pedidos con Estación', leftMargin + 310, curY + 5, { width: 100, align: 'center' });
      doc.text('Platillos Preparados', leftMargin + 420, curY + 5, { width: 104, align: 'right' });

      curY += 18;
      doc.font('Helvetica').fontSize(8);

      const kitchenRows = [
        {
          station: 'Cocina Fría (Sushi, Sashimi, Ceviche, Barra)',
          comandas: data.kitchenActivity.coldComandasCount,
          orders: data.kitchenActivity.ordersWithColdCount,
          dishes: data.kitchenActivity.coldDishesCount,
        },
        {
          station: 'Cocina Caliente (Ramen, Yakimeshi, Tempura, Wok)',
          comandas: data.kitchenActivity.hotComandasCount,
          orders: data.kitchenActivity.ordersWithHotCount,
          dishes: data.kitchenActivity.hotDishesCount,
        },
      ];

      kitchenRows.forEach((row, i) => {
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(leftMargin, curY, contentWidth, 17).fillAndStroke(rowBg, '#e5e7eb');
        doc.fillColor('#1f2937').text(row.station, leftMargin + 8, curY + 4);
        doc.text(String(row.comandas), leftMargin + 200, curY + 4, { width: 100, align: 'center' });
        doc.text(String(row.orders), leftMargin + 310, curY + 4, { width: 100, align: 'center' });
        doc.font('Helvetica-Bold').text(`${row.dishes} pzas`, leftMargin + 420, curY + 4, { width: 104, align: 'right' });
        doc.font('Helvetica');
        curY += 17;
      });

      // Total fila cocina
      doc.rect(leftMargin, curY, contentWidth, 18).fillAndStroke('#e5e7eb', '#d1d5db');
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8.5);
      doc.text('TOTAL ACTIVIDAD DE COCINA', leftMargin + 8, curY + 5);
      doc.text(`${data.kitchenActivity.totalComandasCount} comandas`, leftMargin + 200, curY + 5, { width: 100, align: 'center' });
      doc.text(`${data.kitchenActivity.totalOrdersCount} pedidos`, leftMargin + 310, curY + 5, { width: 100, align: 'center' });
      doc.text(`${data.kitchenActivity.totalDishesCount} platillos`, leftMargin + 420, curY + 5, { width: 104, align: 'right' });

      curY += 28;

      // ==========================================
      // 6. TOTALES FINALES DEL DÍA
      // ==========================================
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9.5).text('TOTALES FINALES', leftMargin, curY);
      curY += 14;

      doc.rect(leftMargin, curY, contentWidth, 26).fillAndStroke('#f0fdf4', '#86efac');
      doc.fillColor('#166534').font('Helvetica-Bold').fontSize(10).text('TOTAL GENERAL COBRADO:', leftMargin + 12, curY + 8);
      doc.fontSize(12).text(`$${data.summary.totalRevenue.toFixed(2)} MXN`, leftMargin + 350, curY + 7, { width: 170, align: 'right' });

      curY += 38;

      // ==========================================
      // 7. FIRMAS Y REGISTRO ADMINISTRATIVO
      // ==========================================
      const sigY = Math.max(curY + 20, 680);
      doc.strokeColor('#9ca3af').lineWidth(1);
      doc.moveTo(leftMargin + 30, sigY).lineTo(leftMargin + 210, sigY).stroke();
      doc.moveTo(leftMargin + 322, sigY).lineTo(leftMargin + 502, sigY).stroke();

      doc.fillColor('#374151').fontSize(8).font('Helvetica-Bold');
      doc.text('GERENTE EN TURNO', leftMargin + 30, sigY + 5, { width: 180, align: 'center' });
      doc.text('PROPIETARIO / ADMINISTRACIÓN', leftMargin + 322, sigY + 5, { width: 180, align: 'center' });
      doc.fontSize(7).font('Helvetica').fillColor('#6b7280');
      doc.text('Firma y entrega de corte', leftMargin + 30, sigY + 16, { width: 180, align: 'center' });
      doc.text('Revisión y visto bueno', leftMargin + 322, sigY + 16, { width: 180, align: 'center' });

      // Pie de página
      doc.fontSize(7).fillColor('#9ca3af').text(
        `Documento administrativo generado por el sistema POS el ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}. Cifras auditadas sin duplicidad contable.`,
        leftMargin,
        745,
        { width: contentWidth, align: 'center' }
      );

      doc.end();
    });
  }
}
