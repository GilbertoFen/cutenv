import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../schemasMongo/order.schema';
import { Product, ProductSchema } from '../schemasMongo/product.schema';
import { StockMovement, StockMovementSchema } from '../schemasMongo/stock-movement.schema';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { RecipesModule } from '../recipes/recipes.module';
import { SalesModule } from 'src/sales/sales.module';
import { TablesModule } from 'src/tables/tables.module';
import { KitchenGateway } from 'src/gateways/kitchen.gateway';
import { WaiterGateway } from 'src/gateways/waiter.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
    RecipesModule,
    forwardRef(() => SalesModule),
    forwardRef(() => TablesModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, KitchenGateway, WaiterGateway],
  exports: [OrdersService],
})
export class OrdersModule {}
