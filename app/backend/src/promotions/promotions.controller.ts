import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('promotions')
export class PromotionsController {
  constructor(private promotionsService: PromotionsService) {}

  @Get()
  async getAllPromotions(@Query('activeOnly') activeOnly?: string) {
    return this.promotionsService.getAllPromotions(activeOnly === 'true');
  }

  @Get('valid-today')
  async getValidToday() {
    return this.promotionsService.getValidPromotionsForToday();
  }

  @Get(':id')
  async getPromotionById(@Param('id') id: string) {
    return this.promotionsService.getPromotionById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async createPromotion(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.createPromotion(dto);
  }

  @Patch(':id')
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async updatePromotion(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.updatePromotion(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async deletePromotion(
    @Param('id') id: string,
    @Body() auth: { authUsername: string; authPassword: string }
  ) {
    return this.promotionsService.deletePromotion(id, auth);
  }

  @Post('calculate')
  async calculate(
    @Body()
    body: {
      promotionId: string;
      items: Array<{
        recipeId?: string;
        recipeName: string;
        category?: string;
        price: number;
        quantity: number;
      }>;
      accountTotal: number;
    }
  ) {
    return this.promotionsService.calculateDiscount(
      body.promotionId,
      body.items,
      body.accountTotal
    );
  }
}
