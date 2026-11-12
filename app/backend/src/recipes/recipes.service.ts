import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException, OnModuleInit } from "@nestjs/common";
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
export class RecipesService implements OnModuleInit {
  constructor(
    @InjectModel(Recipe.name) private recipeModel: Model<RecipeDocument>,
    private authService: AuthService,
  ) { }

  async onModuleInit() {
    try {
      // 1. Las bebidas o insumos de barra NUNCA deben tener estación de cocina fría ni caliente
      await this.recipeModel.updateMany(
        {
          $or: [
            { category: { $regex: /bebida|refresco|licor|vino|cerveza|trago/i } },
            { name: { $regex: /coca|pepsi|refresco|cerveza|agua mineral|vino|sprite|fanta|jugo|te|té/i } },
          ],
        },
        { $set: { station: 'ninguna' } }
      );

      // 2. Si las recetas preexistentes incluyen sushi, sashimi o ceviche, asignarlas a cocina fría
      await this.recipeModel.updateMany(
        {
          name: { $regex: /sushi|sashimi|ceviche|roll|nigiri|ensalada|poke/i },
          station: { $ne: 'ninguna' },
        },
        { $set: { station: 'fria' } }
      );

      // 3. Asignar 'caliente' únicamente a platillos de comida sin estación previa (excluyendo bebidas)
      await this.recipeModel.updateMany(
        {
          $or: [{ station: { $exists: false } }, { station: null }, { station: '' }],
          category: { $not: { $regex: /bebida|refresco|licor|vino|cerveza|trago/i } },
        },
        { $set: { station: 'caliente' } }
      );

      // 4. Sembrar recetas japonesas de referencia si no existen
      const japaneseSamples = [
        { name: 'Sushi Roll Filadelfia', price: 135, category: 'Sushi', station: 'fria', steps: 'Preparar en barra fría con salmón fresco, pepino y queso crema' },
        { name: 'Sashimi de Salmón', price: 160, category: 'Sashimi', station: 'fria', steps: 'Cortes finos de salmón fresco servido en frío sobre cama de pepino' },
        { name: 'Ceviche Mixto', price: 145, category: 'Entradas', station: 'fria', steps: 'Mariscos marinados en cítricos servido frío' },
        { name: 'Ramen Tonkotsu', price: 155, category: 'Ramen', station: 'caliente', steps: 'Fideos con caldo caliente concentrado de cerdo y chashu' },
        { name: 'Yakimeshi Mixto', price: 125, category: 'Arroces', station: 'caliente', steps: 'Arroz frito al wok caliente con verduras y carne' },
        { name: 'Tempura de Camarón', price: 140, category: 'Entradas', station: 'caliente', steps: 'Camarones capeados y fritos crujientes al momento' },
      ];

      for (const sample of japaneseSamples) {
        const found = await this.recipeModel.findOne({ name: sample.name });
        if (!found) {
          await this.recipeModel.create({
            ...sample,
            ingredients: [],
            isActive: true,
          });
        }
      }
    } catch (err: any) {
      console.warn('[RecipesService.onModuleInit] Inicialización de recetas:', err?.message);
    }
  }

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
          station: recipe.station || (recipe.category?.toLowerCase() === 'bebidas' ? 'ninguna' : 'ninguna'),
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
        station: recipe.station || (recipe.category?.toLowerCase() === 'bebidas' ? 'ninguna' : 'ninguna'),
      };
    } catch (e) {
      throw e;
    }
  }

  async addRecipe(recipe: CreateRecipeDto) {
    try {
      const isBeverage = recipe.category?.toLowerCase() === 'bebidas';
      const resolvedStation = recipe.station || (isBeverage ? 'ninguna' : 'caliente');
      const newRecipe = new this.recipeModel({
        ...recipe,
        station: resolvedStation,
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
      if (dto.category !== undefined) {
        recipe.category = dto.category;
        if (dto.category.toLowerCase() === 'bebidas' && dto.station === undefined) {
          recipe.station = 'ninguna';
        }
      }
      if (dto.imageUrl !== undefined) recipe.imageUrl = dto.imageUrl;
      if (dto.station !== undefined) recipe.station = dto.station;

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