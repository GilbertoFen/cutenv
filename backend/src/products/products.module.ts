import { Module } from '@nestjs/common';

//Controller
import { ProductController } from './products.controller';

//Services
import { ProductService } from './products.service';

//Mongoose
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from 'schemasMongo/product.schema';

@Module({
  imports: [MongooseModule.forFeature([{
    name: Product.name, 
    schema: ProductSchema
  }])], //modulos => endpoint de entrada
  controllers: [ProductController], //controllers => controller(req, res)
  providers: [ProductService], //servicios => Model(conexion a la base de datos)
})
export class ProductModule {}