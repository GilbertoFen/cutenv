import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Recipe } from "../schemasMongo/recipe.schema";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";

@Injectable()
export class RecipesService {
  // Deje esto como el tuyo por si pasa lo mismo con el nombre de mi Schema 
  constructor(@InjectModel(Recipe.name) private recipeModel: Model<Recipe>) {}

  async getAllRecipes() {
    try{
      return await this.recipeModel.find({}).populate("ingredients.ingredientId");
    } catch (e) {
      throw e;
    }
  }

  async getRecipeById(id: string) {
    try{
      const recipe = await this.recipeModel.findById(id).populate("ingredients.ingredientId");
    if (!recipe) throw new NotFoundException("Recipe not found");
    return recipe;
    } catch (e) {
      throw e;
    }
  }

  async addRecipe(recipe: CreateRecipeDto) {
    try{
      const newRecipe = new this.recipeModel(recipe);
    return await newRecipe.save();
    } catch (e) {
      throw e;
    }
  }

  async updateRecipe(id: string, recipe: UpdateRecipeDto) {
    try{
      const updated = await this.recipeModel.findByIdAndUpdate(id, recipe, { new: true });
    if (!updated) throw new NotFoundException("Recipe not found");
    return updated;
    } catch (e) {
      throw e;
    }
  }

  async deleteRecipeById(id: string) {
    try{const deleted = await this.recipeModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException("Recipe not found");
    return deleted;
    } catch (e) {
      throw e;
    }
  }
}