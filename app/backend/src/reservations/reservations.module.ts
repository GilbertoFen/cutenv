import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

import { Reservation, ReservationSchema } from '../schemasMongo/reservation.schema';
import { Table, TableSchema } from '../schemasMongo/table.schema';
import { Sale, SaleSchema } from '../schemasMongo/sale.schema';
import { ReservationsCron } from './reservations.cron';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
      { name: Table.name, schema: TableSchema },
      { name: Sale.name, schema: SaleSchema },
    ]),
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationsCron],
  exports: [ReservationsService],
})
export class ReservationsModule {}
