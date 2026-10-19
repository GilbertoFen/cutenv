import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Sale, SaleSchema } from '../schemasMongo/sale.schema';
import { Order, OrderSchema } from '../schemasMongo/order.schema';
import { Recipe, RecipeSchema } from '../schemasMongo/recipe.schema';
import { Product, ProductSchema } from '../schemasMongo/product.schema';
import { Promotion, PromotionSchema } from '../schemasMongo/promotion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Recipe.name, schema: RecipeSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Promotion.name, schema: PromotionSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
