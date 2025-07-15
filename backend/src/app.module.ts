import { Module } from '@nestjs/common';
import { ProductModule } from './products/products.module';

//Mongoose
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot("mongodb://127.0.0.1:27017/inventory"), 
    ProductModule
  ], //modulos => endpoint de entrada
  controllers: [], //controllers => controller(req, res)
  providers: [], //servicios => Model(conexion a la base de datos)
})
export class AppModule {}
