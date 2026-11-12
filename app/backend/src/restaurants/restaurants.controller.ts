import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto, UpdateRestaurantDto, UpdateScheduleDto } from './dto/restaurant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner') // Root admin o creador de plataforma
  async createRestaurant(
    @Body() dto: CreateRestaurantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (user.username !== 'root') {
      throw new ForbiddenException('Solo el Administrador Root de la plataforma puede registrar nuevos restaurantes');
    }
    return this.restaurantsService.createRestaurant(dto, user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getRestaurants(@CurrentUser() user: JwtPayload) {
    if (user.username !== 'root') {
      throw new ForbiddenException('Solo el Administrador Root puede consultar todos los restaurantes');
    }
    return this.restaurantsService.getAllRestaurants();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async getRestaurantById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    // Aislamiento: si no es root, sólo puede consultar su propio restaurante
    if (user.username !== 'root' && user.restaurantId !== id) {
      throw new ForbiddenException('No tiene autorización para consultar información de otro restaurante');
    }
    return this.restaurantsService.getRestaurantById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  async updateRestaurant(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (dto.status && user.username !== 'root') {
      throw new ForbiddenException('Solo el Administrador Root puede activar o suspender un restaurante');
    }
    if (user.username !== 'root' && user.restaurantId !== id) {
      throw new ForbiddenException('No tiene permisos para modificar este restaurante');
    }
    return this.restaurantsService.updateRestaurant(id, dto, { sub: user.sub, name: user.name });
  }

  @Get(':id/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async getSchedule(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (user.username !== 'root' && user.restaurantId !== id) {
      throw new ForbiddenException('No tiene autorización para consultar el horario de este restaurante');
    }
    return this.restaurantsService.getSchedule(id);
  }

  @Put(':id/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (user.username !== 'root' && user.restaurantId !== id) {
      throw new ForbiddenException('No tiene autorización para modificar el horario de este restaurante');
    }
    return this.restaurantsService.updateSchedule(id, dto, { sub: user.sub, name: user.name });
  }
}

