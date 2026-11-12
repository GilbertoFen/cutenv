import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Table, TableSchema } from '../schemasMongo/table.schema';
import { Order, OrderSchema } from '../schemasMongo/order.schema';
import { Reservation, ReservationSchema } from '../schemasMongo/reservation.schema';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { SalesModule } from '../sales/sales.module';
import { TablesGateway } from 'src/gateways/tables.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Table.name, schema: TableSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Reservation.name, schema: ReservationSchema },
    ]),
    forwardRef(() => SalesModule),
  ],
  controllers: [TablesController],
  providers: [TablesService, TablesGateway],
  exports: [TablesService, TablesGateway]
})
export class TablesModule { }
