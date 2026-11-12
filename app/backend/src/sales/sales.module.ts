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
import { CashierGateway } from 'src/gateways/cashier.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { PromotionsModule } from 'src/promotions/promotions.module';

import { Restaurant, RestaurantSchema } from '../schemasMongo/restaurant.schema';
import { Recipe, RecipeSchema } from '../schemasMongo/recipe.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Table.name, schema: TableSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: Recipe.name, schema: RecipeSchema },
    ]),
    forwardRef(() => OrdersModule),
    forwardRef(() => TablesModule),
    AuthModule,
    PromotionsModule,
  ],
  controllers: [SalesController],
  providers: [SalesService, CashierGateway],
  exports: [SalesService, MongooseModule],
})
export class SalesModule { }
