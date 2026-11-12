import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('owner', 'manager')
  async getLogs(
    @CurrentUser() user: JwtPayload,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    // Si no es root, restringir al restaurante del usuario
    const restaurantId = user.username === 'root' ? undefined : user.restaurantId;

    return this.auditService.getLogs({
      restaurantId,
      action,
      targetType,
      limit: limit ? parseInt(limit, 10) : 50,
      skip: skip ? parseInt(skip, 10) : 0,
    });
  }
}

