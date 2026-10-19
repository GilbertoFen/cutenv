import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

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
  async createPromotion(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.createPromotion(dto);
  }

  @Patch(':id')
  async updatePromotion(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.updatePromotion(id, dto);
  }

  @Delete(':id')
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
