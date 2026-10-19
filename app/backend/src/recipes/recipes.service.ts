import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Recipe, RecipeDocument } from "../schemasMongo/recipe.schema";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";
import { DeleteRecipeDto } from "./dto/delete-recipe.dto";
import { RecipeResponseDto } from "./dto/recipe-response.dto";
import { Types } from "mongoose";
import { AuthService } from "../auth/auth.service";

@Injectable()
export class RecipesService {
  constructor(
    @InjectModel(Recipe.name) private recipeModel: Model<RecipeDocument>,
    private authService: AuthService,
  ) {}

  async getAllRecipes(): Promise<RecipeResponseDto[]> {
    try {
      const recipes = await this.recipeModel.find({ isActive: { $ne: false } }).populate('ingredients.ingredientId', 'name');
      return recipes.map(recipe => {
        const formattedIngredients = (recipe.ingredients || []).map(ing => ({
          ingredientId: (ing.ingredientId as any)?._id?.toString() || (ing.ingredientId as any)?.toString() || '',
          name: (ing.ingredientId as any)?.name ?? 'Insumo',
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
    try {
      const recipe = await this.recipeModel.findById(id).populate('ingredients.ingredientId', 'name');

      if (!recipe || recipe.isActive === false) throw new NotFoundException('Receta no encontrada');

      const formattedIngredients = (recipe.ingredients || []).map((ing) => ({
        ingredientId: (ing.ingredientId as any)?._id?.toString() || (ing.ingredientId as any)?.toString() || '',
        name: (ing.ingredientId as any)?.name ?? 'Insumo',
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
    } catch(e) {
      throw e;
    }
  }

  async addRecipe(recipe: CreateRecipeDto) {
    try {
      const newRecipe = new this.recipeModel({
        ...recipe,
        isActive: true,
      });
      return await newRecipe.save();
    } catch (e) {
      throw e;
    }
  }

  async updateRecipe(id: string, dto: UpdateRecipeDto) {
    try {
      const recipe = await this.recipeModel.findById(id);
      if (!recipe || recipe.isActive === false) throw new NotFoundException("Receta no encontrada");

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

  async deleteRecipeById(id: string, dto?: DeleteRecipeDto) {
    try {
      const recipe = await this.recipeModel.findById(id);
      if (!recipe) throw new NotFoundException("Receta no encontrada");

      let managerUser = 'administrador';
      let deleteReason = 'Eliminada por gerencia';

      if (dto) {
        const auth = await this.authService.verifyManager({
          username: dto.username,
          password: dto.password,
        });
        if (!auth.valid) {
          throw new UnauthorizedException('Credenciales de gerente no válidas');
        }
        managerUser = auth.manager.username;
        deleteReason = dto.reason;
      } else {
        throw new ForbiddenException('Se requieren credenciales de gerente o administrador para eliminar una receta');
      }

      // Baja lógica (soft delete) para proteger integridad histórica de órdenes y ventas
      recipe.isActive = false;
      recipe.deletedBy = managerUser;
      recipe.deletedAt = new Date();
      recipe.deleteReason = deleteReason;

      await recipe.save();
      return { success: true, message: `Receta "${recipe.name}" eliminada correctamente por ${managerUser}` };
    } catch (e) {
      throw e;
    }
  }

  async searchRecipes(query: any): Promise<Recipe[]> {
    try {
      const mongoQuery: any = { isActive: { $ne: false } };

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