import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemasMongo/user.schema';
import { Restaurant, RestaurantSchema } from '../schemasMongo/restaurant.schema';
import { AccessSchedule, AccessScheduleSchema } from '../schemasMongo/access-schedule.schema';
import { UserSession, UserSessionSchema } from '../schemasMongo/user-session.schema';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtService } from './jwt.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { WaiterGateway } from '../gateways/waiter.gateway';

@Global()
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
  controllers: [AuthController],
  providers: [AuthService, JwtService, JwtAuthGuard, RolesGuard, WaiterGateway],
  exports: [AuthService, JwtService, JwtAuthGuard, RolesGuard, MongooseModule],
})
export class AuthModule {}
