import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Roles('owner', 'manager')
  getEmployees(
    @CurrentUser() user: JwtPayload,
    @Query('role') role?: string,
    @Query('operationalRole') operationalRole?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('connectionStatus') connectionStatus?: string,
  ) {
    return this.employeesService.getEmployees(user, {
      role,
      operationalRole,
      status,
      search,
      connectionStatus,
    });
  }

  @Get('stats')
  @Roles('owner', 'manager')
  getEmployeeStats(@CurrentUser() user: JwtPayload) {
    return this.employeesService.getEmployeeStats(user);
  }

  @Post()
  @Roles('owner', 'manager')
  createEmployee(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employeesService.createEmployee(dto, user);
  }

  @Patch(':id')
  @Roles('owner', 'manager')
  updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employeesService.updateEmployee(id, dto, user);
  }

  @Get('password-reset-requests')
  @Roles('owner', 'manager')
  getPasswordResetRequests(@CurrentUser() user: JwtPayload) {
    return this.employeesService.getPasswordResetRequests(user);
  }

  @Post('password-reset-requests/:id/authorize')
  @Roles('owner', 'manager')
  authorizePasswordReset(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employeesService.authorizePasswordReset(id, user);
  }

  @Post('password-reset-requests/:id/reject')
  @Roles('owner', 'manager')
  rejectPasswordReset(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employeesService.rejectPasswordReset(id, user);
  }

  @Post(':id/reset-password')
  @Roles('owner', 'manager')
  requestPasswordReset(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employeesService.requestPasswordReset(id, user);
  }

  @Post(':id/reinvite')
  @Roles('owner', 'manager')
  reinviteEmployee(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employeesService.reinviteEmployee(id, user);
  }
}

