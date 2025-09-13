import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Table, TableDocument } from '../schemasMongo/table.schema';
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
      console.log('[updateTableStatus] raw id typeof=', typeof id, ' preview=', String(id).slice(0,80));

  const idStr = normalizeId(id); // ya extrae si viene tipo "ObjectId('...')"
  if (!isValidObjectId(idStr)) {
    throw new BadRequestException(`Invalid table id: "${String(id).slice(0,80)}"`);
  }

      
      const table = await this.tableModel.findById(idStr);
      if (!table) throw new NotFoundException('Table not found');

      if (dto.status === 'disponible' || dto.status === 'reservada') {
        const activeSale = await this.saleModel.findOne({
          table: table._id,
          status: { $in: ['unpaid', 'partial'] },
        });

        if (activeSale) {
          const hasPending =
            Array.isArray(activeSale.orders) &&
            activeSale.orders.some((o: any) => o.status !== 'delivered');

          const reason = hasPending
            ? 'hay órdenes pendientes en la venta activa'
            : 'la venta de esta mesa sigue abierta';

          throw new ConflictException(
            `No puedes ${dto.status === 'disponible' ? 'desocupar' : 'reservar'} la mesa: ${reason}. Cierra o cancela la venta primero.`,
          );
        }
      }

      if (dto.status === 'ocupada') {
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
      const prevStatus = table.status as 'disponible' | 'ocupada' | 'reservada';;
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
    try {
      const table = await this.tableModel.findById(id);
      if (!table) {
        throw new NotFoundException('Table not found');
      }

      const activeSale = await this.saleModel.findOne({
        table: table._id,
        status: 'unpaid',
      });

      if (activeSale) {
        throw new BadRequestException('Cannot release table with an active sale');
      }
      const prevStatus = table.status as 'disponible' | 'ocupada' | 'reservada';;
      table.status = 'disponible';
      await table.save();

      const load = {
        tableId: table._id.toString(),
        number: table.number,
        prevStatus,
        status: table.status as 'disponible' | 'ocupada' | 'reservada',
        at: Date.now(),
      };

      this.tablesGateway.emitTableStatusChanged(load)

      table.status = 'disponible';
      await table.save();
      return table;
    } catch (e) {
      throw new BadRequestException(e);
    }
  }
}
