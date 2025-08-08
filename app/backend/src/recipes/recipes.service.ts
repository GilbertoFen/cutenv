import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Recipe } from "../schemasMongo/recipe.schema";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";
import { RecipeResponseDto } from "./dto/recipe-response.dto";
import { Types } from "mongoose";
@Injectable()
export class RecipesService {
  constructor(@InjectModel(Recipe.name) private recipeModel: Model<Recipe>) {}

  async getAllRecipes(): Promise<RecipeResponseDto[]> {
    try{
      const recipes = await this.recipeModel.find({}).populate('ingredients.ingredientId', 'name');
      return recipes.map(recipe => {
        const formattedIngredients = recipe.ingredients.map(ing => ({
          name: ing.ingredientId['name'],
          quantity: ing.quantity,
          unitMesure: ing.unitMesure,
        }));
      return {
        id: recipe['_id'] as any,
          name: recipe.name,
          steps: recipe.steps,
          price: recipe.price,
          ingredients: formattedIngredients,
          imageUrl: recipe.imageUrl, 
          category: recipe.category,
        };
      });
    } catch (e) {
      throw e;
    }
  }

  async getRecipeById(id: string): Promise<RecipeResponseDto> {
    try{
      const recipe = await this.recipeModel.findById(id).populate('ingredients.ingredientId', 'name');

      if (!recipe) throw new NotFoundException('Receta no encontrada');

      const formattedIngredients = recipe.ingredients.map((ing) => ({
        name: ing.ingredientId['name'],
        quantity: ing.quantity,
        unitMesure: ing.unitMesure,
      }));

      return {
        id: recipe['_id'] as any,
        name: recipe.name,
        steps: recipe.steps,
        price: recipe.price,
        ingredients: formattedIngredients,
        imageUrl: recipe.imageUrl,
        category:recipe.category,
      };
    } catch(e) {
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


  async updateRecipe(id: string, dto: UpdateRecipeDto) {
    try {
      const recipe = await this.recipeModel.findById(id);
      if (!recipe) throw new NotFoundException("Receta no encontrada");

      if (dto.name !== undefined) recipe.name = dto.name;
      if (dto.steps !== undefined) recipe.steps = dto.steps;
      if (dto.price !== undefined) recipe.price = dto.price;

      if (dto.ingredients) {
        const formattedIngredients = dto.ingredients
          .filter(ing => ing.ingredientId && ing.quantity !== undefined && ing.unit)
          .map(ing => ({
            ingredientId: new Types.ObjectId(ing.ingredientId),
            quantity: ing.quantity!,
            unitMesure: ing.unit!,
          }));

        recipe.ingredients = formattedIngredients as {
      ingredientId: Types.ObjectId;
      quantity: number;
      unitMesure: string;
    }[];
      }

      return await recipe.save();
    } catch (e) {
      throw e;
    }
  }



  async deleteRecipeById(id: string) {
    try{const deleted = await this.recipeModel.findByIdAndDelete(id);
      if (!deleted) throw new NotFoundException("Receta no encontrada");
      return deleted;
    } catch (e) {
      throw e;
    }
  }

  async searchRecipes(query: any): Promise<Recipe[]> {
    try{
      const mongoQuery: any = {};

      if (query.name) {
        mongoQuery.name = { $regex: query.name, $options: 'i' }; 
      }

      if (query.price) {
        mongoQuery.price = Number(query.price);
       }

       if (query.category) {
        mongoQuery.category = query.category;
      }

      return this.recipeModel.find(mongoQuery); 
    } catch (e) {
      throw e;
    }
  }

}