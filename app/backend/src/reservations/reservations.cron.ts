// reservations.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation, ReservationDocument } from '../schemasMongo/reservation.schema';
import { Table, TableDocument } from '../schemasMongo/table.schema';
import { Sale, SaleDocument } from '../schemasMongo/sale.schema';
import { LEAD_MIN, NOSHOW_GRACE } from '../utils/const'

@Injectable()
export class ReservationsCron {
  private readonly logger = new Logger(ReservationsCron.name);

  constructor(
    @InjectModel(Reservation.name) private reservationModel: Model<ReservationDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sweep() {
    const now = new Date();
    const leadEdge = new Date(now.getTime() + LEAD_MIN * 60000);
    const noShowEdge = new Date(now.getTime() - NOSHOW_GRACE * 60000);

    // 1) BLOQUEAR mesas en ventana (programada y empieza en <= LEAD_MIN)
    const toBlock = await this.reservationModel.find({
      status: 'programada',
      startTime: { $lte: leadEdge },
      endTime: { $gt: now },
      table: { $ne: null },
    });

    for (const r of toBlock) {
      const table = await this.tableModel.findById(r.table as Types.ObjectId);
      if (!table) continue;

      // si ya hay venta activa, no forces 'reservada' (debe estar ocupada o en uso)
      const activeSale = await this.saleModel.findOne({
        table: table._id,
        status: { $in: ['unpaid', 'partial'] },
      });
      if (activeSale) continue;

      if (table.status === 'disponible') {
        table.status = 'reservada';
        await table.save();
      }
    }

    // 2) NO-SHOW: reservas cuya hora + gracia ya pasó y siguen programadas
    const expired = await this.reservationModel.find({
      status: 'programada',
      startTime: { $lte: noShowEdge },
    });

    for (const r of expired) {
      r.status = 'no_asistencia';
      await r.save();

      if (r.table) {
        const table = await this.tableModel.findById(r.table as Types.ObjectId);
        if (table && table.status === 'reservada') {
          const activeSale = await this.saleModel.findOne({
            table: table._id,
            status: { $in: ['unpaid', 'partial'] },
          });
          if (!activeSale) {
            table.status = 'disponible';
            await table.save();
          }
        }
      }
    }
  }
}
