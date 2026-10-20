import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { RecipesService } from "./recipes.service";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";
import { DeleteRecipeDto } from "./dto/delete-recipe.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("/recipes")
export class RecipesController {
  constructor(private recipesService: RecipesService) {}

  @Get("/")
  async getAllRecipes() {
    return await this.recipesService.getAllRecipes();
  }

  @Get('search')
  searchRecipes(@Query() query: any) {
    return this.recipesService.searchRecipes(query);
  }

  @Get(":id")
  async getRecipeById(@Param("id") id: string) {
    return await this.recipesService.getRecipeById(id);
  }

  @Post("/")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async addRecipe(@Body() recipe: CreateRecipeDto) {
    return await this.recipesService.addRecipe(recipe);
  }

  @Patch(':id')
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  updateRecipe(@Param('id') id: string, @Body() dto: UpdateRecipeDto) {
    return this.recipesService.updateRecipe(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async deleteRecipeById(@Param("id") id: string, @Body() dto: DeleteRecipeDto) {
    return await this.recipesService.deleteRecipeById(id, dto);
  }
}