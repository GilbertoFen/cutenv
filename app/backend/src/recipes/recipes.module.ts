import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Recipe, RecipeSchema } from "../schemasMongo/recipe.schema";
import { Order, OrderSchema } from "../schemasMongo/order.schema";
import { RecipesController } from "./recipes.controller";
import { RecipesService } from "./recipes.service";
import { AuthModule } from "src/auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Recipe.name,
        schema: RecipeSchema,
      },
      {
        name: Order.name,
        schema: OrderSchema,
      },
    ]),
    AuthModule,
  ],
  controllers: [RecipesController],
  providers: [RecipesService],
  exports: [MongooseModule, RecipesService],
})
export class RecipesModule {}