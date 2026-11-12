import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Table, TableDocument } from '../schemasMongo/table.schema';
import { Order, OrderDocument } from '../schemasMongo/order.schema';
import { Reservation, ReservationDocument } from '../schemasMongo/reservation.schema';
import { Model, isValidObjectId } from 'mongoose';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { TableResponseDto } from './dto/table-response.dto';
import { Sale, SaleDocument } from '../schemasMongo/sale.schema';
import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { TablesGateway } from 'src/gateways/tables.gateway';
import { normalizeId } from 'src/common/utils/normalizeId';

@Injectable()
export class TablesService {
  constructor(
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Reservation.name) private reservationModel: Model<ReservationDocument>,
    private readonly tablesGateway: TablesGateway,
  ) { }

  async getAllTables(): Promise<TableResponseDto[]> {
    try {
      const tables = await this.tableModel.find();
      return tables.map((table) => ({
        id: table['_id'] as any,
        number: table.number,
        status: table.status,
        capacity: table.capacity,
        occupiedAt: table.occupiedAt,
      }));
    } catch (e) {
      throw new BadRequestException(e)
    }
  }

  async getTableById(id: string): Promise<TableResponseDto> {
    try {
      const table = await this.tableModel.findById(id);
      if (!table) throw new NotFoundException('Table not found');
      return {
        id: table['_id'] as any,
        number: table.number,
        status: table.status,
        capacity: table.capacity,
        occupiedAt: table.occupiedAt,
      };
    } catch (e) {
      throw e;
    }
  }

  async createTable(dto: CreateTableDto) {
    try {
      if (dto.capacity! < 1 || dto.capacity! > 8) {
        throw new BadRequestException('Capacity must be between 1 and 8');
      }
      const created = new this.tableModel(dto);
      return await created.save();
    } catch (e) {
      throw e;
    }
  }

  async updateTableStatus(
    id: string,
    dto: UpdateTableStatusDto,
  ): Promise<Table> {
    try {
      console.log('[updateTableStatus] raw id typeof=', typeof id, ' preview=', String(id).slice(0, 80));

      const idStr = normalizeId(id); // ya extrae si viene tipo "ObjectId('...')"
      if (!isValidObjectId(idStr)) {
        throw new BadRequestException(`Invalid table id: "${String(id).slice(0, 80)}"`);
      }


      const table = await this.tableModel.findById(idStr);
      if (!table) throw new NotFoundException('Table not found');

      if (dto.status === 'disponible' || dto.status === 'reservada') {
        // 1. Validar si existen órdenes activas en preparación o listas en cocina
        const pendingOrders = await this.orderModel.find({
          table: table._id,
          status: { $in: ['preparing', 'ready'] },
        });

        if (pendingOrders.length > 0) {
          throw new ConflictException(
            `No puedes ${dto.status === 'disponible' ? 'liberar' : 'reservar'} la mesa: existen ${pendingOrders.length} comanda(s) activas en preparación o pendientes de entrega.`,
          );
        }

        // 2. Validar ventas activas o consumo entregado pendiente de cobro
        const activeSale = await this.saleModel.findOne({
          table: table._id,
          status: { $in: ['unpaid', 'partial'] },
        });

        if (activeSale) {
          const saleOrderIds = (activeSale.orders || []).map((o: any) => o?._id || o);
          const nonCancelledOrders = await this.orderModel.find({
            _id: { $in: saleOrderIds },
            status: { $ne: 'cancelled' },
          });

          const hasUnsettledConsumption =
            nonCancelledOrders.length > 0 || (activeSale.totalAmount ?? 0) > 0;

          if (hasUnsettledConsumption) {
            const hasPendingDelivery = nonCancelledOrders.some((o) => o.status !== 'delivered');
            const reason = hasPendingDelivery
              ? 'existen platillos pendientes de entrega'
              : 'la mesa tiene consumo entregado sin liquidar. Debe ser cobrada o cancelada en Caja';
            throw new ConflictException(
              `No puedes ${dto.status === 'disponible' ? 'liberar' : 'reservar'} la mesa: ${reason}.`,
            );
          }

          // Si la venta no tiene comandas activas ni consumo (vaciada o todas canceladas con $0), se limpia para liberar la mesa
          if (dto.status === 'disponible') {
            await this.saleModel.findByIdAndDelete(activeSale._id);
          }
        }
      }

      if (dto.status === 'disponible') {
        table.occupiedAt = undefined;
      }

      if (dto.status === 'ocupada') {
        // Restricción: No se permite ocupar la mesa si existe una reservación activa o programada dentro de los próximos 60 minutos
        const now = new Date();
        const sixtyMinWindow = new Date(now.getTime() + 60 * 60 * 1000);
        const upcomingReservation = await this.reservationModel.findOne({
          table: table._id,
          status: 'programada',
          startTime: {
            $gte: new Date(now.getTime() - 15 * 60 * 1000),
            $lte: sixtyMinWindow,
          },
        });

        if (upcomingReservation) {
          const resTime = new Date(upcomingReservation.startTime).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          });
          throw new ConflictException(
            `No es posible ocupar la Mesa ${table.number} porque tiene una reservación programada a nombre de "${upcomingReservation.customerName || 'Cliente'}" para las ${resTime} (dentro de los próximos 60 minutos).`,
          );
        }

        table.occupiedAt = new Date();

        const existingSale = await this.saleModel.findOne({
          table: table._id,
          status: { $in: ['unpaid', 'partial'] },
        });

        if (!existingSale) {
          const folio = randomBytes(4).toString('hex').toUpperCase();
          await this.saleModel.create({
            table: table._id,
            orders: [],
            totalAmount: 0,
            status: 'unpaid',
            folio,
          });
        }
      }
      const prevStatus = table.status as 'disponible' | 'ocupada' | 'reservada';
      table.status = dto.status;
      await table.save();

      const payload = {
        tableId: table._id.toString(),
        number: table.number,
        prevStatus,
        status: table.status as 'disponible' | 'ocupada' | 'reservada',
        at: Date.now(),
      };

      this.tablesGateway.emitTableStatusChanged(payload);

      return table;
    } catch (e) {
      throw e;
    }
  }


  async searchTables(query: any): Promise<Table[]> {
    try {
      const mongoQuery: any = {};

      if (query.capacity) {
        mongoQuery.capacity = Number(query.capacity);
      }

      if (query.status) {
        mongoQuery.status = query.status;
      }

      if (query.number) {
        mongoQuery.number = Number(query.number);
      }

      return this.tableModel.find(mongoQuery);
    } catch (e) {
      throw e;
    }
  }

  async releaseTable(id: string) {
    return this.updateTableStatus(id, { status: 'disponible' });
  }
}
