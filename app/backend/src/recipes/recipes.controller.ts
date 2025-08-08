import { Controller, Delete, Get, Patch, Post, Body, Param, Query,NotFoundException } from "@nestjs/common";
import { RecipesService } from "./recipes.service";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";

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
  async addRecipe(@Body() recipe: CreateRecipeDto) {
    return await this.recipesService.addRecipe(recipe);
  }

  @Patch(':id')
  updateRecipe(@Param('id') id: string, @Body() dto: UpdateRecipeDto) {
    return this.recipesService.updateRecipe(id, dto);
  }


  @Delete(":id")
  async deleteRecipeById(@Param("id") id: string) {
    return await this.recipesService.deleteRecipeById(id);
  }
  
}