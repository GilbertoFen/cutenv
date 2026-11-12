import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemasMongo/user.schema';
import { Restaurant, RestaurantSchema } from '../schemasMongo/restaurant.schema';
import { AccessSchedule, AccessScheduleSchema } from '../schemasMongo/access-schedule.schema';
import { UserSession, UserSessionSchema } from '../schemasMongo/user-session.schema';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { AuditModule } from '../audit/audit.module';
import { WaiterGateway } from '../gateways/waiter.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Restaurant.name, schema: RestaurantSchema },
      { name: AccessSchedule.name, schema: AccessScheduleSchema },
      { name: UserSession.name, schema: UserSessionSchema },
    ]),
    AuditModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService, WaiterGateway],
  exports: [EmployeesService],
})
export class EmployeesModule {}

