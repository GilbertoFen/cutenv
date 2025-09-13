import { Module } from '@nestjs/common';
import { ProductModule } from './products/products.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule'
//Mongoose
import { MongooseModule } from '@nestjs/mongoose';
import { RecipesController } from './recipes/recipes.controller';
import { RecipesModule } from './recipes/recipes.module';
import { ProductController } from './products/products.controller';
import { TablesModule } from './tables/tables.module';
import { OrdersController } from './orders/orders.controller';
import { OrdersModule } from './orders/orders.module';
import { SalesService } from './sales/sales.service';
import { SalesModule } from './sales/sales.module';
import { SalesController } from './sales/sales.controller';
import { OrdersService } from './orders/orders.service';
import { ReservationsModule } from './reservations/reservations.module';
import { CashierGateway } from './gateways/cashier.gateway';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_PATH!), 
    ScheduleModule.forRoot(),
    ProductModule,
    RecipesModule,
    TablesModule,
    OrdersModule,
    SalesModule,
    ReservationsModule,
  ],
  controllers: [
    
  ],
  providers: [
    
  ],
})
export class AppModule {}
