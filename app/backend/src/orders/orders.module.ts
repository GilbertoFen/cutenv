import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../schemasMongo/order.schema';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { RecipesModule } from '../recipes/recipes.module';
import { SalesModule } from 'src/sales/sales.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      ]),
      RecipesModule,
      forwardRef(() => SalesModule)
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
