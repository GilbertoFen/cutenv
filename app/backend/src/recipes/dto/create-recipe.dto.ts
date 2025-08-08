import { IsArray, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class IngredientDto {
  @IsMongoId()
  ingredientId: string;

  @IsNumber()
  quantity: number;

  @IsString()
  unitMesure: string;
}

export class CreateRecipeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  steps?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  ingredients: IngredientDto[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

/*
  Campo de:
  - ImagenUrl 
  - Tiempo de preparación
*/
