import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Restaurant, RestaurantSchema } from '../schemasMongo/restaurant.schema';
import { AccessSchedule, AccessScheduleSchema } from '../schemasMongo/access-schedule.schema';
import { User, UserSchema } from '../schemasMongo/user.schema';
import { UserSession, UserSessionSchema } from '../schemasMongo/user-session.schema';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { AuditModule } from '../audit/audit.module';
import { WaiterGateway } from '../gateways/waiter.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: AccessSchedule.name, schema: AccessScheduleSchema },
      { name: User.name, schema: UserSchema },
      { name: UserSession.name, schema: UserSessionSchema },
    ]),
    AuditModule,
  ],
  controllers: [RestaurantsController],
  providers: [RestaurantsService, WaiterGateway],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}

