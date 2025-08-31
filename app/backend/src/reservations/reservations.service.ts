import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Reservation,
  ReservationDocument,
} from '../schemasMongo/reservation.schema';
import { Table, TableDocument } from '../schemasMongo/table.schema';
import { Sale, SaleDocument } from '../schemasMongo/sale.schema';
import { CreateReservationDto } from './dtos/create-reservation.dto';
import { QueryReservationsDto } from './dtos/query-reservations.dto';
import { AssignTableDto } from './dtos/assign-table.dto';
import { randomBytes } from 'crypto';
import {toObjectId} from 'src/common/utils/toObjectId.util';
import {dayUtcRange} from 'src/common/utils/dateRange.util';
import { computeEnd } from './utils/computed-end.util';
import { mapLean, ReservationLean, ReservationDto } from './utils/reservation.map';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
    @InjectModel(Table.name)
    private readonly tableModel: Model<TableDocument>,
    @InjectModel(Sale.name)
    private readonly saleModel: Model<SaleDocument>,
  ) { }
  private static readonly LEAD_MINUTES = 15;
  private async applyLeadWindow(tableId: Types.ObjectId, start: Date, end: Date): Promise<void> {
    const now = new Date();
    const minsToStart = Math.ceil((start.getTime() - now.getTime()) / 60000);
    const inLeadWindow = minsToStart <= ReservationsService.LEAD_MINUTES && now < end;

    const t = await this.tableModel.findById(tableId);
    if (!t) return;

    if (inLeadWindow) {
      if (t.status !== 'ocupada' && t.status !== 'reservada') {
        t.status = 'reservada';
        await t.save();
      }
    } else {
      if (t.status === 'reservada') {
        const activeSale = await this.saleModel.exists({
          table: tableId,
          status: { $in: ['unpaid', 'partial'] },
        });
        if (!activeSale) {
          t.status = 'disponible';
          await t.save();
        }
      }
    }
  }

  private async assertNoOverlap(
    tableId: Types.ObjectId,
    start: Date,
    end: Date,
    ignoreId?: Types.ObjectId,
  ): Promise<void> {
    const q: Record<string, unknown> = {
      table: tableId,
      status: { $in: ['programada', 'sentada'] },
      startTime: { $lt: end },
      endTime: { $gt: start },
    };
    if (ignoreId) q._id = { $ne: ignoreId };

    const overlap = await this.reservationModel.exists(q);
    if (overlap) {
      throw new ConflictException('La mesa ya tiene una reservación en ese horario.');
    }
  }

  async findAll(q: QueryReservationsDto): Promise<ReservationDto[]> {
    const filter: Record<string, unknown> = {};
    if (q.date) {
      const { start, end } = dayUtcRange(q.date);
      filter.startTime = { $gte: start, $lte: end };
    } else if (q.from || q.to) {
      const from = q.from ? new Date(q.from) : undefined;
      const to = q.to ? new Date(q.to) : undefined;
      if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
        throw new BadRequestException('from/to inválidos');
      }
      const range: Record<string, Date> = {};
      if (from) range.$gte = from;
      if (to) range.$lte = to;
      if (Object.keys(range).length) filter.startTime = range;
    }

    if (q.table) {
      filter.table = toObjectId(q.table);
    }

    if (q.status) {
      filter.status = q.status;
    }

    const docs = await this.reservationModel
      .find(filter)
      .populate({ path: 'table', select: 'number status capacity' })
      .sort({ startTime: 1 })
      .lean<ReservationLean[]>()
      .exec();

    return docs.map((r) => mapLean(r));
  }

  async getById(id: string): Promise<ReservationDto> {
    const r = await this.reservationModel
      .findById(id)
      .populate({ path: 'table', select: 'number status capacity' })
      .lean<ReservationLean>()
      .exec();

    if (!r) throw new NotFoundException('Reservación no encontrada');
    return mapLean(r);
  }

  async create(dto: CreateReservationDto): Promise<ReservationDto> {
    const start = new Date(dto.startTime);
    if (isNaN(start.getTime())) throw new BadRequestException('startTime inválido');
    const end = computeEnd(start, dto.endTime, dto.durationMinutes);

    let tableDoc: TableDocument | null = null;
    let tableId: Types.ObjectId | undefined;

    if (dto.table) {
      tableDoc = await this.tableModel.findById(dto.table).exec();
      if (!tableDoc) throw new NotFoundException('Mesa no encontrada');
      tableId = toObjectId(tableDoc._id);

      const activeSale = await this.saleModel.exists({
        table: tableId,
        status: { $in: ['unpaid', 'partial'] },
      });
      if (activeSale) throw new ConflictException('La mesa tiene una venta activa.');

      await this.assertNoOverlap(tableId, start, end);
    }

    const created = await this.reservationModel.create({
      table: tableId,
      customerName: dto.customerName ?? '',
      phone: dto.phone ?? '',
      partySize: dto.partySize ?? (tableDoc?.capacity ?? 2),
      startTime: start,
      endTime: end,
      status: 'programada',
      notes: dto.notes ?? '',
    });

    if (tableId) {
      await this.applyLeadWindow(tableId, start, end);
    }

    return this.getById(created._id.toString());
  }

  async assignTable(id: string, dto: AssignTableDto): Promise<ReservationDto> {
    const r = await this.reservationModel.findById(id).exec();
    if (!r) throw new NotFoundException('Reservación no encontrada');

    const newTable = await this.tableModel.findById(dto.tableId).exec();
    if (!newTable) throw new NotFoundException('Mesa no encontrada');

    const newTableId = toObjectId(newTable._id);
    const hasActive = await this.saleModel.exists({
      table: newTableId,
      status: { $in: ['unpaid', 'partial'] },
    });
    if (hasActive) throw new ConflictException('La mesa tiene una venta activa.');

    await this.assertNoOverlap(newTableId, r.startTime, r.endTime, r._id);

    if (r.table) {
      const prev = await this.tableModel.findById(r.table).exec();
      if (prev && prev.status === 'reservada' && !prev._id.equals(newTable._id)) {
        prev.status = 'disponible';
        await prev.save();
      }
    }

    r.table = newTable._id;
    await r.save();
    await this.applyLeadWindow(newTable._id, r.startTime, r.endTime);

    return this.getById(id);
  }

  async seat(id: string): Promise<ReservationDto> {
    const r = await this.reservationModel.findById(id).exec();
    if (!r) throw new NotFoundException('Reservación no encontrada');
    if (!r.table) throw new ConflictException('La reservación no tiene mesa asignada');
    if (r.status === 'cancelada') throw new ConflictException('La reservación está cancelada');
    if (r.status === 'sentada') return this.getById(id);

    const table = await this.tableModel.findById(r.table).exec();
    if (!table) throw new NotFoundException('Mesa no encontrada');

    const tableId = toObjectId(table._id);

    const existingSale = await this.saleModel.exists({
      table: tableId,
      status: { $in: ['unpaid', 'partial'] },
    });

    r.status = 'sentada';
    await r.save();
    table.status = 'ocupada';
    await table.save();

    if (!existingSale) {
      const folio = randomBytes(4).toString('hex').toUpperCase();
      await this.saleModel.create({
        table: tableId,
        orders: [],
        totalAmount: 0,
        status: 'unpaid',
        folio,
      });
    }

    return this.getById(id);
  }

  async cancel(id: string): Promise<ReservationDto> {
    const r = await this.reservationModel.findById(id).exec();
    if (!r) throw new NotFoundException('Reservación no encontrada');
    if (r.status === 'cancelada') return this.getById(id);

    r.status = 'cancelada';
    await r.save();

    if (r.table) {
      const table = await this.tableModel.findById(r.table).exec();
      if (table && table.status === 'reservada') {
        const active = await this.saleModel.exists({
          table: toObjectId(table._id),
          status: { $in: ['unpaid', 'partial'] },
        });
        if (!active) {
          table.status = 'disponible';
          await table.save();
        }
      }
    }

    return this.getById(id);
  }

  async noShow(id: string): Promise<ReservationDto> {
    const r = await this.reservationModel.findById(id).exec();
    if (!r) throw new NotFoundException('Reservación no encontrada');
    if (r.status !== 'programada') {
      throw new ConflictException('Solo reservas programadas pueden marcarse como no asistencia');
    }

    r.status = 'no_asistencia';
    await r.save();

    if (r.table) {
      const table = await this.tableModel.findById(r.table).exec();
      if (table && table.status === 'reservada') {
        const active = await this.saleModel.exists({
          table: toObjectId(table._id),
          status: { $in: ['unpaid', 'partial'] },
        });
        if (!active) {
          table.status = 'disponible';
          await table.save();
        }
      }
    }

    return this.getById(id);
  }

  async getForTableOnDate(tableId: string, dateYYYYMMDD: string) {
    const { start, end } = dayUtcRange(dateYYYYMMDD);
    const r = await this.reservationModel
      .findOne({
        table: toObjectId(tableId),
        startTime: { $lt: end },
        endTime: { $gt: start },
        status: { $in: ['programada', 'sentada'] },
      })
      .populate({ path: 'table', select: 'number status capacity' })
      .lean<ReservationLean>()
      .exec();

    if (!r) {
      return { reservation: null, inLeadWindow: false, minutesToStart: null };
    }
    await this.applyLeadWindow(toObjectId(tableId), new Date(r.startTime), new Date(r.endTime));

    const now = new Date();
    const minutesToStart = Math.ceil((new Date(r.startTime).getTime() - now.getTime()) / 60000);
    const inLeadWindow = minutesToStart <= ReservationsService.LEAD_MINUTES && now < new Date(r.endTime);

    return {
      reservation: mapLean(r),
      inLeadWindow,
      minutesToStart,
    };
  }

 async getUpcoming(hours = 48, status?: 'programada' | 'sentada') {
  const now = new Date();
  const to = new Date(now.getTime() + hours * 3600000);

  const statusFilter = status ? { status } : { status: { $in: ['programada', 'sentada'] } };

  const docs = await this.reservationModel
    .find({
      startTime: { $gte: now, $lte: to },
      ...statusFilter,
    })
    .sort({ startTime: 1 })
    .populate({ path: 'table', select: 'number status capacity' })
    .lean()
    .exec();

  return docs.map((r: any) => mapLean(r));
}

}
