import { Module } from '@nestjs/common';
import { ProductModule } from './products/products.module';
import { ConfigModule } from '@nestjs/config';

//Mongoose
import { MongooseModule } from '@nestjs/mongoose';
import { RecipesController } from './recipes/recipes.controller';
import { RecipesModule } from './recipes/recipes.module';
import { ProductController } from './products/products.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_PATH!), 
    ProductModule, RecipesModule
  ]
})
export class AppModule {}
