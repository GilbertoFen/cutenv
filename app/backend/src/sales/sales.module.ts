import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sale, SaleSchema } from '../schemasMongo/sale.schema';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { TablesModule } from 'src/tables/tables.module';
import { OrdersModule } from 'src/orders/orders.module';
import { forwardRef } from '@nestjs/common';
import { Order, OrderSchema } from '../schemasMongo/order.schema';
import { Table, TableSchema } from '../schemasMongo/table.schema';
import { TablesService } from 'src/tables/tables.service';
import { CashierGateway } from 'src/gateways/cashier.gateway';
import { AuthModule } from 'src/auth/auth.module';
@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Sale.name, schema: SaleSchema },
      { name: Order.name, schema: OrderSchema },  
      { name: Table.name, schema: TableSchema },]),
      forwardRef(() => OrdersModule),
      forwardRef(() => TablesModule),
      AuthModule,
  ], 
  controllers: [SalesController],
  providers: [SalesService, CashierGateway],
  exports: [SalesService, MongooseModule],
})
export class SalesModule {}
