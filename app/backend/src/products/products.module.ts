import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductController } from './products.controller';
import { ProductService } from './products.service';
import { OpenFoodFactsService } from './open-food-facts.service';
import { Product, ProductSchema } from '../schemasMongo/product.schema';
import { StockMovement, StockMovementSchema } from '../schemasMongo/stock-movement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductService, OpenFoodFactsService],
  exports: [ProductService, OpenFoodFactsService, MongooseModule],
})
export class ProductModule {}